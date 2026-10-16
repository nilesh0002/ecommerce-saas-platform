'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Shell } from '../../components/Storefront';

export default function RegisterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || undefined,
          password: form.password,
        }),
      });
      // Invalidate current user query to refresh header badge
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      router.push('/profile');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <div className="mx-auto max-w-lg px-5 py-14 sm:py-20">
        <div className="rounded-3xl border border-black/10 bg-white p-8 sm:p-10 shadow-sm">
          <div className="text-center mb-8">
            <span className="inline-block text-xs font-bold uppercase tracking-[.2em] text-[#d46a45]">
              New Member
            </span>
            <h1 className="serif mt-2 text-4xl sm:text-5xl font-bold tracking-tight text-[#17211b]">
              Create an account
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Join Nile & Co. for faster checkout, order history, and saved wishlists.
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 p-4 text-xs text-red-700 flex items-start gap-2.5">
              <svg className="shrink-0 mt-0.5 text-red-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={submit} className="grid gap-4">
            {/* First Name & Last Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#17211b] mb-1.5">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Nilesh"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-transparent px-4 py-3 text-sm focus:border-[#17211b] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17211b] mb-1.5">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Singh"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-transparent px-4 py-3 text-sm focus:border-[#17211b] focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-[#17211b] mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-xl border border-black/15 bg-transparent px-4 py-3 text-sm focus:border-[#17211b] focus:outline-none transition-colors"
              />
            </div>

            {/* Phone (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-[#17211b] mb-1.5">
                Phone Number <span className="text-black/40 font-normal">(Optional)</span>
              </label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-xl border border-black/15 bg-transparent px-4 py-3 text-sm focus:border-[#17211b] focus:outline-none transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#17211b]">
                  Password <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-[var(--muted)] hover:text-[#17211b]"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                required
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-xl border border-black/15 bg-transparent px-4 py-3 text-sm focus:border-[#17211b] focus:outline-none transition-colors"
              />
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                Must contain at least 8 characters.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex items-center justify-center rounded-full py-3.5 text-sm font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all cursor-pointer"
              style={{ color: '#ffffff', backgroundColor: '#0f172a' }}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Creating Account…</span>
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-[var(--muted)]">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-[#17211b] underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </Shell>
  );
}
