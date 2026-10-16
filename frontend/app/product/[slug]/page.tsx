/* eslint-disable */
'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, money } from '../../../lib/api';
import { Shell, ErrorState } from '../../../components/Storefront';
import { useStore } from '../../../lib/store';
import { useState } from 'react';
import Link from 'next/link';

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const [added, setAdded] = useState(false);

  const { data: p, isLoading, error } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api<any>(`/catalog/public/products/${slug}`),
  });

  const { data: wishlist } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api<any>('/commerce/wishlist'),
    retry: false,
  });

  const v = p?.variants?.[0];
  const savedLocal = useStore((s) => (v ? s.wishlist.includes(v.id) : false));

  if (isLoading) {
    return (
      <Shell>
        <div className="container py-24 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-3 border-slate-900 border-t-transparent mb-4"></div>
          <p className="text-sm font-semibold text-slate-600">Loading product details…</p>
        </div>
      </Shell>
    );
  }

  if (error || !p) {
    return (
      <Shell>
        <ErrorState message="This product could not be found or has been discontinued." />
      </Shell>
    );
  }

  const saved = savedLocal || Boolean(v && (wishlist?.items || wishlist || []).some((item: any) => item.variantId === v.id));

  async function toggleSave() {
    if (!v) return;
    try {
      if (saved) await api(`/commerce/wishlist/items/${v.id}`, { method: 'DELETE' });
      else await api('/commerce/wishlist/items', { method: 'POST', body: JSON.stringify({ variantId: v.id }) });
    } catch {
      // Guest fallback remains local
    }
    useStore.getState().toggleWish(v.id);
  }

  const handleAddToCart = () => {
    if (!v) return;
    useStore.getState().add({ variantId: v.id, quantity: 1, variant: v });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const imgUrl = p.images?.[0]?.url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80';

  return (
    <Shell>
      <div className="container py-12 md:py-20">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/catalog" className="hover:text-slate-900 transition-colors">Catalog</Link>
          <span>/</span>
          <span className="text-slate-900 truncate max-w-xs">{p.name}</span>
        </nav>

        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16 items-start">
          
          {/* Product Image Gallery */}
          <div className="lg:col-span-7">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white aspect-square shadow-sm">
              <img
                src={imgUrl}
                alt={p.name}
                className="h-full w-full object-cover object-center"
              />
            </div>
          </div>

          {/* Product Details & Purchase Actions */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#c25e38]">
                {p.category?.name || 'Exclusive Edit'}
              </span>
              <h1 className="serif mt-2 text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900">
                {p.name}
              </h1>
              
              {/* Reviews & Stock Badge */}
              <div className="mt-3 flex items-center gap-3 text-xs font-semibold">
                <span className="text-amber-500 flex items-center">★★★★★</span>
                <span className="text-slate-500">4.9 (128 reviews)</span>
                <span className="text-slate-300">•</span>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                  In Stock & Ready to Ship
                </span>
              </div>
            </div>

            {/* Price */}
            {v && (
              <div className="pt-2 border-t border-slate-200">
                <span className="text-xs text-slate-500 block">Price (incl. of all taxes)</span>
                <span className="text-3xl font-bold text-slate-900">{money(v.pricePaise)}</span>
              </div>
            )}

            {/* Description */}
            <p className="text-sm leading-relaxed text-slate-600 border-t border-slate-200 pt-4">
              {p.description || 'Thoughtfully engineered with minimal geometry and honest, enduring materials. Built to seamlessly integrate into your daily environment.'}
            </p>

            {/* Actions */}
            {v && (
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleAddToCart}
                  className="w-full rounded-full py-4 text-sm font-bold shadow-md hover:shadow-lg transition-all inline-flex items-center justify-center gap-2"
                  style={{ color: '#ffffff', backgroundColor: added ? '#059669' : '#0f172a' }}
                >
                  {added ? (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      <span>Added to Shopping Bag!</span>
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                      <span>Add to Bag</span>
                    </>
                  )}
                </button>

                <button
                  onClick={toggleSave}
                  className="w-full rounded-full border border-slate-300 bg-white py-3.5 text-xs font-bold text-slate-800 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-xs inline-flex items-center justify-center gap-2"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill={saved ? '#c25e38' : 'none'} stroke={saved ? '#c25e38' : 'currentColor'} strokeWidth="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                  <span>{saved ? 'Saved in Wishlist' : 'Add to Wishlist'}</span>
                </button>
              </div>
            )}

            {/* Shipping & Assurance Highlights */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5 text-xs text-slate-600">
              <div className="flex items-center gap-2 font-medium">
                <svg className="text-[#c25e38]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Free Express Delivery across India on orders over ₹2,000</span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <svg className="text-[#c25e38]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Hassle-free 30-day exchange and return policy</span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <svg className="text-[#c25e38]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>100% Secure Checkout via UPI, NetBanking, Cards & COD</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Shell>
  );
}
