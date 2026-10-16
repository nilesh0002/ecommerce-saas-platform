'use client';

import Link from 'next/link';
import { Shell } from '../../components/Storefront';
import { money } from '../../lib/api';
import { useStore } from '../../lib/store';

export default function Cart() {
  const { cart, remove, add } = useStore();
  const subtotal = cart.reduce((a, x) => a + (x.variant?.pricePaise || 0) * x.quantity, 0);
  const freeShippingThreshold = 200000; // ₹2,000 in paise
  const progressToFreeShipping = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));
  const amountLeftForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

  return (
    <Shell>
      <div className="container max-w-5xl py-12 md:py-16">
        
        {/* Title */}
        <div className="border-b border-slate-200 pb-5 mb-8">
          <span className="text-xs font-bold uppercase tracking-widest text-[#c25e38]">Shopping Bag</span>
          <h1 className="serif text-4xl sm:text-5xl font-bold text-slate-900 mt-1">Review Your Order</h1>
        </div>

        {!cart.length ? (
          <div className="rounded-3xl border border-slate-200 bg-white py-20 px-6 text-center shadow-xs max-w-xl mx-auto my-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
                <path d="M3 6h18"></path>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
            </div>
            <h2 className="serif text-2xl font-bold text-slate-800">Your bag is empty</h2>
            <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
              Explore our curated selection of thoughtfully crafted essentials and add your favorite items.
            </p>
            <Link
              href="/catalog"
              className="mt-6 inline-block rounded-full px-7 py-3.5 text-xs font-bold shadow-md hover:shadow-lg transition-all"
              style={{ color: '#ffffff', backgroundColor: '#0f172a' }}
            >
              Explore Collection
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-12 items-start">
            
            {/* Cart Items List */}
            <div className="lg:col-span-8 space-y-4">
              
              {/* Free Shipping Progress Meter */}
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-2">
                  <span>
                    {amountLeftForFreeShipping === 0
                      ? '🎉 You unlocked FREE Express Shipping!'
                      : `Add ${money(amountLeftForFreeShipping)} more to unlock FREE Express Shipping`}
                  </span>
                  <span className="font-bold">{progressToFreeShipping}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-amber-200/60">
                  <div
                    className="h-full bg-[#c25e38] transition-all duration-500 rounded-full"
                    style={{ width: `${progressToFreeShipping}%` }}
                  ></div>
                </div>
              </div>

              {/* Items Card */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden divide-y divide-slate-100">
                {cart.map((x) => {
                  const price = (x.variant?.pricePaise || 0) * x.quantity;
                  const itemImg = x.variant?.product?.images?.[0]?.url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80';

                  return (
                    <div key={x.variantId} className="flex gap-4 sm:gap-6 p-5 items-center">
                      <div className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-slate-200/60">
                        <img src={itemImg} alt="Item" className="h-full w-full object-cover" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-slate-900 truncate">
                          {x.variant?.product?.name || x.variant?.name || 'Curated Item'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Unit: {money(x.variant?.pricePaise || 0)}
                        </p>

                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex items-center rounded-full border border-slate-200 bg-slate-50">
                            <button
                              onClick={() => {
                                if (x.quantity > 1) {
                                  add({ variantId: x.variantId, quantity: -1, variant: x.variant });
                                } else {
                                  remove(x.variantId);
                                }
                              }}
                              className="px-2.5 py-1 text-slate-600 hover:text-slate-900 font-bold text-xs"
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>
                            <span className="px-2 text-xs font-bold text-slate-900">{x.quantity}</span>
                            <button
                              onClick={() => add({ variantId: x.variantId, quantity: 1, variant: x.variant })}
                              className="px-2.5 py-1 text-slate-600 hover:text-slate-900 font-bold text-xs"
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>

                          <button
                            onClick={() => remove(x.variantId)}
                            className="text-xs text-red-600 hover:underline font-semibold"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-sm text-slate-900">{money(price)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Continue Shopping Link */}
              <div className="pt-2">
                <Link
                  href="/catalog"
                  className="text-xs font-bold text-[#c25e38] hover:underline inline-flex items-center gap-1.5"
                >
                  <span>← Continue Shopping</span>
                </Link>
              </div>
            </div>

            {/* Order Summary Aside */}
            <aside className="lg:col-span-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
              <h3 className="serif text-xl font-bold text-slate-900">Order Summary</h3>

              <div className="space-y-3 text-xs text-slate-600 border-b border-slate-200 pb-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900">{money(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Shipping</span>
                  <span className="font-semibold text-slate-900">
                    {subtotal >= freeShippingThreshold ? (
                      <span className="text-emerald-700 font-bold">FREE</span>
                    ) : (
                      'Calculated next step'
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes (GST)</span>
                  <span className="font-semibold text-slate-900">Included</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-base font-bold text-slate-900">
                <span>Total</span>
                <span>{money(subtotal)}</span>
              </div>

              <Link
                href="/checkout"
                className="w-full rounded-full py-4 text-center text-xs font-bold shadow-md hover:shadow-lg transition-all block"
                style={{ color: '#ffffff', backgroundColor: '#0f172a' }}
              >
                Proceed to Checkout →
              </Link>

              <div className="rounded-xl bg-slate-50 p-3 space-y-2 text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <svg className="text-emerald-600" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Encrypted 256-bit bank security</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="text-emerald-600" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>UPI, Cards, NetBanking, & COD accepted</span>
                </div>
              </div>
            </aside>

          </div>
        )}
      </div>
    </Shell>
  );
}
