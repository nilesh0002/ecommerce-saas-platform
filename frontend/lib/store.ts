'use client';
import { create } from 'zustand';
import { api } from './api';
type Item = { variantId: string; quantity: number; variant?: { id?: string; name?: string; pricePaise?: number; product?: { name?: string; slug?: string; images?: { url:string }[] } } };
type State = { cart: Item[]; wishlist: string[]; add: (item: Item) => Promise<void>; remove: (id:string)=>Promise<void>; setCart:(items:Item[])=>void; toggleWish:(id:string)=>void };
export const useStore = create<State>((set) => ({
  cart: [], wishlist: [],
  add: async (item) => {
    set((s) => ({ cart: s.cart.some(x=>x.variantId===item.variantId) ? s.cart.map(x=>x.variantId===item.variantId ? {...x,quantity:x.quantity+item.quantity}:x) : [...s.cart,item] }));
    try { await api('/commerce/cart/items', { method: 'POST', body: JSON.stringify({ variantId: item.variantId, quantity: item.quantity }) }); } catch { /* Guests keep a local cart; checkout merges it after sign-in. */ }
  },
  remove: async (id) => {
    set(s=>({cart:s.cart.filter(x=>x.variantId!==id)}));
    try { await api(`/commerce/cart/items/${id}`, { method: 'DELETE' }); } catch { /* Local guest cart is authoritative until checkout. */ }
  },
  setCart: (cart) => set({cart}),
  toggleWish: (id) => set(s=>({wishlist:s.wishlist.includes(id)?s.wishlist.filter(x=>x!==id):[...s.wishlist,id]})),
}));
