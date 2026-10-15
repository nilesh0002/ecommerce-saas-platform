/* eslint-disable */
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useStore } from '../../lib/store';
import { Shell } from '../../components/Storefront';

export default function Checkout() {
  const { cart, setCart } = useStore();
  const router = useRouter();
  const { data: addresses = [] } = useQuery({ queryKey: ['addresses'], queryFn: () => api<any[]>('/commerce/addresses') });
  const { data: serverCart } = useQuery({ queryKey: ['cart'], queryFn: () => api<any>('/commerce/cart'), retry: false });
  useEffect(() => { if (!cart.length && serverCart?.items) setCart(serverCart.items); }, [cart.length, serverCart, setCart]);
  const [addressId, setAddress] = useState('');
  const [method, setMethod] = useState('COD');
  const [error, setError] = useState('');
  async function submit() {
    try {
      if (!cart.length) throw new Error('Your cart is empty');
      // Reconcile the local cart to the persisted cart by absolute quantities.
      // This avoids merge double-counting items already synced by the add button.
      const persisted = await api<any>('/commerce/cart');
      const persistedItems = persisted.items || [];
      for (const item of cart) {
        const existing = persistedItems.find((entry: any) => entry.variantId === item.variantId);
        if (existing) await api(`/commerce/cart/items/${item.variantId}`, { method: 'PATCH', body: JSON.stringify({ quantity: item.quantity }) });
        else await api('/commerce/cart/items', { method: 'POST', body: JSON.stringify({ variantId: item.variantId, quantity: item.quantity }) });
      }
      for (const item of persistedItems) if (!cart.some(local => local.variantId === item.variantId)) await api(`/commerce/cart/items/${item.variantId}`, { method: 'DELETE' });
      const result = await api<any>('/orders', { method: 'POST', body: JSON.stringify({ addressId, paymentMethod: method }) });
      const order = result.order;
      const razorpayOrder = result.razorpay;
      if (method === 'RAZORPAY' && process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID && razorpayOrder) {
        const Razorpay = (window as any).Razorpay;
        if (!Razorpay) throw new Error('Razorpay Checkout is unavailable');
        new Razorpay({ key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, amount: razorpayOrder.amountPaise, currency: razorpayOrder.currency, name: 'Nile & Co.', order_id: razorpayOrder.orderId, handler: async (response: any) => { await api(`/orders/${order.id}/payment/verify`, { method: 'POST', body: JSON.stringify(response) }); router.push(`/orders/${order.id}`); } }).open();
      } else router.push(`/orders/${order.id}`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to place order'); }
  }
  return <Shell><div className="container max-w-4xl py-14"><h1 className="serif text-5xl">Checkout</h1><div className="mt-10 grid gap-10 md:grid-cols-[1fr_320px]"><section><h2 className="text-lg font-bold">Delivery address</h2>{!addresses.length ? <p className="mt-4 rounded-xl bg-white p-5 text-sm">Sign in and add an address before checking out.</p> : <div className="mt-4 grid gap-3">{addresses.map((a: any) => <label key={a.id} className="rounded-xl bg-white p-5"><input type="radio" name="address" onChange={() => setAddress(a.id)} className="mr-3" />{a.line1}, {a.city} {a.postalCode}</label>)}</div>}<h2 className="mt-8 text-lg font-bold">Payment</h2><div className="mt-4 grid gap-3"><label className="rounded-xl bg-white p-5"><input type="radio" checked={method === 'COD'} onChange={() => setMethod('COD')} className="mr-3" />Cash on delivery</label><label className="rounded-xl bg-white p-5"><input type="radio" checked={method === 'RAZORPAY'} onChange={() => setMethod('RAZORPAY')} className="mr-3" />Pay securely with Razorpay</label></div>{error && <p className="mt-4 text-sm text-red-600">{error}</p>}</section><aside className="h-fit rounded-2xl bg-white p-6"><p className="flex justify-between"><span>Items</span><span>{cart.reduce((a, x) => a + x.quantity, 0)}</span></p><button disabled={!addressId || !cart.length} onClick={submit} className="mt-6 w-full rounded-full bg-[#17211b] py-4 text-sm font-bold text-white disabled:opacity-40">Place order</button></aside></div></div></Shell>;
}
