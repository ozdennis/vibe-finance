"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Tag,
  Plus,
  X,
  Wallet,
  CreditCard,
  Smartphone,
  TrendingUp,
  CheckSquare,
  Square,
  Trash,
} from "lucide-react";
import Link from "next/link";
import {
  createAccount,
  updateAccount,
  deleteAccount,
  deleteManyAccounts,
} from "@/features/finance/server/account-actions";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  deleteManyCategories,
} from "@/features/finance/server/category-actions";
import { getCategoryColor } from "@/features/finance/lib/utils";

const MOCK_USER_ID = "user_123";

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  creditLimit?: number | null;
}

interface Category {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
}

const ACCOUNT_TYPES = [
  { value: "CASH", label: "Cash", icon: Wallet },
  { value: "E_WALLET", label: "E-Wallet", icon: Smartphone },
  { value: "CREDIT_CARD", label: "Credit Card", icon: CreditCard },
  { value: "INVESTMENT", label: "Investment", icon: TrendingUp },
];

export default function SettingsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [accountFormData, setAccountFormData] = useState({
    name: "",
    type: "CASH" as "CASH" | "E_WALLET" | "CREDIT_CARD" | "INVESTMENT",
    balance: "",
    creditLimit: "",
    statementDay: "",
    dueDay: "",
  });
  const [isAccountSubmitting, setIsAccountSubmitting] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    color: "",
  });
  const [isCategorySubmitting, setIsCategorySubmitting] = useState(false);

  // Bulk selection state for accounts
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [isBulkDeletingAccounts, setIsBulkDeletingAccounts] = useState(false);
  const [showBulkConfirmAccounts, setShowBulkConfirmAccounts] = useState(false);

  // Bulk selection state for categories
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [isBulkDeletingCategories, setIsBulkDeletingCategories] = useState(false);
  const [showBulkConfirmCategories, setShowBulkConfirmCategories] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/settings-data");
      if (response.ok) {
        const data = await response.json();
        setAccounts((data.accounts || []) as Account[]);
        setCategories((data.categories || []) as Category[]);
      }
    } catch (error) {
      console.error("Failed to load settings data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAccountSubmitting) return;

    setIsAccountSubmitting(true);
    try {
      const data = {
        name: accountFormData.name,
        type: accountFormData.type,
        balance: parseFloat(accountFormData.balance) || 0,
        creditLimit: accountFormData.creditLimit
          ? parseFloat(accountFormData.creditLimit)
          : undefined,
        statementDay: accountFormData.statementDay
          ? parseInt(accountFormData.statementDay)
          : undefined,
        dueDay: accountFormData.dueDay ? parseInt(accountFormData.dueDay) : undefined,
        userId: MOCK_USER_ID,
      };

      let result;
      if (editingAccount) {
        result = await updateAccount({ ...data, id: editingAccount.id });
      } else {
        result = await createAccount(data);
      }

      if (result?.success) {
        resetAccountForm();
        setIsAccountModalOpen(false);
        loadData();
      } else {
        alert(result?.error || "Failed to save account");
      }
    } finally {
      setIsAccountSubmitting(false);
    }
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setAccountFormData({
      name: account.name,
      type: account.type as any,
      balance: account.balance.toString(),
      creditLimit: account.creditLimit?.toString() || "",
      statementDay: (account as any).statementDay?.toString() || "",
      dueDay: (account as any).dueDay?.toString() || "",
    });
    setIsAccountModalOpen(true);
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm("Are you sure? This will soft-delete the account.")) return;
    const result = await deleteAccount(accountId, MOCK_USER_ID);
    if (result?.success) {
      loadData();
    } else {
      alert(result?.error || "Failed to delete account");
    }
  };

  const resetAccountForm = () => {
    setAccountFormData({
      name: "",
      type: "CASH",
      balance: "",
      creditLimit: "",
      statementDay: "",
      dueDay: "",
    });
    setEditingAccount(null);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCategorySubmitting) return;

    setIsCategorySubmitting(true);
    try {
      const data = {
        name: categoryFormData.name,
        color: categoryFormData.color || undefined,
        userId: MOCK_USER_ID,
      };

      let result;
      if (editingCategory) {
        result = await updateCategory({ ...data, id: editingCategory.id });
      } else {
        result = await createCategory(data);
      }

      if (result?.success) {
        resetCategoryForm();
        setIsCategoryModalOpen(false);
        loadData();
      } else {
        alert(result?.error || "Failed to save category");
      }
    } finally {
      setIsCategorySubmitting(false);
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      color: category.color || "",
    });
    setIsCategoryModalOpen(true);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm("Are you sure? Cannot delete if category has transactions.")) return;
    const result = await deleteCategory(categoryId, MOCK_USER_ID);
    if (result?.success) {
      loadData();
    } else {
      alert(result?.error || "Failed to delete category");
    }
  };

  const resetCategoryForm = () => {
    setCategoryFormData({ name: "", color: "" });
    setEditingCategory(null);
  };

  // Account bulk selection handlers
  const toggleAccountSelection = (id: string) => {
    const newSelected = new Set(selectedAccounts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedAccounts(newSelected);
  };

  const toggleSelectAllAccounts = () => {
    if (selectedAccounts.size === accounts.length) {
      setSelectedAccounts(new Set());
    } else {
      setSelectedAccounts(new Set(accounts.map((a) => a.id)));
    }
  };

  const clearAccountSelection = () => {
    setSelectedAccounts(new Set());
  };

  const handleBulkDeleteAccounts = async () => {
    if (selectedAccounts.size === 0) return;

    setIsBulkDeletingAccounts(true);
    const result = await deleteManyAccounts(Array.from(selectedAccounts), MOCK_USER_ID);

    setIsBulkDeletingAccounts(false);
    setShowBulkConfirmAccounts(false);

    if (result.success) {
      setSelectedAccounts(new Set());
      loadData();
      alert(`Successfully deleted ${(result as any).deleted || 0} account(s)`);
    } else {
      const errorMsg = (result as any).errors?.length
        ? (result as any).errors.join("\n")
        : result.error || "Failed to delete accounts";
      alert(errorMsg);
      if ((result as any).deleted > 0) {
        setSelectedAccounts(new Set());
        loadData();
      }
    }
  };

  // Category bulk selection handlers
  const toggleCategorySelection = (id: string) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCategories(newSelected);
  };

  const toggleSelectAllCategories = () => {
    if (selectedCategories.size === categories.length) {
      setSelectedCategories(new Set());
    } else {
      setSelectedCategories(new Set(categories.map((c) => c.id)));
    }
  };

  const clearCategorySelection = () => {
    setSelectedCategories(new Set());
  };

  const handleBulkDeleteCategories = async () => {
    if (selectedCategories.size === 0) return;

    setIsBulkDeletingCategories(true);
    const result = await deleteManyCategories(Array.from(selectedCategories), MOCK_USER_ID);

    setIsBulkDeletingCategories(false);
    setShowBulkConfirmCategories(false);

    if (result.success) {
      setSelectedCategories(new Set());
      loadData();
      alert(`Successfully deleted ${(result as any).deleted || 0} category(s)`);
    } else {
      const errorMsg = (result as any).errors?.length
        ? (result as any).errors.join("\n")
        : result.error || "Failed to delete categories";
      alert(errorMsg);
      if ((result as any).deleted > 0) {
        setSelectedCategories(new Set());
        loadData();
      }
    }
  };

  const isAllAccountsSelected = accounts.length > 0 && selectedAccounts.size === accounts.length;
  const isAccountsIndeterminate =
    selectedAccounts.size > 0 && selectedAccounts.size < accounts.length;

  const isAllCategoriesSelected =
    categories.length > 0 && selectedCategories.size === categories.length;
  const isCategoriesIndeterminate =
    selectedCategories.size > 0 && selectedCategories.size < categories.length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/" className="p-2 hover:bg-slate-800 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* Accounts Section */}
      <section className="mb-12 relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">Accounts</h2>
            {accounts.length > 0 && (
              <button
                onClick={toggleSelectAllAccounts}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
              >
                {isAllAccountsSelected ? (
                  <CheckSquare size={18} className="text-emerald-400" />
                ) : isAccountsIndeterminate ? (
                  <div className="relative">
                    <Square size={18} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-sm" />
                    </div>
                  </div>
                ) : (
                  <Square size={18} />
                )}
                <span className="text-sm">
                  {selectedAccounts.size > 0
                    ? `${selectedAccounts.size} selected`
                    : "Select All"}
                </span>
              </button>
            )}
          </div>
          <button
            onClick={() => {
              resetAccountForm();
              setIsAccountModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 rounded-xl transition-colors"
          >
            <Plus size={16} />
            Add Account
          </button>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          {accounts.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No accounts yet. Add your first account to get started.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {accounts.map((account) => {
                const isSelected = selectedAccounts.has(account.id);
                return (
                  <div
                    key={account.id}
                    className={`p-4 flex items-center gap-3 transition-all ${
                      isSelected
                        ? "bg-emerald-500/10"
                        : "hover:bg-slate-800/50"
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleAccountSelection(account.id)}
                      className="flex-shrink-0 text-slate-400 hover:text-emerald-400 transition-colors"
                    >
                      {isSelected ? (
                        <CheckSquare size={20} className="text-emerald-400" />
                      ) : (
                        <Square size={20} />
                      )}
                    </button>

                    <div className="flex-1">
                      <p className="font-semibold text-white">{account.name}</p>
                      <p className="text-sm text-slate-500">
                        {account.type} • Rp {Number(account.balance).toLocaleString("id-ID")}
                        {account.type === "CREDIT_CARD" && account.creditLimit && (
                          <span className="ml-2">
                            (Limit: Rp {Number(account.creditLimit).toLocaleString("id-ID")})
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Individual Actions - Only show when not in bulk selection mode */}
                    {selectedAccounts.size === 0 && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditAccount(account)}
                          className="p-2 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(account.id)}
                          className="p-2 hover:bg-rose-500/20 rounded-full transition-colors text-slate-400 hover:text-rose-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bulk Action Bar for Accounts */}
        {selectedAccounts.size > 0 && (
          <div className="fixed bottom-4 left-4 right-4 bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-2xl flex items-center justify-between z-40 animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-3">
              <span className="text-white font-medium">
                {selectedAccounts.size} selected
              </span>
              <button
                onClick={clearAccountSelection}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
            <button
              onClick={() => setShowBulkConfirmAccounts(true)}
              disabled={isBulkDeletingAccounts}
              className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-500/50 text-white rounded-xl font-medium transition-colors"
            >
              <Trash size={18} />
              {isBulkDeletingAccounts ? "Deleting..." : "Delete Selected"}
            </button>
          </div>
        )}
      </section>

      {/* Categories Section */}
      <section className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">Categories</h2>
            {categories.length > 0 && (
              <button
                onClick={toggleSelectAllCategories}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
              >
                {isAllCategoriesSelected ? (
                  <CheckSquare size={18} className="text-emerald-400" />
                ) : isCategoriesIndeterminate ? (
                  <div className="relative">
                    <Square size={18} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-sm" />
                    </div>
                  </div>
                ) : (
                  <Square size={18} />
                )}
                <span className="text-sm">
                  {selectedCategories.size > 0
                    ? `${selectedCategories.size} selected`
                    : "Select All"}
                </span>
              </button>
            )}
          </div>
          <button
            onClick={() => {
              resetCategoryForm();
              setIsCategoryModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 rounded-xl transition-colors"
          >
            <Plus size={16} />
            Add Category
          </button>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          {categories.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No categories yet. Add your first category.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {categories.map((category) => {
                const isSelected = selectedCategories.has(category.id);
                return (
                  <div
                    key={category.id}
                    className={`p-4 flex items-center gap-3 transition-all ${
                      isSelected
                        ? "bg-emerald-500/10"
                        : "hover:bg-slate-800/50"
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleCategorySelection(category.id)}
                      className="flex-shrink-0 text-slate-400 hover:text-emerald-400 transition-colors"
                    >
                      {isSelected ? (
                        <CheckSquare size={20} className="text-emerald-400" />
                      ) : (
                        <Square size={20} />
                      )}
                    </button>

                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          category.color || "text-slate-400 bg-slate-800"
                        }`}
                      >
                        <Tag size={20} />
                      </div>
                      <span className="font-medium">{category.name}</span>
                    </div>

                    {/* Individual Actions - Only show when not in bulk selection mode */}
                    {selectedCategories.size === 0 && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="p-2 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="p-2 hover:bg-rose-500/20 rounded-full transition-colors text-slate-400 hover:text-rose-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bulk Action Bar for Categories */}
        {selectedCategories.size > 0 && (
          <div className="fixed bottom-4 left-4 right-4 bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-2xl flex items-center justify-between z-40 animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-3">
              <span className="text-white font-medium">
                {selectedCategories.size} selected
              </span>
              <button
                onClick={clearCategorySelection}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
            <button
              onClick={() => setShowBulkConfirmCategories(true)}
              disabled={isBulkDeletingCategories}
              className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-500/50 text-white rounded-xl font-medium transition-colors"
            >
              <Trash size={18} />
              {isBulkDeletingCategories ? "Deleting..." : "Delete Selected"}
            </button>
          </div>
        )}
      </section>

      {/* Bulk Delete Confirmation Modal - Accounts */}
      {showBulkConfirmAccounts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center">
                <Trash2 size={24} className="text-rose-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Delete Accounts</h3>
                <p className="text-slate-400 text-sm">
                  Are you sure you want to delete {selectedAccounts.size} account(s)?
                </p>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
              <p className="text-slate-300 text-sm">This action will:</p>
              <ul className="text-slate-400 text-sm mt-2 space-y-1 list-disc list-inside">
                <li>Soft-delete the selected accounts</li>
                <li>Accounts with transactions cannot be deleted</li>
                <li>Create audit log entries</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBulkConfirmAccounts(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDeleteAccounts}
                disabled={isBulkDeletingAccounts}
                className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-500/50 text-white rounded-xl font-medium transition-colors"
              >
                {isBulkDeletingAccounts ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal - Categories */}
      {showBulkConfirmCategories && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center">
                <Trash2 size={24} className="text-rose-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Delete Categories</h3>
                <p className="text-slate-400 text-sm">
                  Are you sure you want to delete {selectedCategories.size} category(s)?
                </p>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
              <p className="text-slate-300 text-sm">This action will:</p>
              <ul className="text-slate-400 text-sm mt-2 space-y-1 list-disc list-inside">
                <li>Permanently delete the selected categories</li>
                <li>Categories with transactions cannot be deleted</li>
                <li>This action cannot be undone</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBulkConfirmCategories(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDeleteCategories}
                disabled={isBulkDeletingCategories}
                className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-500/50 text-white rounded-xl font-medium transition-colors"
              >
                {isBulkDeletingCategories ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Modal */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-800">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h3 className="text-xl font-bold text-white">
                {editingAccount ? "Edit Account" : "New Account"}
              </h3>
              <button
                onClick={() => {
                  setIsAccountModalOpen(false);
                  resetAccountForm();
                }}
                className="p-2 hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="p-6 space-y-4">
              <div>
                <label className="text-slate-400 text-xs mb-2 block">Account Name</label>
                <input
                  type="text"
                  value={accountFormData.name}
                  onChange={(e) =>
                    setAccountFormData({ ...accountFormData, name: e.target.value })
                  }
                  placeholder="e.g., BCA, Cash Wallet"
                  className="w-full bg-slate-800 p-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 text-xs mb-2 block">Account Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {ACCOUNT_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() =>
                          setAccountFormData({
                            ...accountFormData,
                            type: type.value as any,
                          })
                        }
                        className={`p-3 rounded-xl flex items-center gap-2 transition-all ${
                          accountFormData.type === type.value
                            ? "bg-emerald-500 text-slate-900"
                            : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                        }`}
                      >
                        <Icon size={18} />
                        <span className="text-sm font-medium">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-xs mb-2 block">Current Balance</label>
                <input
                  type="number"
                  value={accountFormData.balance}
                  onChange={(e) =>
                    setAccountFormData({ ...accountFormData, balance: e.target.value })
                  }
                  placeholder="0"
                  className="w-full bg-slate-800 p-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              {accountFormData.type === "CREDIT_CARD" && (
                <>
                  <div>
                    <label className="text-slate-400 text-xs mb-2 block">
                      Credit Limit
                    </label>
                    <input
                      type="number"
                      value={accountFormData.creditLimit}
                      onChange={(e) =>
                        setAccountFormData({
                          ...accountFormData,
                          creditLimit: e.target.value,
                        })
                      }
                      placeholder="0"
                      className="w-full bg-slate-800 p-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-slate-400 text-xs mb-2 block">
                        Statement Day
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={accountFormData.statementDay}
                        onChange={(e) =>
                          setAccountFormData({
                            ...accountFormData,
                            statementDay: e.target.value,
                          })
                        }
                        placeholder="5"
                        className="w-full bg-slate-800 p-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                      <p className="text-slate-500 text-xs mt-1">Day of month</p>
                    </div>

                    <div>
                      <label className="text-slate-400 text-xs mb-2 block">Due Day</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={accountFormData.dueDay}
                        onChange={(e) =>
                          setAccountFormData({
                            ...accountFormData,
                            dueDay: e.target.value,
                          })
                        }
                        placeholder="15"
                        className="w-full bg-slate-800 p-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                      <p className="text-slate-500 text-xs mt-1">Day of month</p>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 p-3 rounded-xl">
                    <p className="text-slate-400 text-xs">
                      <strong className="text-slate-300">Example:</strong> Statement on
                      5th, Due on 15th = 10 days grace period
                    </p>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={isAccountSubmitting}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 disabled:cursor-not-allowed py-3 rounded-xl font-semibold text-slate-900 transition-colors"
              >
                {isAccountSubmitting
                  ? editingAccount
                    ? "Updating..."
                    : "Creating..."
                  : editingAccount
                  ? "Update Account"
                  : "Create Account"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-800">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h3 className="text-xl font-bold text-white">
                {editingCategory ? "Edit Category" : "New Category"}
              </h3>
              <button
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  resetCategoryForm();
                }}
                className="p-2 hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div>
                <label className="text-slate-400 text-xs mb-2 block">
                  Category Name
                </label>
                <input
                  type="text"
                  value={categoryFormData.name}
                  onChange={(e) =>
                    setCategoryFormData({ ...categoryFormData, name: e.target.value })
                  }
                  placeholder="e.g., FOOD, TRANSPORT"
                  className="w-full bg-slate-800 p-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50 uppercase"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 text-xs mb-2 block">Preview</label>
                <div
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${getCategoryColor(
                    categoryFormData.name || "OTHER"
                  )}`}
                >
                  <Tag size={16} />
                  <span className="font-medium">
                    {categoryFormData.name || "CATEGORY"}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isCategorySubmitting}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 disabled:cursor-not-allowed py-3 rounded-xl font-semibold text-slate-900 transition-colors"
              >
                {isCategorySubmitting
                  ? editingCategory
                    ? "Updating..."
                    : "Creating..."
                  : editingCategory
                  ? "Update Category"
                  : "Create Category"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
