'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

const links: Array<[string, string]> = [['/admin', 'Overview'], ['/admin/products', 'Catalog & inventory'], ['/admin/orders', 'Orders'], ['/admin/customers', 'Customers'], ['/admin/coupons', 'Coupons'], ['/admin/banners', 'Banners'], ['/admin/reports', 'Reports']];
export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(); const router = useRouter();
  const me = useQuery({ queryKey: ['admin-me'], queryFn: () => api<{ role: string }>('/auth/me'), retry: false });
  if (me.isLoading) return <div className="min-h-screen p-10">Checking access…</div>;
  if (me.isError || !['SUPER_ADMIN', 'MANAGER', 'SUPPORT'].includes(me.data?.role || '')) return <div className="mx-auto max-w-xl p-10"><h1 className="serif text-4xl">Admin access required</h1><p className="mt-3 text-[var(--muted)]">Sign in with an authorized staff account to continue.</p><button className="mt-6 rounded-full bg-[var(--ink)] px-5 py-3 text-white" onClick={() => router.push('/login?next=/admin')}>Go to login</button></div>;
  const role = me.data?.role; const visibleLinks = role === 'SUPPORT' ? links.filter(([href]) => ['/admin', '/admin/orders', '/admin/customers', '/admin/reports'].includes(href)) : links;
  if (!visibleLinks.some(([href]) => href === path)) return <div className="mx-auto max-w-xl p-10"><h1 className="serif text-4xl">Not available</h1><p className="mt-3 text-[var(--muted)]">Your role does not have access to this workspace.</p><button className="mt-6 rounded-full bg-[var(--ink)] px-5 py-3 text-white" onClick={() => router.push('/admin')}>Back to dashboard</button></div>;
  return <div className="min-h-screen bg-[#eef2ed]"><aside className="fixed hidden h-screen w-64 border-r border-black/10 bg-[var(--ink)] p-6 text-white md:block"><Link href="/" className="serif text-2xl">Nile & Co.</Link><p className="mt-1 text-xs uppercase tracking-widest text-white/50">Admin studio</p><nav className="mt-10 grid gap-2">{visibleLinks.map(([href, label]) => <Link key={href} href={href} className={`rounded-xl px-4 py-3 text-sm ${path === href ? 'bg-white/15' : 'text-white/65 hover:bg-white/10'}`}>{label}</Link>)}</nav></aside><main className="md:ml-64"><div className="border-b border-black/10 bg-white/70 px-5 py-4 md:hidden"><select className="w-full rounded-lg border p-2" value={path} onChange={e => router.push(e.target.value)}>{visibleLinks.map(([href, label]) => <option key={href} value={href}>{label}</option>)}</select></div>{children}</main></div>;
}
export function AdminPage({ title, children }: { title: string; children: React.ReactNode }) { return <AdminShell><div className="mx-auto max-w-7xl p-5 md:p-10"><div className="mb-8"><p className="text-xs uppercase tracking-[.2em] text-[#d46a45]">Admin workspace</p><h1 className="serif mt-2 text-4xl">{title}</h1></div>{children}</div></AdminShell>; }
export function Table({ children }: { children: React.ReactNode }) { return <div className="overflow-x-auto rounded-2xl bg-white shadow-sm"><table className="w-full text-left text-sm">{children}</table></div>; }
export function Loading() { return <div className="h-48 animate-pulse rounded-2xl bg-black/5" />; }
