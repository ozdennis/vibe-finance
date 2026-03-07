// src/app/loading.tsx
// Root loading state for Vibe Finance OS
// Shows during initial page load and navigation

import { Wallet, CreditCard, TrendingUp, Tag } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-32">
      {/* Header with Settings skeleton */}
      <div className="flex justify-end mb-4">
        <div className="w-10 h-10 bg-slate-900 rounded-full animate-pulse" />
      </div>

      {/* Net Liquidity Hero Skeleton */}
      <section className="text-center py-10 px-6 bg-slate-900/50 rounded-3xl border border-slate-800 mb-8 animate-pulse">
        <div className="w-40 h-4 bg-slate-800 rounded mx-auto mb-4" />
        <div className="w-64 h-12 bg-slate-800 rounded mx-auto mb-4" />
        <div className="w-32 h-3 bg-slate-800 rounded mx-auto mb-6" />
        
        {/* Mini breakdown skeleton */}
        <div className="flex justify-center gap-8 mt-6">
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-3 bg-slate-800 rounded" />
            <div className="w-24 h-5 bg-slate-800 rounded" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-3 bg-slate-800 rounded" />
            <div className="w-24 h-5 bg-slate-800 rounded" />
          </div>
        </div>
      </section>

      {/* Account Grid Skeleton */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide mb-8">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex-shrink-0 w-72 bg-slate-900 p-5 rounded-2xl border border-slate-800 snap-start animate-pulse"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-5 h-5 bg-slate-800 rounded" />
              <div className="space-y-2">
                <div className="w-24 h-4 bg-slate-800 rounded" />
                <div className="w-16 h-3 bg-slate-800 rounded" />
              </div>
            </div>
            <div className="w-32 h-8 bg-slate-800 rounded" />
          </div>
        ))}
      </div>

      {/* Tax Projection Skeleton */}
      <section className="bg-slate-900/50 rounded-3xl border border-slate-800 p-6 mt-8 animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-slate-800 rounded" />
          <div className="w-32 h-5 bg-slate-800 rounded" />
        </div>
        <div className="w-40 h-10 bg-slate-800 rounded mb-4" />
        <div className="w-full h-2 bg-slate-800 rounded" />
      </section>

      {/* Monthly Trend Chart Skeleton */}
      <section className="bg-slate-900/50 rounded-3xl border border-slate-800 p-6 mt-8 animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-slate-800" />
          <div className="w-32 h-5 bg-slate-800 rounded" />
        </div>
        <div className="flex items-end gap-2 h-32 mt-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="flex-1 bg-slate-800 rounded-t animate-pulse"
              style={{ height: `${Math.random() * 60 + 20}%` }}
            />
          ))}
        </div>
      </section>

      {/* Transaction History Skeleton */}
      <section className="mt-8 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="w-40 h-6 bg-slate-800 rounded" />
          <div className="w-20 h-4 bg-slate-800 rounded" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-800 rounded-full" />
                <div className="space-y-2">
                  <div className="w-32 h-4 bg-slate-800 rounded" />
                  <div className="w-20 h-3 bg-slate-800 rounded" />
                </div>
              </div>
              <div className="w-24 h-5 bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      </section>

      {/* FAB Skeleton */}
      <div className="fixed bottom-6 right-6 h-16 w-16 bg-slate-800 rounded-full animate-pulse" />
    </div>
  );
}
