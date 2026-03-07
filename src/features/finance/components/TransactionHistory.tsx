// src/features/finance/components/TransactionHistory.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatIDR, formatDateID, getCategoryColor } from "../lib/utils";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  Wallet,
  Smartphone,
  CreditCard,
  Pencil,
  Trash2,
  X,
  CheckSquare,
  Square,
  Trash,
} from "lucide-react";
import { updateTransaction, deleteTransaction, deleteManyTransactions } from "../server/transaction-actions";

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
  accounts = [],
}: TransactionHistoryProps) {
  const router = useRouter();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    categoryId: "",
    date: "",
  });

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      amount: transaction.amount.toString(),
      description: transaction.description || "",
      categoryId: transaction.category?.id || "",
      date: transaction.date instanceof Date
        ? transaction.date.toISOString().split("T")[0]
        : transaction.date,
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = async (transactionId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this transaction? This action will adjust account balances."
      )
    )
      return;

    setIsDeleting(true);
    const result = await deleteTransaction(transactionId, userId);

    if (result.success) {
      router.refresh();
      setIsDeleting(false);
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
      router.refresh();
    } else {
      alert(result.error || "Failed to update transaction");
    }
  };

  // Bulk selection handlers
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    setIsBulkDeleting(true);
    const result = await deleteManyTransactions(Array.from(selectedIds), userId);

    setIsBulkDeleting(false);
    setShowBulkConfirm(false);

    if (result.success) {
      setSelectedIds(new Set());
      router.refresh();
      alert(`Successfully deleted ${(result as any).deleted || 0} transaction(s)`);
    } else {
      const errorMsg = (result as any).errors?.length
        ? (result as any).errors.join("\n")
        : result.error || "Failed to delete transactions";
      alert(errorMsg);
      if ((result as any).deleted > 0) {
        setSelectedIds(new Set());
        router.refresh();
      }
    }
  };

  const isAllSelected = transactions.length > 0 && selectedIds.size === transactions.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < transactions.length;

  if (transactions.length === 0) {
    return (
      <section className="glass-panel rounded-3xl p-6 mt-8">
        <h3 className="text-zinc-100 font-semibold mb-4 tracking-tight">Recent Transactions</h3>
        <div className="text-center py-12 text-zinc-500 text-sm">
          No transactions yet. Start by adding your first transaction.
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="glass-panel rounded-3xl p-6 mt-8 relative">
        {/* Header with Select All */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
              aria-label={isAllSelected ? "Deselect all" : "Select all"}
            >
              {isAllSelected ? (
                <CheckSquare size={20} className="text-indigo-400" />
              ) : isIndeterminate ? (
                <div className="relative">
                  <Square size={20} className="group-hover:text-indigo-400 transition-colors" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-indigo-400 rounded-sm" />
                  </div>
                </div>
              ) : (
                <Square size={20} className="group-hover:text-indigo-400 transition-colors" />
              )}
              <span className="text-sm font-medium">
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select All"}
              </span>
            </button>
          </div>
          <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{transactions.length} shown</span>
        </div>

        {/* Transaction List */}
        <div className="space-y-2">
          {transactions.map((tx) => {
            const isSelected = selectedIds.has(tx.id);
            return (
              <div
                key={tx.id}
                className={`group p-3 sm:p-4 rounded-2xl transition-all duration-200 cursor-pointer ${isSelected
                  ? "bg-indigo-500/10 border border-indigo-500/30"
                  : "bg-zinc-900/40 hover:bg-zinc-800/80 border border-transparent hover:border-white/5 active:scale-[0.99] active:duration-75"
                  }`}
                onClick={(e) => {
                  // Prevent selection toggle if interacting with actions
                  if ((e.target as Element).closest('button')) return;
                  toggleSelection(tx.id);
                }}
              >
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                  {/* Checkbox */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelection(tx.id);
                    }}
                    className="mt-1 sm:mt-0 flex-shrink-0 text-zinc-500 hover:text-indigo-400 transition-colors"
                    aria-label={isSelected ? "Deselect" : "Select"}
                  >
                    {isSelected ? (
                      <CheckSquare size={20} className="text-indigo-400" />
                    ) : (
                      <Square size={20} />
                    )}
                  </button>

                  {/* Icon */}
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-zinc-800 border border-white/5 shadow-inner flex items-center justify-center flex-shrink-0">
                    {getTransactionIcon(tx.type, tx.fromAccount?.type, tx.toAccount?.type)}
                  </div>

                  {/* Content Container */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">

                    {/* Top Row: Description & Amount */}
                    <div className="flex justify-between items-start mb-1 sm:mb-1.5 gap-2">
                      <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <p className="text-zinc-100 font-semibold truncate tracking-tight text-sm sm:text-base leading-tight">
                          {tx.description || tx.category?.name || "Uncategorized"}
                        </p>
                        {tx.category && (
                          <span
                            className={`inline-block w-max px-2 py-0.5 rounded-md text-[9px] uppercase tracking-wider font-bold ${getCategoryColor(
                              tx.category.name
                            )}`}
                          >
                            {tx.category.name}
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-right font-bold text-sm sm:text-lg tracking-tight whitespace-nowrap flex-shrink-0 ${tx.type === "INCOME"
                          ? "text-emerald-400"
                          : tx.type === "EXPENSE"
                            ? "text-rose-400"
                            : "text-zinc-300"
                          }`}
                      >
                        {tx.type === "INCOME" ? "+" : tx.type === "EXPENSE" ? "-" : ""}
                        {formatIDR(tx.amount)}
                      </div>
                    </div>

                    {/* Bottom Row: Date, Accounts & Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="text-[10px] sm:text-[11px] font-medium text-zinc-500 uppercase tracking-widest whitespace-nowrap">
                          {formatDateID(tx.date)}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-zinc-700 hidden sm:block"></span>
                        {tx.type === "TRANSFER" ? (
                          <span className="text-[10px] sm:text-xs font-medium text-zinc-400 flex items-center gap-1 truncate max-w-[120px] sm:max-w-none">
                            <span className="truncate">{tx.fromAccount?.name}</span>
                            <ArrowRightLeft size={8} className="mx-0.5 flex-shrink-0" />
                            <span className="truncate">{tx.toAccount?.name}</span>
                          </span>
                        ) : tx.type === "INCOME" ? (
                          <span className="text-[10px] sm:text-xs font-medium text-emerald-400/80 flex items-center gap-1.5 truncate max-w-[140px] sm:max-w-none">
                            <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 flex-shrink-0">
                              {getAccountIcon(tx.toAccount?.type || "CASH")}
                            </span>
                            <span className="truncate">{tx.toAccount?.name}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] sm:text-xs font-medium text-rose-400/80 flex items-center gap-1.5 truncate max-w-[140px] sm:max-w-none">
                            <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 flex-shrink-0">
                              {getAccountIcon(tx.fromAccount?.type || "CASH")}
                            </span>
                            <span className="truncate">{tx.fromAccount?.name}</span>
                          </span>
                        )}
                      </div>

                      {/* Individual Action Buttons */}
                      {selectedIds.size === 0 && (
                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEdit(tx); }}
                            className="p-1.5 sm:p-2 bg-zinc-800/0 hover:bg-zinc-700/50 rounded-full transition-all text-zinc-400 hover:text-white"
                            aria-label="Edit transaction"
                          >
                            <Pencil size={14} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(tx.id); }}
                            disabled={isDeleting}
                            className="p-1.5 sm:p-2 bg-rose-500/0 hover:bg-rose-500/10 rounded-full transition-all text-zinc-400 hover:text-rose-400 disabled:opacity-50"
                            aria-label="Delete transaction"
                          >
                            <Trash2 size={14} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-zinc-800/90 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 shadow-[0_16px_32px_-8px_rgba(0,0,0,0.8)] flex items-center justify-between gap-6 animate-in slide-in-from-bottom-8">
            <div className="flex items-center gap-3">
              <span className="text-zinc-100 font-semibold">{selectedIds.size} selected</span>
              <div className="w-[1px] h-4 bg-white/10"></div>
              <button
                onClick={clearSelection}
                className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
            <button
              onClick={() => setShowBulkConfirm(true)}
              disabled={isBulkDeleting}
              className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-400 disabled:bg-rose-500/50 text-white rounded-full font-bold tracking-wide transition-all active:scale-95 shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:shadow-[0_0_20px_rgba(244,63,94,0.5)]"
            >
              <Trash size={16} />
              {isBulkDeleting ? "Deleting..." : "Delete All"}
            </button>
          </div>
        )}
      </section>

      {/* Bulk Delete Confirmation Modal */}
      {showBulkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md">
          <div className="glass-panel rounded-3xl w-full max-w-md p-8 border border-white/10 shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Trash2 size={28} className="text-rose-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white tracking-tight">Delete Transactions</h3>
                <p className="text-zinc-400 text-sm mt-1">
                  Are you sure you want to delete {selectedIds.size} transaction(s)?
                </p>
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 mb-8">
              <p className="text-zinc-300 font-medium text-sm mb-3">
                This action will:
              </p>
              <ul className="text-zinc-400 text-sm space-y-2">
                <li className="flex gap-2">
                  <span className="text-rose-400">•</span> Delete the selected transactions permanently
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-400">•</span> Adjust account balances accordingly
                </li>
                <li className="flex gap-2">
                  <span className="text-zinc-500">•</span> Create audit log entries
                </li>
              </ul>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowBulkConfirm(false)}
                className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold tracking-wide transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="flex-[1.5] py-3.5 bg-rose-500 hover:bg-rose-400 disabled:bg-rose-500/50 text-white rounded-xl font-bold tracking-wide transition-all active:scale-[0.98] shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:shadow-[0_0_20px_rgba(244,63,94,0.5)]"
              >
                {isBulkDeleting ? "Deleting..." : "Confirm Deletion"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {isEditModalOpen && editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md">
          <div className="glass-panel rounded-3xl w-full max-w-md border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-zinc-900/40">
              <h3 className="text-xl font-bold text-white tracking-tight">Edit Transaction</h3>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingTransaction(null);
                }}
                className="p-2 hover:bg-zinc-800 rounded-full transition-colors active:scale-95 text-zinc-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
              <div>
                <label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2 block">Amount (IDR)</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full bg-zinc-950/50 border border-white/5 p-4 rounded-xl text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-lg placeholder:text-zinc-600"
                  required
                />
              </div>

              <div>
                <label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2 block">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="What was this for?"
                  className="w-full bg-zinc-950/50 border border-white/5 p-4 rounded-xl text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-zinc-600"
                />
              </div>

              <div>
                <label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2 block">Category</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) =>
                    setFormData({ ...formData, categoryId: e.target.value })
                  }
                  className="w-full bg-zinc-950/50 border border-white/5 p-4 rounded-xl text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none"
                >
                  <option value="" className="bg-zinc-900 text-zinc-500">No category selected</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id} className="bg-zinc-900">
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2 block">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-zinc-950/50 border border-white/5 p-4 rounded-xl text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  required
                />
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  className="w-full bg-indigo-500 hover:bg-indigo-400 py-4 rounded-xl font-bold tracking-wide text-white transition-all active:scale-[0.98] shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_20px_rgba(99,102,241,0.5)]"
                >
                  Save Changes
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
    <section className="glass-panel rounded-3xl p-6 mt-8">
      <div className="flex items-center justify-between mb-6">
        <div className="w-40 h-6 bg-zinc-800/50 rounded-md animate-pulse" />
        <div className="w-16 h-4 bg-zinc-800/50 rounded-md animate-pulse" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between p-4 bg-zinc-900/40 rounded-2xl border border-white/5"
          >
            <div className="flex items-center gap-4">
              <div className="w-6 h-6 bg-zinc-800/50 rounded-md animate-pulse" />
              <div className="w-12 h-12 rounded-2xl bg-zinc-800/50 animate-pulse" />
              <div className="space-y-3">
                <div className="w-40 h-5 bg-zinc-800/50 rounded-md animate-pulse" />
                <div className="w-24 h-3 bg-zinc-800/50 rounded-md animate-pulse" />
              </div>
            </div>
            <div className="w-28 h-6 bg-zinc-800/50 rounded-md animate-pulse" />
          </div>
        ))}
      </div>
    </section>
  );
}
