/* eslint-disable */
'use client';
export const dynamic = "force-dynamic";

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, money } from '../../lib/api';
import { Shell, ErrorState } from '../../components/Storefront';
import { useStore } from '../../lib/store';
import { useState, Suspense } from 'react';

type Product = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  categoryName?: string;
  images?: { url: string }[];
  variants?: { id: string; pricePaise: number; quantity: number; name: string }[];
  minPricePaise?: number;
  maxPricePaise?: number;
};

export default function Catalog() {
  return (
    <Suspense fallback={<Shell><div className="container py-24 text-center font-medium">Loading collection…</div></Shell>}>
      <CatalogContent />
    </Suspense>
  );
}

function CatalogContent() {
  const params = useSearchParams();
  const q = params.get('q') || '';
  const [sort, setSort] = useState(params.get('sort') || 'newest');
  const [selectedCat, setSelectedCat] = useState<string>('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['products', q, sort],
    queryFn: () => api<any>(`/catalog/public/products?q=${encodeURIComponent(q)}&sort=${sort}&limit=40`),
  });

  const rawProducts: Product[] = data?.items || data?.products || data || [];
  
  // Demo fallback products if live DB is empty
  const fallbackProducts: Product[] = [
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
      slug: 'artisan-ceramic-mug',
      name: 'Artisan Ceramic Coffee Mug',
      categoryName: 'Home & Living',
      description: 'Handcrafted stoneware mug finished with smooth matte glaze.',
      minPricePaise: 129900,
      images: [{ url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80' }],
    },
    {
      id: 'demo-3',
      slug: 'heritage-leather-backpack',
      name: 'Heritage Leather Backpack',
      categoryName: 'Travel & Carry',
      description: 'Full-grain vegetable-tanned leather with dedicated 16-inch laptop sleeve.',
      minPricePaise: 849900,
      images: [{ url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80' }],
    },
    {
      id: 'demo-4',
      slug: 'felt-vegan-leather-desk-pad',
      name: 'Felt & Vegan Leather Desk Pad',
      categoryName: 'Workspace',
      description: 'Dual-sided water-resistant workspace mat for precision mouse control.',
      minPricePaise: 249900,
      images: [{ url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&q=80' }],
    },
  ];

  const products = (rawProducts && rawProducts.length > 0) ? rawProducts : fallbackProducts;

  const categories = ['all', 'Audio & Tech', 'Home & Living', 'Travel & Carry', 'Workspace'];

  const filteredProducts = selectedCat === 'all' 
    ? products 
    : products.filter(p => p.categoryName?.toLowerCase() === selectedCat.toLowerCase());

  return (
    <Shell>
      <div className="container py-12 md:py-16">
        
        {/* Header Title & Sorting Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#c25e38]">Curated Catalog</span>
            <h1 className="serif mt-1 text-4xl sm:text-5xl font-bold text-slate-900">All Products</h1>
            <p className="mt-2 text-sm text-slate-500">
              {q ? `Showing search results for “${q}”` : 'Designed with honest materials and crafted for longevity.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">Sort by:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 shadow-xs focus:outline-none focus:border-slate-500"
            >
              <option value="newest">Featured & Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="name_asc">Name: A to Z</option>
            </select>
          </div>
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center gap-2 overflow-x-auto py-5 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold capitalize transition-all whitespace-nowrap shadow-xs ${
                selectedCat === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              style={selectedCat === cat ? { color: '#ffffff', backgroundColor: '#0f172a' } : {}}
            >
              {cat === 'all' ? 'All Collections' : cat}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 py-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-88 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message="Could not load the catalog. Please try again." />
        ) : filteredProducts.length === 0 ? (
          <div className="py-24 text-center">
            <h3 className="serif text-2xl font-bold text-slate-800">No products found</h3>
            <p className="mt-2 text-sm text-slate-500">Try adjusting your search terms or filter selection.</p>
            <button
              onClick={() => { setSelectedCat('all'); }}
              className="mt-6 rounded-full px-5 py-2.5 text-xs font-bold text-white shadow-xs"
              style={{ color: '#ffffff', backgroundColor: '#0f172a' }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 py-6">
            {filteredProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}

function ProductCard({ product: p }: { product: Product }) {
  const add = useStore((s) => s.add);
  const [added, setAdded] = useState(false);
  const v = p.variants?.[0] || {
    id: p.id,
    name: 'Default',
    pricePaise: p.minPricePaise || 499900,
    quantity: 10,
  };
  const pricePaise = v ? v.pricePaise : (p.minPricePaise ?? 499900);
  const imgUrl = p.images?.[0]?.url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80';

  const handleAdd = () => {
    add({ variantId: v.id, quantity: 1, variant: v as any });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <article className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:shadow-md transition-all duration-200">
      <div>
        <Link href={`/product/${p.slug}`} className="block relative aspect-square overflow-hidden rounded-xl bg-slate-100 mb-3">
          <img
            src={imgUrl}
            alt={p.name}
            className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
          />
          {p.categoryName && (
            <span className="absolute top-2.5 left-2.5 rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-bold text-slate-800 shadow-xs">
              {p.categoryName}
            </span>
          )}
        </Link>

        <Link href={`/product/${p.slug}`}>
          <h2 className="font-semibold text-sm text-slate-900 group-hover:text-[#c25e38] transition-colors line-clamp-1">
            {p.name}
          </h2>
        </Link>
        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
          {p.description || 'Considered craftsmanship built for everyday durability.'}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <div>
          <span className="text-[11px] text-slate-400 block font-normal">Price</span>
          <span className="text-sm font-bold text-slate-900">{money(pricePaise)}</span>
        </div>

        <button
          onClick={handleAdd}
          className="rounded-full px-3 py-1.5 text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5"
          style={{ color: '#ffffff', backgroundColor: added ? '#059669' : '#0f172a' }}
        >
          {added ? (
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
    </article>
  );
}
