// src/features/finance/components/TransactionHistory.tsx
"use client";

import { useState, useEffect } from "react";
import { formatIDR, formatDateID, getCategoryColor } from "../lib/utils";
import { ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Wallet, Smartphone, CreditCard, Pencil, Trash2, X } from "lucide-react";
import { updateTransaction, deleteTransaction } from "../server/transaction-actions";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  date: Date | string;
  category?: { id: string; name: string; color?: string | null } | null;
  fromAccount?: { id: string; name: string; type: string } | null;
  toAccount?: { id: string; name: string; type: string } | null;
}

interface TransactionHistoryProps {
  userId: string;
  limit?: number;
  transactions?: Transaction[];
  categories?: { id: string; name: string }[];
  accounts?: { id: string; name: string; type: string }[];
}

function getTransactionIcon(type: string, fromType?: string, toType?: string) {
  if (type === "TRANSFER") {
    return <ArrowRightLeft size={18} className="text-blue-400" />;
  }
  if (type === "INCOME") {
    return <ArrowUpRight size={18} className="text-emerald-400" />;
  }
  return <ArrowDownLeft size={18} className="text-rose-400" />;
}

function getAccountIcon(type: string) {
  switch (type) {
    case "CASH":
      return <Wallet size={14} />;
    case "E_WALLET":
      return <Smartphone size={14} />;
    case "CREDIT_CARD":
      return <CreditCard size={14} />;
    default:
      return <Wallet size={14} />;
  }
}

export function TransactionHistory({ 
  userId, 
  limit = 10, 
  transactions = [],
  categories = [],
  accounts = [] 
}: TransactionHistoryProps) {
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    categoryId: "",
    date: "",
  });

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      amount: transaction.amount.toString(),
      description: transaction.description || "",
      categoryId: transaction.category?.id || "",
      date: transaction.date instanceof Date 
        ? transaction.date.toISOString().split('T')[0]
        : transaction.date,
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = async (transactionId: string) => {
    if (!confirm("Are you sure you want to delete this transaction? This action will adjust account balances.")) return;
    
    setIsDeleting(true);
    const result = await deleteTransaction(transactionId, userId);
    
    if (result.success) {
      // Reload page to reflect changes
      window.location.reload();
    } else {
      alert(result.error || "Failed to delete transaction");
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingTransaction) return;

    const result = await updateTransaction({
      id: editingTransaction.id,
      amount: parseFloat(formData.amount),
      description: formData.description,
      categoryId: formData.categoryId || undefined,
      date: formData.date,
      userId,
    });

    if (result.success) {
      setIsEditModalOpen(false);
      setEditingTransaction(null);
      // Reload to show updated data
      window.location.reload();
    } else {
      alert(result.error || "Failed to update transaction");
    }
  };

  if (transactions.length === 0) {
    return (
      <section className="bg-slate-900/50 rounded-3xl border border-slate-800 p-6 mt-8">
        <h3 className="text-white font-semibold mb-4">Recent Transactions</h3>
        <div className="text-center py-8 text-slate-500 text-sm">
          No transactions yet. Start by adding your first transaction.
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="bg-slate-900/50 rounded-3xl border border-slate-800 p-6 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Recent Transactions</h3>
          <span className="text-xs text-slate-500">{transactions.length} shown</span>
        </div>

        <div className="space-y-3">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors group"
            >
              <div className="flex items-center gap-3 flex-1">
                {/* Icon */}
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                  {getTransactionIcon(
                    tx.type,
                    tx.fromAccount?.type,
                    tx.toAccount?.type
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium truncate">
                      {tx.description || tx.category?.name || "Uncategorized"}
                    </p>
                    {tx.category && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getCategoryColor(tx.category.name)}`}
                      >
                        {tx.category.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-slate-500">
                      {formatDateID(tx.date)}
                    </span>
                    {tx.type === "TRANSFER" ? (
                      <span className="text-xs text-slate-400">
                        {tx.fromAccount?.name} → {tx.toAccount?.name}
                      </span>
                    ) : tx.type === "INCOME" ? (
                      <span className="text-xs text-emerald-400/80 flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-emerald-400/20 flex items-center justify-center">
                          {getAccountIcon(tx.toAccount?.type || "CASH")}
                        </span>
                        {tx.toAccount?.name}
                      </span>
                    ) : (
                      <span className="text-xs text-rose-400/80 flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-rose-400/20 flex items-center justify-center">
                          {getAccountIcon(tx.fromAccount?.type || "CASH")}
                        </span>
                        {tx.fromAccount?.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Amount */}
                <div
                  className={`text-right font-bold ${
                    tx.type === "INCOME"
                      ? "text-emerald-400"
                      : tx.type === "EXPENSE"
                      ? "text-rose-400"
                      : "text-blue-400"
                  }`}
                >
                  {tx.type === "INCOME" ? "+" : tx.type === "EXPENSE" ? "-" : ""}
                  {formatIDR(tx.amount)}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(tx)}
                    className="p-2 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white"
                    aria-label="Edit transaction"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(tx.id)}
                    disabled={isDeleting}
                    className="p-2 hover:bg-rose-500/20 rounded-full transition-colors text-slate-400 hover:text-rose-400 disabled:opacity-50"
                    aria-label="Delete transaction"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Edit Transaction Modal */}
      {isEditModalOpen && editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-800">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h3 className="text-xl font-bold text-white">Edit Transaction</h3>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingTransaction(null);
                }}
                className="p-2 hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-slate-400 text-xs mb-2 block">
                  Amount (IDR)
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full bg-slate-800 p-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 text-xs mb-2 block">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What was this for?"
                  className="w-full bg-slate-800 p-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="text-slate-400 text-xs mb-2 block">
                  Category
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full bg-slate-800 p-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="">No category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 text-xs mb-2 block">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-slate-800 p-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                  required
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 py-3 rounded-xl font-semibold text-slate-900 transition-colors"
                >
                  Update Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// Skeleton loader
export function TransactionHistorySkeleton() {
  return (
    <section className="bg-slate-900/50 rounded-3xl border border-slate-800 p-6 mt-8">
      <div className="flex items-center justify-between mb-4">
        <div className="w-40 h-5 bg-slate-800 rounded animate-pulse" />
        <div className="w-16 h-4 bg-slate-800 rounded animate-pulse" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-700 animate-pulse" />
              <div className="space-y-2">
                <div className="w-32 h-4 bg-slate-700 rounded animate-pulse" />
                <div className="w-24 h-3 bg-slate-700 rounded animate-pulse" />
              </div>
            </div>
            <div className="w-20 h-5 bg-slate-700 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </section>
  );
}
