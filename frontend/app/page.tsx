/* eslint-disable */
'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Shell } from '../components/Storefront';
import { api, money } from '../lib/api';
import { useStore } from '../lib/store';
import { useState } from 'react';

type Product = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  categoryName?: string;
  images?: { url: string }[];
  minPricePaise?: number;
  maxPricePaise?: number;
  variants?: { id: string; pricePaise: number; quantity: number; name: string }[];
};

export default function HomePage() {
  const add = useStore((s) => s.add);
  const [addedId, setAddedId] = useState<string | null>(null);

  // Fetch real products from catalog API
  const { data, isLoading } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      try {
        const res = await api<any>('/catalog/public/products?limit=8');
        return res?.products || res?.items || [];
      } catch {
        return [];
      }
    },
  });

  const products: Product[] = (data && data.length > 0) ? data : [
    {
      id: 'demo-1',
      slug: 'acme-wireless-headphones',
      name: 'Acme Wireless Headphones',
      categoryName: 'Audio & Tech',
      description: 'Comfortable wireless headphones for everyday listening.',
      minPricePaise: 499900,
      images: [{ url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80' }],
    },
    {
      id: 'demo-2',
      slug: 'minimalist-ceramic-mug',
      name: 'Artisan Ceramic Coffee Mug',
      categoryName: 'Home & Living',
      description: 'Handcrafted stoneware mug finished with smooth matte glaze.',
      minPricePaise: 129900,
      images: [{ url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80' }],
    },
    {
      id: 'demo-3',
      slug: 'classic-leather-backpack',
      name: 'Heritage Leather Backpack',
      categoryName: 'Travel & Carry',
      description: 'Full-grain vegetable-tanned leather with dedicated 16-inch laptop sleeve.',
      minPricePaise: 849900,
      images: [{ url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80' }],
    },
    {
      id: 'demo-4',
      slug: 'ergonomic-desk-mat',
      name: 'Felt & Vegan Leather Desk Pad',
      categoryName: 'Workspace',
      description: 'Dual-sided water-resistant workspace mat for precision mouse control.',
      minPricePaise: 249900,
      images: [{ url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&q=80' }],
    },
  ];

  const handleQuickAdd = (p: Product) => {
    const v = p.variants?.[0] || {
      id: p.id,
      name: 'Default',
      pricePaise: p.minPricePaise || 499900,
      quantity: 10,
    };
    add({ variantId: v.id, quantity: 1, variant: v as any });
    setAddedId(p.id);
    setTimeout(() => setAddedId(null), 1800);
  };

  return (
    <Shell>
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#f7f5ef] to-[#fbfaf8] py-16 md:py-24 border-b border-slate-200/60">
        <div className="container grid items-center gap-12 lg:grid-cols-12">
          
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-300/80 bg-white/90 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-[#c25e38] shadow-xs">
              <span className="h-2 w-2 rounded-full bg-[#c25e38] animate-pulse"></span>
              The 2026 Everyday Edit
            </div>

            <h1 className="serif text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight text-slate-900">
              Objects with a little more <span className="text-[#c25e38] italic font-normal">soul.</span>
            </h1>

            <p className="max-w-xl text-lg sm:text-xl text-slate-600 leading-relaxed">
              Thoughtfully curated lifestyle goods, tech, and homeware. Handcrafted for your daily rituals and built to last a lifetime.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/catalog"
                className="btn-primary !px-7 !py-3.5 !text-sm !font-bold inline-flex items-center gap-2 rounded-full shadow-md hover:shadow-lg transition-all"
                style={{ color: '#ffffff', backgroundColor: '#0f172a' }}
              >
                <span>Shop the Collection</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>

              <Link
                href="/catalog?sort=newest"
                className="btn-outline !px-6 !py-3.5 !text-sm !font-bold rounded-full hover:bg-slate-50 transition-all"
              >
                New Releases
              </Link>
            </div>

            {/* Quick Trust Highlights */}
            <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-slate-200/70 text-xs font-semibold text-slate-600">
              <div className="flex items-center gap-2">
                <svg className="text-[#c25e38]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Free Shipping over ₹2,000</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="text-[#c25e38]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>30-Day Easy Returns</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="text-[#c25e38]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>★ 4.9/5 Rating</span>
              </div>
            </div>
          </div>

          {/* Right Hero Visual Banner */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto aspect-[4/5] max-w-md overflow-hidden rounded-3xl bg-[#e6ede6] shadow-xl border border-black/5">
              <img
                src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&q=80"
                alt="Featured Product"
                className="h-full w-full object-cover object-center transform hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>

              {/* Floating Hero Card */}
              <div className="absolute bottom-6 left-6 right-6 rounded-2xl bg-white/95 p-4.5 backdrop-blur-md shadow-lg border border-white/40">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#c25e38]">Featured Release</span>
                    <h3 className="serif text-base font-bold text-slate-900">Acme Studio Wireless</h3>
                    <p className="text-xs text-slate-500">₹4,999 • Free Express Delivery</p>
                  </div>
                  <Link
                    href="/catalog"
                    className="rounded-full px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:opacity-95"
                    style={{ color: '#ffffff', backgroundColor: '#0f172a' }}
                  >
                    View
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Featured Products Grid */}
      <section className="container py-16 md:py-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 pb-4 border-b border-slate-200">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#c25e38]">Handpicked Curations</span>
            <h2 className="serif text-3xl sm:text-4xl font-bold text-slate-900 mt-1">Featured Essentials</h2>
            <p className="text-sm text-slate-500 mt-1">Thoughtfully crafted items ready to order today.</p>
          </div>
          <Link
            href="/catalog"
            className="text-sm font-bold text-[#c25e38] hover:text-[#a84b29] inline-flex items-center gap-1 group"
          >
            <span>View All Products</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-80 animate-pulse rounded-2xl bg-slate-200"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((p) => {
              const price = p.minPricePaise || 499900;
              const imgUrl = p.images?.[0]?.url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80';
              const isJustAdded = addedId === p.id;

              return (
                <div
                  key={p.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:shadow-md transition-all duration-200"
                >
                  <div>
                    {/* Image Container */}
                    <Link href={`/product/${p.slug}`} className="block relative aspect-square overflow-hidden rounded-xl bg-slate-100 mb-4">
                      <img
                        src={imgUrl}
                        alt={p.name}
                        className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                      />
                      {p.categoryName && (
                        <span className="absolute top-2.5 left-2.5 rounded-full bg-white/90 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-bold text-slate-800 shadow-xs">
                          {p.categoryName}
                        </span>
                      )}
                    </Link>

                    {/* Product Info */}
                    <Link href={`/product/${p.slug}`}>
                      <h3 className="font-semibold text-sm text-slate-900 group-hover:text-[#c25e38] transition-colors line-clamp-1">
                        {p.name}
                      </h3>
                    </Link>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {p.description || 'Designed for clean aesthetics and everyday comfort.'}
                    </p>
                  </div>

                  {/* Price & Action */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs text-slate-400 block font-normal">Price</span>
                      <span className="text-sm font-bold text-slate-900">{money(price)}</span>
                    </div>

                    <button
                      onClick={() => handleQuickAdd(p)}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1 ${
                        isJustAdded
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                      style={{ color: '#ffffff', backgroundColor: isJustAdded ? '#059669' : '#0f172a' }}
                    >
                      {isJustAdded ? (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                          <span>Added!</span>
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                          <span>Add to Bag</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Category Showcase */}
      <section className="bg-slate-50/80 py-16 border-y border-slate-200">
        <div className="container">
          <div className="text-center max-w-md mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-[#c25e38]">Explore Categories</span>
            <h2 className="serif text-3xl font-bold text-slate-900 mt-1">Shop by Collection</h2>
            <p className="text-sm text-slate-500 mt-2">Curated for modern spaces, mindful work, and calm routines.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {[
              { name: 'Audio & Tech', count: '12 items', img: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&q=80', slug: 'electronics' },
              { name: 'Home & Living', count: '24 items', img: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&q=80', slug: 'electronics' },
              { name: 'Travel & Carry', count: '8 items', img: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80', slug: 'electronics' },
              { name: 'Workspace', count: '16 items', img: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&q=80', slug: 'electronics' },
            ].map((cat, idx) => (
              <Link
                key={idx}
                href={`/catalog?q=${encodeURIComponent(cat.name)}`}
                className="group relative overflow-hidden rounded-2xl aspect-[3/4] shadow-xs hover:shadow-md transition-all"
              >
                <img
                  src={cat.img}
                  alt={cat.name}
                  className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">{cat.count}</span>
                  <h3 className="serif text-lg font-bold mt-0.5 leading-snug" style={{ color: '#ffffff' }}>{cat.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Pillars / Trust Guarantees */}
      <section className="container py-16 md:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-[#c25e38] mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="16" height="13" x="2" y="6" rx="2"/><path d="M16 8V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4"/><circle cx="7" cy="19" r="2"/><circle cx="17" cy="19" r="2"/></svg>
            </div>
            <h4 className="font-bold text-slate-900 text-base">Free Delivery</h4>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Complimentary fast tracked delivery across all states on orders exceeding ₹2,000.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 15 2 2 4-4"/><rect width="20" height="14" x="2" y="6" rx="2"/><path d="M12 2v4"/></svg>
            </div>
            <h4 className="font-bold text-slate-900 text-base">100% Genuine Quality</h4>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Crafted with ethically-sourced materials. Backed by our comprehensive 1-year product warranty.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </div>
            <h4 className="font-bold text-slate-900 text-base">30-Day Easy Returns</h4>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              If it doesn't fit your routine, send it back within 30 days for a prompt, full refund.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            </div>
            <h4 className="font-bold text-slate-900 text-base">Secure Checkout</h4>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Bank-grade encrypted checkout supporting UPI, Credit Cards, NetBanking, and Cash on Delivery.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Newsletter Call to Action */}
      <section className="container pb-20">
        <div className="rounded-3xl bg-[#0f172a] p-8 sm:p-12 text-white relative overflow-hidden shadow-xl">
          <div className="absolute right-0 top-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-[#c25e38]/20 blur-3xl"></div>
          
          <div className="relative max-w-xl">
            <span className="text-xs font-bold uppercase tracking-widest text-[#f0bd82]">VIP Club</span>
            <h3 className="serif text-3xl sm:text-4xl font-bold mt-2" style={{ color: '#ffffff' }}>
              Join the Nile & Co. Circle
            </h3>
            <p className="text-sm text-slate-300 mt-3 leading-relaxed">
              Receive early access to seasonal capsule drops, design stories, and enjoy an exclusive 10% discount on your first order.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert('Thank you for subscribing! Check your inbox for your 10% welcome coupon.');
              }}
              className="mt-6 flex flex-col sm:flex-row gap-3"
            >
              <input
                type="email"
                required
                placeholder="Enter your email address..."
                className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm text-white placeholder:text-white/50 focus:border-white focus:bg-white/20 focus:outline-none flex-1"
              />
              <button
                type="submit"
                className="btn-accent !px-7 !py-3 !text-sm !font-bold rounded-full transition-all"
                style={{ color: '#ffffff', backgroundColor: '#c25e38' }}
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </section>
    </Shell>
  );
}
