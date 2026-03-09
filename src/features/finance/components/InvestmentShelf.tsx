// src/features/finance/components/InvestmentShelf.tsx
"use client";

import { TrendingUp, ArrowUpRight, ArrowDownRight, Percent, Calendar, Clock } from "lucide-react";
import { formatIDR } from "../lib/utils";

interface InvestmentAccount {
  accountId: string;
  name: string;
  currentBalance: number;
  currency: string;
  flowMTD: number;
  flowInflows: number;
  flowOutflows: number;
  interestMTD: number;
  interestGross: number;
  interestTax: number;
  isInterestEstimated: boolean;
  interestDaysAccrued: number;
  totalMTD: number;
  transactionCount: number;
  
  // TIME_DEPOSIT specific fields
  yieldMode?: "FLEXI" | "TIME_DEPOSIT";
  depositTermMonths?: number | null;
  maturityDate?: string | null; // ISO date string
  projectedInterestGross?: number | null;
  projectedInterestTax?: number | null;
  projectedInterestNet?: number | null;
  isMatured?: boolean;
}

interface InvestmentData {
  accounts: InvestmentAccount[];
  totalBalance: number;
  totalFlowMTD: number;
  totalInterestMTD: number;
  totalMTD: number;
  period: {
    month: number;
    year: number;
    label: string;
  };
}

interface InvestmentShelfProps {
  investmentData: InvestmentData;
}

/**
 * Investment Shelf Component
 * Dedicated horizontal scrolling section for INVESTMENT accounts only
 * Shows: Current Balance, Flow MTD, Interest MTD, Total MTD
 */
export function InvestmentShelf({ investmentData }: InvestmentShelfProps) {
  const { accounts, totalBalance, totalFlowMTD, totalInterestMTD, totalMTD, period } = investmentData;

  if (!accounts || accounts.length === 0) {
    return null;
  }

  return (
    <section className="mb-10">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-5 px-1">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-500/20 rounded-xl border border-purple-500/30">
            <TrendingUp size={18} className="text-purple-400" />
          </div>
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em]">
            Investment Shelf
          </h3>
        </div>
        <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">
          {period.label}
        </span>
      </div>

      {/* Horizontal Scrolling Shelf */}
      <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide -mx-4 px-4">
        {accounts.map((account, index) => {
          const isPositiveFlow = account.flowMTD >= 0;
          const isPositiveInterest = account.interestMTD >= 0;
          const isPositiveTotal = account.totalMTD >= 0;

          return (
            <div
              key={account.accountId}
              className="flex-shrink-0 w-[320px] group p-5 rounded-3xl border border-violet-500/20 hover:border-violet-500/40 interactive-card relative overflow-hidden bg-zinc-900/40"
              style={{
                animation: `fade-in 0.5s ease-out ${index * 100}ms both`,
              }}
            >
              {/* Subtle background glow */}
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>

              {/* Account Header */}
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="p-2.5 bg-zinc-800/80 rounded-xl border border-white/5 shadow-inner">
                  <TrendingUp size={18} className="text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-100 font-semibold text-base tracking-tight truncate">
                    {account.name}
                  </p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mt-0.5">
                    Investment
                  </p>
                </div>
              </div>

              {/* Current Balance */}
              <div className="mb-4 relative z-10">
                <p className="text-2xl font-bold tracking-tighter text-white">
                  {formatIDR(account.currentBalance)}
                </p>
              </div>

              {/* TIME_DEPOSIT Specific Info */}
              {account.yieldMode === "TIME_DEPOSIT" && account.depositTermMonths && account.maturityDate && (
                <div className="mb-4 space-y-2 relative z-10">
                  {/* Term and Maturity */}
                  <div className="flex items-center gap-3 text-xs text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-purple-400" />
                      <span>{account.depositTermMonths} months</span>
                    </div>
                    <div className="h-3 w-[1px] bg-zinc-700"></div>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-purple-400" />
                      <span>
                        {new Date(account.maturityDate).toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Projected Net Maturity Value */}
                  {account.projectedInterestNet !== null && account.projectedInterestNet !== undefined && (
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        {/* Label semantics: before maturity month => "Projected @ Maturity", in maturity month & estimated => "Maturity Interest (Est)" */}
                        {(() => {
                          const maturityDate = new Date(account.maturityDate!);
                          const isMaturityMonth = 
                            maturityDate.getFullYear() === period.year && 
                            maturityDate.getMonth() + 1 === period.month;
                          const label = (isMaturityMonth && account.isInterestEstimated)
                            ? "Maturity Interest (Est)"
                            : "Projected @ Maturity";
                          return (
                            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                              {label}
                            </span>
                          );
                        })()}
                      </div>
                      {/* Projected Net Maturity Value = currentBalance + projectedInterestNet */}
                      <div className="text-right">
                        <p className="text-sm font-bold text-purple-400">
                          {formatIDR(account.currentBalance + account.projectedInterestNet)}
                        </p>
                        {account.projectedInterestTax && account.projectedInterestTax > 0 && (
                          <p className="text-[9px] text-zinc-500 mt-0.5">
                            Principal: {formatIDR(account.currentBalance)} | Interest: +{formatIDR(account.projectedInterestNet || 0)} (Tax: -{formatIDR(account.projectedInterestTax)})
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Three MTD Metrics */}
              <div className="space-y-2 relative z-10">
                {/* Flow MTD */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${
                  isPositiveFlow
                    ? "bg-emerald-500/10 border border-emerald-500/20"
                    : "bg-rose-500/10 border border-rose-500/20"
                }`}>
                  <div className="flex items-center gap-2">
                    {isPositiveFlow ? (
                      <ArrowUpRight size={14} className="text-emerald-400" />
                    ) : (
                      <ArrowDownRight size={14} className="text-rose-400" />
                    )}
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Flow</span>
                  </div>
                  <span className={`text-xs font-bold tracking-tight ${
                    isPositiveFlow ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {isPositiveFlow ? "+" : ""}{formatIDR(account.flowMTD)}
                  </span>
                </div>

                {/* Interest MTD */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${
                  account.interestMTD > 0
                    ? "bg-emerald-500/10 border border-emerald-500/20"
                    : "bg-zinc-500/10 border border-zinc-500/20"
                }`}>
                  <div className="flex items-center gap-2">
                    <Percent size={14} className={account.interestMTD > 0 ? "text-emerald-400" : "text-zinc-400"} />
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                      Interest {account.isInterestEstimated ? "(Est)" : ""}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold tracking-tight ${
                      account.interestMTD > 0 ? "text-emerald-400" : "text-zinc-400"
                    }`}>
                      {formatIDR(account.interestMTD)}
                    </span>
                    {account.interestTax > 0 && (
                      <span className="text-[9px] text-zinc-500 block">
                        -{formatIDR(account.interestTax)} tax
                      </span>
                    )}
                  </div>
                </div>

                {/* Total MTD */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${
                  isPositiveTotal
                    ? "bg-indigo-500/10 border border-indigo-500/20"
                    : "bg-rose-500/10 border border-rose-500/20"
                }`}>
                  <div className="flex items-center gap-2">
                    {isPositiveTotal ? (
                      <ArrowUpRight size={14} className="text-indigo-400" />
                    ) : (
                      <ArrowDownRight size={14} className="text-rose-400" />
                    )}
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Total</span>
                  </div>
                  <span className={`text-xs font-bold tracking-tight ${
                    isPositiveTotal ? "text-indigo-400" : "text-rose-400"
                  }`}>
                    {isPositiveTotal ? "+" : ""}{formatIDR(account.totalMTD)}
                  </span>
                </div>
              </div>

              {/* Mini Stats */}
              {account.transactionCount > 0 && (
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5 relative z-10">
                  {account.flowInflows > 0 && (
                    <div className="flex flex-col">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Inflows</span>
                      <span className="text-xs font-medium text-emerald-400">
                        +{formatIDR(account.flowInflows)}
                      </span>
                    </div>
                  )}
                  {account.flowOutflows > 0 && (
                    <div className="flex flex-col">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Outflows</span>
                      <span className="text-xs font-medium text-rose-400">
                        -{formatIDR(account.flowOutflows)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Total Card */}
        <div className="flex-shrink-0 w-[320px] group p-5 rounded-3xl border border-white/10 interactive-card relative overflow-hidden bg-zinc-800/60">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-white/5 rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>

          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="p-2.5 bg-zinc-700/80 rounded-xl border border-white/5 shadow-inner">
              <TrendingUp size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-zinc-100 font-semibold text-base tracking-tight">
                Total Portfolio
              </p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mt-0.5">
                All Investments
              </p>
            </div>
          </div>

          <div className="mb-4 relative z-10">
            <p className="text-2xl font-bold tracking-tighter text-white">
              {formatIDR(totalBalance)}
            </p>
          </div>

          {/* Three MTD Metrics - Total */}
          <div className="space-y-2 relative z-10">
            {/* Flow MTD */}
            <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${
              totalFlowMTD >= 0
                ? "bg-emerald-500/10 border border-emerald-500/20"
                : "bg-rose-500/10 border border-rose-500/20"
            }`}>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Flow</span>
              <span className={`text-xs font-bold tracking-tight ${
                totalFlowMTD >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}>
                {totalFlowMTD >= 0 ? "+" : ""}{formatIDR(totalFlowMTD)}
              </span>
            </div>

            {/* Interest MTD */}
            <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${
              totalInterestMTD >= 0
                ? "bg-emerald-500/10 border border-emerald-500/20"
                : "bg-zinc-500/10 border border-zinc-500/20"
            }`}>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Interest</span>
              <span className={`text-xs font-bold tracking-tight ${
                totalInterestMTD >= 0 ? "text-emerald-400" : "text-zinc-400"
              }`}>
                {totalInterestMTD >= 0 ? "+" : ""}{formatIDR(totalInterestMTD)}
              </span>
            </div>

            {/* Total MTD */}
            <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${
              totalMTD >= 0
                ? "bg-indigo-500/10 border border-indigo-500/20"
                : "bg-rose-500/10 border border-rose-500/20"
            }`}>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Total</span>
              <span className={`text-xs font-bold tracking-tight ${
                totalMTD >= 0 ? "text-indigo-400" : "text-rose-400"
              }`}>
                {totalMTD >= 0 ? "+" : ""}{formatIDR(totalMTD)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function InvestmentShelfSkeleton() {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-5 px-1">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-zinc-800/50 rounded-xl animate-pulse" />
          <div className="w-32 h-3 bg-zinc-800/50 rounded-md animate-pulse" />
        </div>
        <div className="h-[1px] flex-1 bg-gradient-to-r from-white/5 to-transparent"></div>
      </div>

      <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide -mx-4 px-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[280px] p-5 rounded-3xl border border-white/5 bg-zinc-900/40 h-[180px]"
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>

            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="w-10 h-10 bg-zinc-800/50 rounded-xl animate-pulse" />
              <div className="space-y-2">
                <div className="w-24 h-4 bg-zinc-800/50 rounded-md animate-pulse" />
                <div className="w-16 h-2 bg-zinc-800/50 rounded-md animate-pulse" />
              </div>
            </div>
            <div className="w-32 h-7 bg-zinc-800/50 rounded-lg animate-pulse mb-3" />
            <div className="w-24 h-7 bg-zinc-800/50 rounded-xl animate-pulse" />
          </div>
        ))}
      </div>
    </section>
  );
}
