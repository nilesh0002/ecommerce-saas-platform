/* eslint-disable */
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useStore } from '../lib/store';
import { api } from '../lib/api';

export type CurrentUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'SUPER_ADMIN' | 'MANAGER' | 'SUPPORT' | 'CUSTOMER';
  emailVerified: boolean;
};

export async function logout() {
  try {
    await api('/auth/logout', { method: 'POST' });
  } catch {
    // Continue even if server logout blips
  }
  window.location.href = '/login';
}

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const count = useStore((s) => s.cart.reduce((a, x) => a + x.quantity, 0));
  const wishlistCount = useStore((s) => s.wishlist.length);

  const [q, setQ] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch current user session
  const { data: user, isLoading } = useQuery<CurrentUser | null>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const res = await api<CurrentUser>('/auth/me');
        return res;
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
  });

  // Close user dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) {
      router.push(`/catalog?q=${encodeURIComponent(q.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const isStaff = user && (user.role === 'SUPER_ADMIN' || user.role === 'MANAGER' || user.role === 'SUPPORT');

  return (
    <>
      {/* Top Announcement Bar */}
      <div className="bg-[#17211b] px-4 py-2 text-center text-xs tracking-wider text-white flex justify-center items-center gap-3">
        <span>✨ FREE SHIPPING ON ORDERS OVER ₹2,000</span>
        <span className="opacity-40">•</span>
        <Link href="/catalog" className="underline underline-offset-2 hover:text-[#d46a45] transition-colors">
          Shop New Arrivals
        </Link>
      </div>

      {/* Main Sticky Header */}
      <header className="sticky top-0 z-40 border-b border-black/10 bg-[#f7f5ef]/95 backdrop-blur-md">
        <div className="container flex h-20 items-center justify-between gap-4">
          
          {/* Logo & Desktop Nav */}
          <div className="flex items-center gap-8">
            <Link href="/" className="serif text-2xl font-bold tracking-tight hover:opacity-90 transition-opacity">
              Nile <span className="text-[#d46a45]">&</span> Co.
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link 
                href="/catalog" 
                className={`transition-colors hover:text-[#d46a45] ${pathname === '/catalog' ? 'text-[#d46a45] font-semibold' : 'text-[#17211b]/80'}`}
              >
                Shop All
              </Link>
              <Link 
                href="/catalog?sort=newest" 
                className="text-[#17211b]/80 hover:text-[#d46a45] transition-colors"
              >
                New Arrivals
              </Link>
              <Link 
                href="/wishlist" 
                className="text-[#17211b]/80 hover:text-[#d46a45] transition-colors flex items-center gap-1.5"
              >
                <span>Wishlist</span>
                {wishlistCount > 0 && (
                  <span className="rounded-full bg-[#17211b]/10 px-1.5 py-0.2 text-[11px] font-semibold">
                    {wishlistCount}
                  </span>
                )}
              </Link>
            </nav>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="hidden lg:flex relative items-center w-72">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products, brands..."
              className="w-full rounded-full border border-black/15 bg-white/70 px-4 py-2 pr-9 text-xs placeholder:text-black/40 focus:border-[#17211b] focus:bg-white focus:outline-none transition-all shadow-xs"
            />
            <button type="submit" aria-label="Search" className="absolute right-3 text-black/50 hover:text-black">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
          </form>

          {/* Right Action Icons & User Authentication */}
          <div className="flex items-center gap-4">
            
            {/* User Account / Sign In Widget */}
            {isLoading ? (
              <div className="h-9 w-20 animate-pulse rounded-full bg-black/5"></div>
            ) : user ? (
              /* Authenticated User Menu */
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-full border border-black/15 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#17211b] hover:border-black/30 hover:shadow-xs transition-all"
                  aria-expanded={userMenuOpen}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#17211b] text-[11px] text-white">
                    {user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
                  </span>
                  <span className="max-w-[100px] truncate">
                    {user.firstName || user.email.split('@')[0]}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`}>
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-black/10 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95 duration-150 z-50">
                    <div className="border-b border-black/5 px-3 py-2.5">
                      <p className="text-xs font-semibold text-[#17211b]">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="truncate text-[11px] text-black/50">{user.email}</p>
                      {isStaff && (
                        <span className="mt-1.5 inline-block rounded-md bg-[#d46a45]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#d46a45]">
                          {user.role}
                        </span>
                      )}
                    </div>

                    <div className="py-1 text-xs">
                      {isStaff && (
                        <Link
                          href="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 rounded-xl px-3 py-2 font-semibold text-[#d46a45] hover:bg-[#d46a45]/10 transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
                          Admin Dashboard
                        </Link>
                      )}
                      <Link
                        href="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-[#17211b] hover:bg-black/5 transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        My Profile
                      </Link>
                      <Link
                        href="/orders"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-[#17211b] hover:bg-black/5 transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                        Orders & Invoices
                      </Link>
                      <Link
                        href="/addresses"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-[#17211b] hover:bg-black/5 transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                        Delivery Addresses
                      </Link>
                    </div>

                    <div className="border-t border-black/5 pt-1">
                      <button
                        onClick={logout}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Guest: Prominent Sign In and Register Buttons */
              <div className="flex items-center gap-2.5">
                <Link
                  href="/login"
                  className="rounded-full px-4 py-2 text-xs font-semibold text-[#17211b] hover:bg-black/5 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-[#17211b] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#2b3a31] transition-all hover:scale-102"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Shopping Cart Button */}
            <Link
              href="/cart"
              className="relative flex items-center justify-center rounded-full bg-white border border-black/15 p-2.5 hover:border-black/30 hover:shadow-xs transition-all"
              aria-label="Shopping Cart"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
                <path d="M3 6h18"></path>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
              {count > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d46a45] px-1 text-[11px] font-bold text-white shadow-xs">
                  {count}
                </span>
              )}
            </Link>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#17211b]"
              aria-label="Toggle menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {mobileMenuOpen ? (
                  <path d="M18 6 6 18M6 6l12 12" />
                ) : (
                  <path d="M4 12h16M4 6h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-black/10 bg-[#f7f5ef] px-6 py-5 animate-in slide-in-from-top-4 duration-200">
            <form onSubmit={handleSearch} className="mb-4 flex relative items-center">
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search products..."
                className="w-full rounded-full border border-black/15 bg-white px-4 py-2.5 text-sm placeholder:text-black/40 focus:outline-none"
              />
              <button type="submit" className="absolute right-3 text-black/50">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </button>
            </form>

            <div className="grid gap-3 text-sm font-semibold">
              <Link href="/catalog" onClick={() => setMobileMenuOpen(false)} className="py-1">
                Shop Collection
              </Link>
              <Link href="/catalog?sort=newest" onClick={() => setMobileMenuOpen(false)} className="py-1">
                New Arrivals
              </Link>
              <Link href="/wishlist" onClick={() => setMobileMenuOpen(false)} className="py-1">
                Wishlist ({wishlistCount})
              </Link>
              <Link href="/cart" onClick={() => setMobileMenuOpen(false)} className="py-1">
                Shopping Bag ({count})
              </Link>

              <div className="border-t border-black/10 my-2 pt-3">
                {user ? (
                  <>
                    <p className="text-xs text-[var(--muted)] mb-2">Signed in as {user.email}</p>
                    <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="block py-1">
                      Account Settings
                    </Link>
                    <Link href="/orders" onClick={() => setMobileMenuOpen(false)} className="block py-1">
                      Orders & History
                    </Link>
                    {isStaff && (
                      <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-[#d46a45]">
                        Admin Dashboard
                      </Link>
                    )}
                    <button onClick={logout} className="mt-2 text-left text-red-600 font-bold">
                      Sign Out
                    </button>
                  </>
                ) : (
                  <div className="grid gap-2 pt-1">
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-full border border-black/20 bg-white py-2.5 text-center font-bold"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-full bg-[#17211b] py-2.5 text-center font-bold text-white"
                    >
                      Create Account
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col justify-between">
      <Header />
      <main className="flex-1">{children}</main>
      
      {/* Modern High-End Footer */}
      <footer className="mt-24 bg-[#17211b] py-16 text-white border-t border-white/10">
        <div className="container grid gap-12 sm:grid-cols-2 md:grid-cols-4">
          
          {/* Brand Info */}
          <div className="space-y-3">
            <div className="serif text-2xl font-bold tracking-tight">Nile & Co.</div>
            <p className="text-sm text-white/60 leading-relaxed">
              Thoughtfully curated essentials made for everyday rituals, lasting quality, and slower living.
            </p>
            <div className="pt-2 text-xs text-white/40">
              © {new Date().getFullYear()} Nile & Co. All rights reserved.
            </div>
          </div>

          {/* Shop */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#d46a45] mb-4">Shop</div>
            <div className="grid gap-2.5 text-sm text-white/70">
              <Link href="/catalog" className="hover:text-white transition-colors">All Products</Link>
              <Link href="/catalog?sort=newest" className="hover:text-white transition-colors">New Releases</Link>
              <Link href="/cart" className="hover:text-white transition-colors">Shopping Bag</Link>
              <Link href="/wishlist" className="hover:text-white transition-colors">Saved Items</Link>
            </div>
          </div>

          {/* Account */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#d46a45] mb-4">Account</div>
            <div className="grid gap-2.5 text-sm text-white/70">
              <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
              <Link href="/register" className="hover:text-white transition-colors">Create Account</Link>
              <Link href="/orders" className="hover:text-white transition-colors">Track Orders</Link>
              <Link href="/addresses" className="hover:text-white transition-colors">Saved Addresses</Link>
              <Link href="/admin" className="hover:text-white transition-colors text-white/40 text-xs">Admin Access</Link>
            </div>
          </div>

          {/* Customer Care */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#d46a45] mb-4">Support</div>
            <p className="text-sm text-white/70 leading-relaxed">
              Questions or order updates?
              <br />
              <span className="font-semibold text-white">support@nileandco.com</span>
            </p>
            <p className="mt-3 text-xs text-white/50">
              Monday – Friday<br />
              9:00 AM – 6:00 PM IST
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function ErrorState({ message = 'Unable to load this page.' }: { message?: string }) {
  return (
    <div className="container py-28 text-center max-w-md mx-auto">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h1 className="serif text-3xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">{message}</p>
      <Link href="/" className="mt-6 inline-block rounded-full bg-[#17211b] px-6 py-3 text-sm font-bold text-white shadow-xs hover:bg-[#2b3a31] transition-all">
        Back to Home
      </Link>
    </div>
  );
}
