/* eslint-disable */
'use client';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, money } from '../../../lib/api';
import { Shell, ErrorState } from '../../../components/Storefront';
import { useStore } from '../../../lib/store';

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: p, isLoading, error } = useQuery({ queryKey: ['product', slug], queryFn: () => api<any>(`/catalog/public/products/${slug}`) });
  const { data: wishlist } = useQuery({ queryKey: ['wishlist'], queryFn: () => api<any>('/commerce/wishlist'), retry: false });
  if (isLoading) return <Shell><div className="container py-24 text-center">Loading product…</div></Shell>;
  if (error || !p) return <Shell><ErrorState /></Shell>;
  const v = p.variants?.[0];
  const saved = useStore(s => v ? s.wishlist.includes(v.id) : false) || Boolean(v && (wishlist?.items || wishlist || []).some((item: any) => item.variantId === v.id));
  async function save() {
    if (!v) return;
    try {
      if (saved) await api(`/commerce/wishlist/items/${v.id}`, { method: 'DELETE' });
      else await api('/commerce/wishlist/items', { method: 'POST', body: JSON.stringify({ variantId: v.id }) });
    } catch { /* Guest fallback remains local. */ }
    useStore.getState().toggleWish(v.id);
  }
  return <Shell><div className="container grid gap-12 py-12 md:grid-cols-2"><div className="flex aspect-square items-center justify-center rounded-3xl bg-[#e5e9e1]">{p.images?.[0]?.url ? <img src={p.images[0].url} alt={p.name} className="h-full w-full rounded-3xl object-cover" /> : <span className="serif text-4xl text-black/30">{p.name}</span>}</div><div className="self-center"><p className="text-xs uppercase tracking-[.2em] text-[#d46a45]">Nile & Co. collection</p><h1 className="serif mt-3 text-5xl">{p.name}</h1>{v && <p className="mt-5 text-2xl">{money(v.pricePaise)}</p>}<p className="mt-6 leading-7 text-[var(--muted)]">{p.description || 'Beautifully considered and made for everyday use.'}</p>{v && <><button onClick={() => useStore.getState().add({ variantId: v.id, quantity: 1, variant: v })} className="mt-8 w-full rounded-full bg-[#17211b] py-4 font-bold text-white">Add to bag</button><button onClick={save} className="mt-3 w-full rounded-full border border-black/20 py-4 text-sm">{saved ? 'Saved to wishlist' : 'Save to wishlist'}</button></>}<div className="mt-8 border-t border-black/10 pt-5 text-sm text-[var(--muted)]">Free shipping over ₹2,000 · Easy returns within 7 days</div></div></div></Shell>;
}
