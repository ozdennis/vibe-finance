"use client";

import { useState } from "react";
import { CreditCard, AlertCircle, CheckCircle, Calendar, Clock } from "lucide-react";
import { formatIDR } from "../lib/utils";

interface CreditCardStatus {
  accountId: string;
  name: string;
  currentBalance: number;
  creditLimit: number | null;
  statementBalance: number;
  unbilledAmount: number;
  dueDate: Date | null;
  daysUntilDue: number | null;
  isPaid: boolean;
  statementDay: number | null;
  dueDay: number | null;
  nextStatementDate: Date | null;
  utilizationRate: number | null;
}

interface CreditCardWidgetProps {
  cards: CreditCardStatus[];
}

export function CreditCardWidget({ cards }: CreditCardWidgetProps) {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  if (cards.length === 0) {
    return null;
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });
  };

  const getDueStatus = (daysUntilDue: number | null, isPaid: boolean) => {
    if (isPaid) {
      return { text: "Paid", color: "text-emerald-400", bgColor: "bg-emerald-500/10" };
    }
    if (daysUntilDue === null) {
      return { text: "No Statement", color: "text-slate-400", bgColor: "bg-slate-500/10" };
    }
    if (daysUntilDue < 0) {
      return { text: `Overdue ${Math.abs(daysUntilDue)} days`, color: "text-rose-400", bgColor: "bg-rose-500/10" };
    }
    if (daysUntilDue === 0) {
      return { text: "Due Today", color: "text-amber-400", bgColor: "bg-amber-500/10" };
    }
    if (daysUntilDue <= 3) {
      return { text: `Due in ${daysUntilDue} days`, color: "text-amber-400", bgColor: "bg-amber-500/10" };
    }
    return { text: `Due in ${daysUntilDue} days`, color: "text-blue-400", bgColor: "bg-blue-500/10" };
  };

  const getUtilizationColor = (rate: number | null) => {
    if (rate === null) return "text-zinc-500";
    if (rate >= 90) return "text-rose-400";
    if (rate >= 70) return "text-amber-400 text-shadow-sm";
    return "text-emerald-400";
  };

  return (
    <section className="glass-panel rounded-3xl p-6 mt-8 relative overflow-hidden group">
      {/* Subtle red ambient glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl -z-10 group-hover:bg-rose-500/10 transition-colors duration-500"></div>

      <div className="flex items-center gap-4 mb-8 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 shadow-inner flex items-center justify-center">
          <CreditCard size={24} className="text-rose-400" />
        </div>
        <div>
          <h3 className="text-zinc-100 font-bold text-lg tracking-tight">Credit Cards</h3>
          <p className="text-zinc-500 text-sm font-medium mt-0.5">Statement tracking & due dates</p>
        </div>
      </div>

      <div className="space-y-4 relative z-10">
        {cards.map((card) => {
          const dueStatus = getDueStatus(card.daysUntilDue, card.isPaid);
          const isExpanded = expandedCard === card.accountId;

          return (
            <div
              key={card.accountId}
              className={`rounded-2xl p-5 border transition-all duration-300 cursor-pointer overflow-hidden relative ${isExpanded
                  ? "bg-zinc-900/80 border-white/10 shadow-lg"
                  : "bg-zinc-900/40 border-transparent hover:bg-zinc-800/80 hover:border-white/5 active:scale-[0.99]"
                }`}
              onClick={() => setExpandedCard(isExpanded ? null : card.accountId)}
            >
              {isExpanded && <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none"></div>}
              {/* Header */}
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center shadow-inner">
                    <CreditCard size={16} className="text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-zinc-100 font-bold tracking-tight">{card.name}</p>
                    <p className="text-zinc-500 text-[11px] uppercase tracking-widest font-semibold mt-0.5">
                      {card.statementDay && card.dueDay
                        ? `STMT ${card.statementDay}TH → DUE ${card.dueDay}TH`
                        : "NOT SET"}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-rose-400 font-bold tracking-tight text-lg shadow-sm">{formatIDR(card.currentBalance)}</p>
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full mt-1 inline-block ${dueStatus.bgColor} ${dueStatus.color}`}>
                    {dueStatus.text}
                  </span>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="mt-5 pt-5 border-t border-white/5 space-y-5 animate-in slide-in-from-top-2 relative z-10">
                  {/* Statement Balance */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-950/50 border border-white/5 p-4 rounded-2xl">
                      <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold mb-2">Statement Bal</p>
                      <p className="text-zinc-100 font-bold tracking-tight">{formatIDR(card.statementBalance)}</p>
                      {card.isPaid ? (
                        <div className="flex items-center gap-1.5 mt-2 text-emerald-400 text-xs font-medium bg-emerald-500/10 w-fit px-2 py-0.5 rounded-full">
                          <CheckCircle size={12} />
                          <span>Paid</span>
                        </div>
                      ) : card.statementBalance > 0 ? (
                        <div className="flex items-center gap-1.5 mt-2 text-rose-400 text-xs font-medium bg-rose-500/10 w-fit px-2 py-0.5 rounded-full animate-pulse opacity-80">
                          <AlertCircle size={12} />
                          <span>Action Reqd</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="bg-zinc-950/50 border border-white/5 p-4 rounded-2xl">
                      <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold mb-2">Unbilled</p>
                      <p className="text-amber-400 font-bold tracking-tight">{formatIDR(card.unbilledAmount)}</p>
                      <p className="text-zinc-600 text-[10px] mt-1.5 leading-tight">
                        New charges
                      </p>
                    </div>
                  </div>

                  {/* Due Date & Next Statement */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 bg-zinc-900 border border-white/5 p-3 rounded-2xl">
                      <Calendar size={18} className="text-zinc-500" />
                      <div>
                        <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Due Date</p>
                        <p className="text-zinc-100 text-sm font-semibold">{formatDate(card.dueDate)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-zinc-900 border border-white/5 p-3 rounded-2xl">
                      <Clock size={18} className="text-zinc-500" />
                      <div>
                        <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Next Stmt</p>
                        <p className="text-zinc-100 text-sm font-semibold">{formatDate(card.nextStatementDate)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Credit Limit & Utilization */}
                  {card.creditLimit && (
                    <div className="bg-zinc-950/50 border border-white/5 p-4 rounded-2xl">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Credit Limit</p>
                        <p className="text-zinc-400 text-xs font-mono">{formatIDR(card.creditLimit)}</p>
                      </div>
                      <div className="w-full bg-zinc-900 rounded-full h-1.5 shadow-inner border border-white/5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${(card.utilizationRate || 0) >= 90
                              ? "bg-gradient-to-r from-rose-600 to-rose-400"
                              : (card.utilizationRate || 0) >= 70
                                ? "bg-gradient-to-r from-amber-600 to-amber-400"
                                : "bg-gradient-to-r from-emerald-600 to-emerald-400"
                            }`}
                          style={{ width: `${Math.min(card.utilizationRate || 0, 100)}%` }}
                        />
                      </div>
                      <p className={`text-[10px] font-bold tracking-wider mt-2 text-right ${getUtilizationColor(card.utilizationRate)}`}>
                        {card.utilizationRate?.toFixed(1)}% UTILIZED
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Expand Hint */}
              {!isExpanded && (
                <div className="flex justify-center mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-8 h-1 rounded-full bg-white/10 relative z-10"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Skeleton loader
export function CreditCardWidgetSkeleton() {
  return (
    <section className="glass-panel rounded-3xl p-6 mt-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-zinc-800/50 animate-pulse" />
        <div className="space-y-2">
          <div className="w-32 h-6 bg-zinc-800/50 rounded-md animate-pulse" />
          <div className="w-40 h-3 bg-zinc-800/50 rounded-md animate-pulse" />
        </div>
      </div>

      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-zinc-900/40 rounded-2xl p-5 border border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-800/50 animate-pulse" />
                <div className="space-y-2">
                  <div className="w-32 h-5 bg-zinc-800/50 rounded-md animate-pulse" />
                  <div className="w-24 h-3 bg-zinc-800/50 rounded-md animate-pulse" />
                </div>
              </div>
              <div className="space-y-2 text-right">
                <div className="w-24 h-6 bg-zinc-800/50 rounded-md animate-pulse ml-auto" />
                <div className="w-16 h-4 bg-zinc-800/50 rounded-md animate-pulse ml-auto" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
