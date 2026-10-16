'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { Shell } from '../../../components/Storefront';

export default function NewAddress() {
  const router = useRouter();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    label: 'Home',
    fullName: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'IN',
    phone: '',
  });
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api('/commerce/addresses', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          country: form.country.trim().length === 2 ? form.country.trim() : 'IN',
        }),
      });
      await qc.invalidateQueries({ queryKey: ['addresses'] });
      router.push('/addresses');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save address');
    }
  }

  return (
    <Shell>
      <div className="mx-auto max-w-xl px-5 py-14">
        <h1 className="serif text-5xl">Add an address</h1>
        <form onSubmit={submit} className="mt-8 grid gap-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {Object.keys(form).map((k) => (
            <input
              key={k}
              required={['fullName', 'line1', 'city', 'state', 'postalCode', 'phone'].includes(k)}
              placeholder={k.charAt(0).toUpperCase() + k.slice(1)}
              value={form[k as keyof typeof form]}
              onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              className="rounded-xl border border-black/15 bg-transparent px-4 py-3"
            />
          ))}
          <button className="rounded-full bg-[#17211b] py-4 font-bold text-white">Save address</button>
        </form>
      </div>
    </Shell>
  );
}
