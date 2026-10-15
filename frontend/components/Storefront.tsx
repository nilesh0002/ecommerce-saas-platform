/* eslint-disable */
'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useStore } from '../lib/store';
import { api } from '../lib/api';

export function Header() {
  const pathname=usePathname(), router=useRouter(), count=useStore(s=>s.cart.reduce((a,x)=>a+x.quantity,0)); const [q,setQ]=useState('');
  const submit=(e:React.FormEvent)=>{e.preventDefault(); if(q.trim()) router.push(`/catalog?q=${encodeURIComponent(q)}`)};
  return <><div className="bg-[#17211b] px-4 py-2 text-center text-xs tracking-[.2em] text-white">FREE SHIPPING ON ORDERS OVER ₹2,000</div><header className="sticky top-0 z-20 border-b border-black/10 bg-[#f7f5ef]/95 backdrop-blur"><div className="container flex h-18 items-center gap-7"><Link href="/" className="serif text-2xl font-bold">Nile <span className="text-[#d46a45]">&</span> Co.</Link><nav className="hidden gap-5 text-sm md:flex"><Link href="/catalog">Shop</Link><Link href="/catalog?sort=newest">New arrivals</Link><Link href="/wishlist">Wishlist</Link></nav><form onSubmit={submit} className="ml-auto hidden w-56 rounded-full border border-black/15 px-4 py-2 md:block"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search products..." className="w-full bg-transparent text-sm outline-none"/></form><Link href="/profile" aria-label="Account">♙</Link><Link href="/cart" className="relative" aria-label="Cart">Bag {count>0&&<span className="absolute -right-3 -top-3 rounded-full bg-[#d46a45] px-1.5 text-[10px] text-white">{count}</span>}</Link></div></header></>;
}
export function Shell({children}:{children:React.ReactNode}) { return <><Header/><main>{children}</main><footer className="mt-20 bg-[#17211b] py-12 text-white"><div className="container grid gap-8 sm:grid-cols-3"><div><div className="serif text-2xl">Nile & Co.</div><p className="mt-2 text-sm text-white/60">Thoughtfully made essentials for slower, better living.</p></div><div><b>Explore</b><div className="mt-3 grid gap-2 text-sm text-white/70"><Link href="/catalog">All products</Link><Link href="/orders">Your orders</Link><Link href="/addresses">Addresses</Link></div></div><div><b>Help</b><p className="mt-3 text-sm text-white/70">hello@nileandco.example<br/>Mon–Fri, 9am–6pm</p></div></div></footer></> }
export function ErrorState({message='Unable to load this page.'}:{message?:string}) { return <div className="container py-24 text-center"><h1 className="serif text-3xl">Something went wrong</h1><p className="mt-2 text-[var(--muted)]">{message}</p><Link href="/" className="mt-6 inline-block rounded-full bg-[var(--ink)] px-6 py-3 text-sm text-white">Back home</Link></div> }
export async function logout(){await api('/auth/logout',{method:'POST'}); window.location.href='/';}
