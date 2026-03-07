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
    if (rate === null) return "text-slate-400";
    if (rate >= 90) return "text-rose-400";
    if (rate >= 70) return "text-amber-400";
    return "text-emerald-400";
  };

  return (
    <section className="bg-slate-900/50 rounded-3xl border border-slate-800 p-6 mt-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
          <CreditCard size={20} className="text-rose-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold">Credit Cards</h3>
          <p className="text-slate-500 text-xs">Statement tracking & due dates</p>
        </div>
      </div>

      <div className="space-y-4">
        {cards.map((card) => {
          const dueStatus = getDueStatus(card.daysUntilDue, card.isPaid);
          const isExpanded = expandedCard === card.accountId;

          return (
            <div
              key={card.accountId}
              className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 hover:border-slate-600 transition-colors cursor-pointer"
              onClick={() => setExpandedCard(isExpanded ? null : card.accountId)}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                    <CreditCard size={14} className="text-slate-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{card.name}</p>
                    <p className="text-slate-500 text-xs">
                      {card.statementDay && card.dueDay
                        ? `Statement ${card.statementDay}th → Due ${card.dueDay}th`
                        : "Billing cycle not set"}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-rose-400 font-bold">{formatIDR(card.currentBalance)}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${dueStatus.bgColor} ${dueStatus.color}`}>
                    {dueStatus.text}
                  </span>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-4">
                  {/* Statement Balance */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/50 p-3 rounded-xl">
                      <p className="text-slate-500 text-xs mb-1">Statement Balance</p>
                      <p className="text-white font-semibold">{formatIDR(card.statementBalance)}</p>
                      {card.isPaid ? (
                        <div className="flex items-center gap-1 mt-1 text-emerald-400 text-xs">
                          <CheckCircle size={12} />
                          <span>Paid</span>
                        </div>
                      ) : card.statementBalance > 0 ? (
                        <div className="flex items-center gap-1 mt-1 text-rose-400 text-xs">
                          <AlertCircle size={12} />
                          <span>Payment Required</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-xl">
                      <p className="text-slate-500 text-xs mb-1">Unbilled Amount</p>
                      <p className="text-amber-400 font-semibold">{formatIDR(card.unbilledAmount)}</p>
                      <p className="text-slate-500 text-xs mt-1">
                        New charges since last statement
                      </p>
                    </div>
                  </div>

                  {/* Due Date & Next Statement */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-slate-400" />
                      <div>
                        <p className="text-slate-500 text-xs">Due Date</p>
                        <p className="text-white text-sm">{formatDate(card.dueDate)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-slate-400" />
                      <div>
                        <p className="text-slate-500 text-xs">Next Statement</p>
                        <p className="text-white text-sm">{formatDate(card.nextStatementDate)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Credit Limit & Utilization */}
                  {card.creditLimit && (
                    <div className="bg-slate-900/50 p-3 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-slate-500 text-xs">Credit Limit</p>
                        <p className="text-slate-400 text-xs">{formatIDR(card.creditLimit)}</p>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            (card.utilizationRate || 0) >= 90
                              ? "bg-rose-500"
                              : (card.utilizationRate || 0) >= 70
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(card.utilizationRate || 0, 100)}%` }}
                        />
                      </div>
                      <p className={`text-xs mt-1 ${getUtilizationColor(card.utilizationRate)}`}>
                        {card.utilizationRate?.toFixed(1)}% utilized
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Expand Hint */}
              {!isExpanded && (
                <p className="text-center text-slate-600 text-xs mt-3">
                  Tap to view details
                </p>
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
    <section className="bg-slate-900/50 rounded-3xl border border-slate-800 p-6 mt-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-slate-800 animate-pulse" />
        <div className="space-y-2">
          <div className="w-32 h-5 bg-slate-800 rounded animate-pulse" />
          <div className="w-24 h-3 bg-slate-800 rounded animate-pulse" />
        </div>
      </div>

      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-slate-800/50 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-700 animate-pulse" />
                <div className="space-y-2">
                  <div className="w-24 h-4 bg-slate-700 rounded animate-pulse" />
                  <div className="w-32 h-3 bg-slate-700 rounded animate-pulse" />
                </div>
              </div>
              <div className="w-20 h-5 bg-slate-700 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
