/* eslint-disable */
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Shell } from '../../components/Storefront';

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      // Invalidate current user query to refresh header badge
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      router.push('/profile');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  }

  // Convenience helper for testing
  function fillDemoAdmin() {
    setEmail('admin@example.com');
    setPassword('Password123!');
  }

  return (
    <Shell>
      <div className="mx-auto max-w-md px-5 py-16 sm:py-24">
        {/* Card Container */}
        <div className="rounded-3xl border border-black/10 bg-white p-8 sm:p-10 shadow-sm">
          <div className="text-center mb-8">
            <span className="inline-block text-xs font-bold uppercase tracking-[.2em] text-[#d46a45]">
              Member Access
            </span>
            <h1 className="serif mt-2 text-4xl sm:text-5xl font-bold tracking-tight text-[#17211b]">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Sign in to manage your orders, bag, and addresses.
            </p>
          </div>

          {/* Error Banner */}
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
            <div>
              <label className="block text-xs font-semibold text-[#17211b] mb-1.5">
                Email Address
              </label>
              <input
                required
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-black/15 bg-transparent px-4 py-3 text-sm focus:border-[#17211b] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#17211b]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-[var(--muted)] hover:text-[#17211b]"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="relative">
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-black/15 bg-transparent px-4 py-3 text-sm focus:border-[#17211b] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-3 flex items-center justify-center rounded-full py-3.5 text-sm font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all cursor-pointer"
              style={{ color: '#ffffff', backgroundColor: '#0f172a' }}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Signing in…</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo account quick filler */}
          <div className="mt-6 border-t border-black/10 pt-5 text-center">
            <button
              type="button"
              onClick={fillDemoAdmin}
              className="text-xs text-[#d46a45] hover:underline font-semibold"
            >
              ⚡ Quick Fill Seed Admin (`admin@example.com`)
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-[var(--muted)]">
            Don’t have an account?{' '}
            <Link href="/register" className="font-bold text-[#17211b] underline underline-offset-2">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </Shell>
  );
}
