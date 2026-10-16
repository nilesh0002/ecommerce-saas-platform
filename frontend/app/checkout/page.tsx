/* eslint-disable */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, money } from '../../lib/api';
import { useStore } from '../../lib/store';
import { Shell } from '../../components/Storefront';
import Link from 'next/link';

export default function Checkout() {
  const { cart, setCart } = useStore();
  const router = useRouter();
  const [addressId, setAddress] = useState('');
  const [method, setMethod] = useState<'COD' | 'RAZORPAY'>('COD');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: addresses = [], isLoading: addressesLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api<any[]>('/commerce/addresses'),
  });

  const { data: serverCart } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api<any>('/commerce/cart'),
    retry: false,
  });

  useEffect(() => {
    if (!cart.length && serverCart?.items) setCart(serverCart.items);
  }, [cart.length, serverCart, setCart]);

  // Pre-select default address if available
  useEffect(() => {
    if (addresses.length > 0 && !addressId) {
      const defaultAddr = addresses.find((a: any) => a.isDefault) || addresses[0];
      setAddress(defaultAddr.id);
    }
  }, [addresses, addressId]);

  const totalPaise = cart.reduce((a, x) => a + (x.variant?.pricePaise || 0) * x.quantity, 0);

  async function submit() {
    try {
      setError('');
      setLoading(true);
      if (!cart.length) throw new Error('Your cart is empty');
      if (!addressId) throw new Error('Please select a delivery address');

      // Reconcile the local cart to the persisted cart
      const persisted = await api<any>('/commerce/cart');
      const persistedItems = persisted.items || [];
      for (const item of cart) {
        const existing = persistedItems.find((entry: any) => entry.variantId === item.variantId);
        if (existing) {
          await api(`/commerce/cart/items/${item.variantId}`, {
            method: 'PATCH',
            body: JSON.stringify({ quantity: item.quantity }),
          });
        } else {
          await api('/commerce/cart/items', {
            method: 'POST',
            body: JSON.stringify({ variantId: item.variantId, quantity: item.quantity }),
          });
        }
      }
      for (const item of persistedItems) {
        if (!cart.some((local) => local.variantId === item.variantId)) {
          await api(`/commerce/cart/items/${item.variantId}`, { method: 'DELETE' });
        }
      }

      const result = await api<any>('/orders', {
        method: 'POST',
        body: JSON.stringify({ addressId, paymentMethod: method }),
      });

      const order = result?.order || result;
      const razorpayOrder = result?.razorpay;

      if (method === 'RAZORPAY' && process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID && razorpayOrder) {
        const Razorpay = (window as any).Razorpay;
        if (!Razorpay) throw new Error('Razorpay Checkout SDK is not loaded');
        new Razorpay({
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: razorpayOrder.amountPaise,
          currency: razorpayOrder.currency,
          name: 'Nile & Co.',
          order_id: razorpayOrder.orderId,
          handler: async (response: any) => {
            await api(`/orders/${order.id}/payment/verify`, {
              method: 'POST',
              body: JSON.stringify(response),
            });
            router.push(`/orders/${order.id}`);
          },
        }).open();
      } else {
        router.push(`/orders/${order.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to complete order');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <div className="container max-w-5xl py-12 md:py-16">
        
        {/* Header */}
        <div className="border-b border-slate-200 pb-5 mb-8">
          <span className="text-xs font-bold uppercase tracking-widest text-[#c25e38]">Checkout</span>
          <h1 className="serif text-4xl font-bold text-slate-900 mt-1">Complete Your Purchase</h1>
        </div>

        <div className="grid gap-10 lg:grid-cols-12 items-start">
          
          {/* Main Checkout Form */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Step 1: Delivery Address */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs text-white font-bold">1</span>
                  <span>Delivery Address</span>
                </h2>
                <Link
                  href="/addresses"
                  className="text-xs font-bold text-[#c25e38] hover:underline"
                >
                  + Add New Address
                </Link>
              </div>

              {addressesLoading ? (
                <div className="h-20 animate-pulse rounded-xl bg-slate-100"></div>
              ) : !addresses.length ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900">
                  <p className="font-semibold">No saved delivery addresses found.</p>
                  <p className="mt-1 text-slate-600">Please sign in and save an address to receive your items.</p>
                  <Link
                    href="/addresses"
                    className="mt-3 inline-block rounded-full px-4 py-2 text-xs font-bold shadow-xs"
                    style={{ color: '#ffffff', backgroundColor: '#0f172a' }}
                  >
                    Add Address Now
                  </Link>
                </div>
              ) : (
                <div className="grid gap-3">
                  {addresses.map((a: any) => {
                    const isSelected = addressId === a.id;
                    return (
                      <label
                        key={a.id}
                        className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[#0f172a] bg-slate-50/80 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="delivery_address"
                          checked={isSelected}
                          onChange={() => setAddress(a.id)}
                          className="mt-1 h-4 w-4 text-slate-900 focus:ring-slate-900"
                        />
                        <div className="text-xs leading-relaxed flex-1">
                          <div className="flex items-center gap-2 font-bold text-slate-900">
                            <span>{a.fullName}</span>
                            {a.label && (
                              <span className="rounded-md bg-slate-200/80 px-2 py-0.5 text-[10px] uppercase font-semibold">
                                {a.label}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-600 mt-1">{a.line1}{a.line2 ? `, ${a.line2}` : ''}</p>
                          <p className="text-slate-600">{a.city}, {a.state} - {a.postalCode}</p>
                          <p className="text-slate-500 mt-0.5">Phone: {a.phone}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Step 2: Payment Method */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs text-white font-bold">2</span>
                <span>Select Payment Method</span>
              </h2>

              <div className="grid gap-3">
                <label
                  className={`flex items-center gap-3.5 rounded-2xl border p-4 cursor-pointer transition-all ${
                    method === 'COD'
                      ? 'border-[#0f172a] bg-slate-50/80 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    checked={method === 'COD'}
                    onChange={() => setMethod('COD')}
                    className="h-4 w-4 text-slate-900 focus:ring-slate-900"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-xs text-slate-900 block">Cash on Delivery (COD)</span>
                    <span className="text-[11px] text-slate-500">Pay cash or UPI upon delivery at your doorstep</span>
                  </div>
                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                    Popular
                  </span>
                </label>

                <label
                  className={`flex items-center gap-3.5 rounded-2xl border p-4 cursor-pointer transition-all ${
                    method === 'RAZORPAY'
                      ? 'border-[#0f172a] bg-slate-50/80 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    checked={method === 'RAZORPAY'}
                    onChange={() => setMethod('RAZORPAY')}
                    className="h-4 w-4 text-slate-900 focus:ring-slate-900"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-xs text-slate-900 block">Online Payment (Razorpay)</span>
                    <span className="text-[11px] text-slate-500">Pay via Google Pay, PhonePe, UPI, Cards, or NetBanking</span>
                  </div>
                  <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                    Instant & Secure
                  </span>
                </label>
              </div>

              {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 font-medium">
                  {error}
                </div>
              )}
            </section>

          </div>

          {/* Right Summary Aside */}
          <aside className="lg:col-span-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <h3 className="serif text-xl font-bold text-slate-900">Order Summary</h3>

            <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto pr-1">
              {cart.map((x) => (
                <div key={x.variantId} className="flex justify-between py-2 text-xs">
                  <span className="text-slate-700 truncate max-w-[180px]">
                    {x.variant?.product?.name || x.variant?.name || 'Item'} × {x.quantity}
                  </span>
                  <span className="font-bold text-slate-900">
                    {money((x.variant?.pricePaise || 0) * x.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 border-t border-slate-200 pt-3">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900">{money(totalPaise)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="font-semibold text-emerald-700">FREE</span>
              </div>
              <div className="flex justify-between">
                <span>GST (Taxes)</span>
                <span className="font-semibold text-slate-900">Included</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-3">
              <span>Total Amount</span>
              <span>{money(totalPaise)}</span>
            </div>

            <button
              disabled={!addressId || !cart.length || loading}
              onClick={submit}
              className="w-full rounded-full py-4 text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ color: '#ffffff', backgroundColor: '#0f172a' }}
            >
              {loading ? 'Processing Order…' : 'Place Order Now →'}
            </button>

            <p className="text-center text-[11px] text-slate-400">
              By clicking place order, you agree to Nile & Co. terms of service.
            </p>
          </aside>

        </div>
      </div>
    </Shell>
  );
}
