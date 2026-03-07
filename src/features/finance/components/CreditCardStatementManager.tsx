// src/features/finance/components/CreditCardStatementManager.tsx
"use client";

import { useState } from "react";
import { CreditCard, Plus, Check, Trash2, AlertCircle } from "lucide-react";
import { generateCreditCardStatement, markStatementAsPaid, deleteStatement } from "../server/statement-actions";
import { formatIDR } from "../lib/utils";

interface Statement {
  id?: string;
  accountId: string;
  statementDate?: string;
  startDate?: string;
  endDate?: string;
  dueDate?: string;
  statementBalance?: number;
  minimumPayment?: number;
  totalPayment?: number;
  isPaid?: boolean;
  paidAt?: string;
  name: string;
  creditLimit?: number | null;
  currentBalance?: number;
  unbilledAmount?: number;
  daysUntilDue?: number | null;
  nextStatementDate?: Date | null;
  utilizationRate?: number | null;
}

interface CreditCardStatementManagerProps {
  statements: Statement[];
  userId: string;
}

export function CreditCardStatementManager({
  statements,
  userId,
}: CreditCardStatementManagerProps) {
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<Record<string, string>>({});
  const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null);

  const handleGenerateStatement = async (accountId: string) => {
    setIsGenerating(accountId);
    try {
      const result = await generateCreditCardStatement({ accountId, userId });
      if (!result.success) {
        alert("❌ " + result.error);
      }
    } finally {
      setIsGenerating(null);
    }
  };

  const handleMarkAsPaid = async (statementId: string) => {
    const amount = parseFloat(paymentAmount[statementId] || "0");
    if (amount <= 0) {
      alert("❌ Please enter a valid payment amount");
      return;
    }

    setIsPaying(statementId);
    try {
      const result = await markStatementAsPaid({
        statementId,
        userId,
        paymentAmount: amount,
      });
      if (result.success) {
        setShowPaymentModal(null);
        setPaymentAmount({});
        window.location.reload(); // Refresh to show updated data
      } else {
        alert("❌ " + result.error);
      }
    } finally {
      setIsPaying(null);
    }
  };

  const handleDeleteStatement = async (statementId: string) => {
    if (!confirm("Are you sure you want to delete this statement?")) return;

    try {
      const result = await deleteStatement({ statementId, userId });
      if (!result.success) {
        alert("❌ " + result.error);
      } else {
        window.location.reload();
      }
    } catch (error) {
      alert("❌ Failed to delete statement");
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const isOverdue = (dueDate: string, isPaid: boolean) => {
    if (isPaid) return false;
    return getDaysUntilDue(dueDate) < 0;
  };

  // Group statements by account
  const statementsByAccount = statements.reduce((acc, stmt) => {
    if (!acc[stmt.accountId]) {
      acc[stmt.accountId] = [];
    }
    acc[stmt.accountId].push(stmt);
    return acc;
  }, {} as Record<string, Statement[]>);

  // Helper to safely get statement property
  const getStmtValue = (stmt: Statement, key: keyof Statement, defaultValue: any = "") => {
    return stmt[key] ?? defaultValue;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <CreditCard size={20} className="text-rose-400" />
          Credit Card Statements
        </h2>
      </div>

      {statements.length === 0 ? (
        <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-8 text-center">
          <CreditCard size={48} className="mx-auto mb-4 text-slate-600" />
          <p className="text-slate-400 mb-4">No statements yet</p>
          <p className="text-slate-500 text-sm">
            Generate your first credit card statement to start tracking billing cycles
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(statementsByAccount).map(([accountId, accountStatements]) => {
            const firstStmt = accountStatements[0];
            if (!firstStmt) return null;

            return (
              <div key={accountId} className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
                <div className="bg-slate-800/50 px-6 py-4 border-b border-slate-700">
                  <h3 className="font-semibold text-white">
                    {firstStmt.name}
                  </h3>
                  {firstStmt.creditLimit && (
                    <p className="text-xs text-slate-400 mt-1">
                      Limit: {formatIDR(firstStmt.creditLimit)}
                    </p>
                  )}
                </div>

                {/* Current Status Card */}
                <div className="p-6 border-b border-slate-800">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Current Balance</p>
                      <p className="text-2xl font-bold text-white">
                        {formatIDR(firstStmt.currentBalance || 0)}
                      </p>
                    </div>
                    {firstStmt.utilizationRate !== null && firstStmt.utilizationRate !== undefined && (
                      <div className="text-right">
                        <p className="text-sm text-slate-400 mb-1">Utilization</p>
                        <p className={`text-lg font-semibold ${
                          firstStmt.utilizationRate > 80 ? "text-rose-400" :
                          firstStmt.utilizationRate > 50 ? "text-amber-400" : "text-emerald-400"
                        }`}>
                          {firstStmt.utilizationRate.toFixed(1)}%
                        </p>
                      </div>
                    )}
                  </div>

                  {firstStmt.unbilledAmount !== undefined && firstStmt.unbilledAmount > 0 && (
                    <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Unbilled Amount</span>
                        <span className="text-amber-400 font-semibold">
                          {formatIDR(firstStmt.unbilledAmount)}
                        </span>
                      </div>
                    </div>
                  )}

                  {firstStmt.daysUntilDue !== null && firstStmt.daysUntilDue !== undefined && (
                    <div className="flex items-center gap-2">
                      {firstStmt.daysUntilDue < 0 ? (
                        <span className="px-2 py-1 bg-rose-500/20 text-rose-400 text-xs rounded-full flex items-center gap-1">
                          <AlertCircle size={12} /> Overdue by {Math.abs(firstStmt.daysUntilDue)} days
                        </span>
                      ) : firstStmt.daysUntilDue <= 7 ? (
                        <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                          Due in {firstStmt.daysUntilDue} days
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-slate-700 text-slate-400 text-xs rounded-full">
                          Due in {firstStmt.daysUntilDue} days
                        </span>
                      )}
                      {firstStmt.isPaid && (
                        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full flex items-center gap-1">
                          <Check size={12} /> Paid
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Statement History */}
                <div className="divide-y divide-slate-800">
                  {accountStatements.filter(s => s.statementDate).map((stmt) => {
                    const stmtDueDate = stmt.dueDate ? new Date(stmt.dueDate) : null;
                    const stmtDaysUntilDue = stmtDueDate
                      ? Math.ceil((stmtDueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                      : null;
                    const stmtOverdue = stmtDaysUntilDue !== null && stmtDaysUntilDue < 0 && !stmt.isPaid;
                    const stmtBalance = stmt.statementBalance || 0;
                    const stmtTotalPayment = stmt.totalPayment || 0;
                    const remainingBalance = stmtBalance - stmtTotalPayment;

                    return (
                      <div key={stmt.id || stmt.accountId} className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm text-slate-400">
                                Statement: {stmt.statementDate ? new Date(stmt.statementDate).toLocaleDateString() : "N/A"}
                              </span>
                              {stmt.isPaid ? (
                                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full flex items-center gap-1">
                                  <Check size={12} /> Paid
                                </span>
                              ) : stmtOverdue ? (
                                <span className="px-2 py-1 bg-rose-500/20 text-rose-400 text-xs rounded-full flex items-center gap-1">
                                  <AlertCircle size={12} /> Overdue
                                </span>
                              ) : stmtDaysUntilDue !== null ? (
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  stmtDaysUntilDue <= 7
                                    ? "bg-amber-500/20 text-amber-400"
                                    : "bg-slate-700 text-slate-400"
                                }`}>
                                  Due in {stmtDaysUntilDue} days
                                </span>
                              ) : null}
                            </div>

                            <div className="text-2xl font-bold text-white mb-1">
                              {formatIDR(stmtBalance)}
                            </div>

                            <div className="text-sm text-slate-400">
                              Remaining: <span className={remainingBalance > 0 ? "text-rose-400" : "text-emerald-400"}>
                                {formatIDR(remainingBalance)}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {!stmt.isPaid && stmt.id && (
                              <>
                                <button
                                  onClick={() => setShowPaymentModal(stmt.id!)}
                                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-900 rounded-lg text-sm font-semibold transition-colors"
                                >
                                  Pay
                                </button>
                                <button
                                  onClick={() => handleDeleteStatement(stmt.id!)}
                                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-rose-400"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        {stmtBalance > 0 && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">Paid</span>
                              <span className="text-emerald-400">
                                {formatIDR(stmtTotalPayment)} / {formatIDR(stmtBalance)}
                              </span>
                            </div>
                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  stmt.isPaid ? "bg-emerald-500" : "bg-amber-500"
                                }`}
                                style={{
                                  width: `${Math.min((stmtTotalPayment / stmtBalance) * 100, 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Details */}
                        <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
                          <div>
                            <span className="text-slate-500">Period</span>
                            <p className="text-slate-300">
                              {stmt.startDate ? new Date(stmt.startDate).toLocaleDateString() : "N/A"} -
                              {stmt.endDate ? new Date(stmt.endDate).toLocaleDateString() : "N/A"}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-500">Due Date</span>
                            <p className={`text-slate-300 ${stmtOverdue ? "text-rose-400" : ""}`}>
                              {stmtDueDate ? stmtDueDate.toLocaleDateString() : "N/A"}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-500">Min. Payment</span>
                            <p className="text-slate-300">{formatIDR(stmt.minimumPayment || 0)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Make Payment</h3>

            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-xs mb-2 block">Payment Amount</label>
                <input
                  type="number"
                  value={paymentAmount[showPaymentModal] || ""}
                  onChange={(e) => setPaymentAmount({ ...paymentAmount, [showPaymentModal]: e.target.value })}
                  placeholder="0"
                  className="w-full bg-slate-800 p-4 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50 text-2xl font-bold"
                  inputMode="decimal"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPaymentModal(null);
                    setPaymentAmount({});
                  }}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-semibold text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleMarkAsPaid(showPaymentModal)}
                  disabled={isPaying === showPaymentModal}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold text-slate-900 transition-colors"
                >
                  {isPaying === showPaymentModal ? "Processing..." : "Confirm Payment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
