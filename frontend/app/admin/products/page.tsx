'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, money } from '../../../lib/api';
import { AdminPage, Loading, Table } from '../../../components/AdminShell';

export default function AdminProducts() {
  const qc = useQueryClient(); const [category, setCategory] = useState({ name: '', slug: '' }); const [product, setProduct] = useState({ name: '', slug: '', description: '', categoryId: '' });
  const products = useQuery({ queryKey: ['admin-products'], queryFn: () => api<any>('/catalog/products?limit=100') });
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => api<any[]>('/catalog/categories') });
  const invalidate = () => { qc.invalidateQueries({ queryKey: ['admin-products'] }); qc.invalidateQueries({ queryKey: ['categories'] }); };
  const createCategory = useMutation({ mutationFn: () => api('/catalog/categories', { method: 'POST', body: JSON.stringify(category) }), onSuccess: () => { setCategory({ name: '', slug: '' }); invalidate(); } });
  const createProduct = useMutation({ mutationFn: () => api('/catalog/products', { method: 'POST', body: JSON.stringify(product) }), onSuccess: () => { setProduct({ name: '', slug: '', description: '', categoryId: '' }); invalidate(); } });
  const removeProduct = useMutation({ mutationFn: (id: string) => api(`/catalog/products/${id}`, { method: 'DELETE' }), onSuccess: invalidate });
  const removeCategory = useMutation({ mutationFn: (id: string) => api(`/catalog/categories/${id}`, { method: 'DELETE' }), onSuccess: invalidate });
  return <AdminPage title="Catalog & inventory">
    <div className="mb-6 grid gap-4 lg:grid-cols-2">
      <form onSubmit={e => { e.preventDefault(); createCategory.mutate(); }} className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="serif text-2xl">New category</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><input required value={category.name} onChange={e => setCategory({ ...category, name: e.target.value })} placeholder="Name" className="rounded-lg border p-2" /><input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={category.slug} onChange={e => setCategory({ ...category, slug: e.target.value })} placeholder="slug" className="rounded-lg border p-2" /></div><button disabled={createCategory.isPending} className="mt-4 rounded-full bg-[var(--ink)] px-4 py-2 text-sm text-white">Create category</button>{createCategory.isError && <p className="mt-2 text-sm text-red-700">{(createCategory.error as Error).message}</p>}</form>
      <form onSubmit={e => { e.preventDefault(); createProduct.mutate(); }} className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="serif text-2xl">New product</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><input required value={product.name} onChange={e => setProduct({ ...product, name: e.target.value })} placeholder="Name" className="rounded-lg border p-2" /><input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={product.slug} onChange={e => setProduct({ ...product, slug: e.target.value })} placeholder="slug" className="rounded-lg border p-2" /><select required value={product.categoryId} onChange={e => setProduct({ ...product, categoryId: e.target.value })} className="rounded-lg border p-2"><option value="">Category</option>{(categories.data || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><input value={product.description} onChange={e => setProduct({ ...product, description: e.target.value })} placeholder="Description" className="rounded-lg border p-2" /></div><button disabled={createProduct.isPending} className="mt-4 rounded-full bg-[var(--ink)] px-4 py-2 text-sm text-white">Create product</button>{createProduct.isError && <p className="mt-2 text-sm text-red-700">{(createProduct.error as Error).message}</p>}</form>
    </div>
    <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm"><h2 className="serif text-2xl">Categories</h2><div className="mt-3 flex flex-wrap gap-2">{(categories.data || []).map((c: any) => <span key={c.id} className="rounded-full bg-[#eef2ed] px-3 py-1 text-sm">{c.name} <button aria-label={`Delete ${c.name}`} className="ml-2 text-red-700" onClick={() => removeCategory.mutate(c.id)}>×</button></span>)}</div></div>
    {products.isLoading ? <Loading /> : <Table><thead><tr><th className="p-4">Product</th><th>Category</th><th>Variants</th><th>Price</th><th>Stock</th><th /></tr></thead><tbody>{(products.data?.products || []).map((p: any) => <tr className="border-t" key={p.id}><td className="p-4">{p.name}</td><td>{p.category?.name}</td><td>{p.variants?.length}</td><td>{p.variants?.[0] ? money(p.variants[0].pricePaise) : '—'}</td><td>{p.variants?.reduce((sum: number, v: any) => sum + (v.inventory?.quantity || 0), 0)}</td><td><button className="text-red-700 underline" onClick={() => removeProduct.mutate(p.id)}>Delete</button></td></tr>)}</tbody></Table>}
  </AdminPage>;
}
