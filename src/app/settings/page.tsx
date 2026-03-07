// src/app/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Pencil, Trash2, Tag, Plus, X, Wallet, CreditCard, Smartphone, TrendingUp } from "lucide-react";
import Link from "next/link";
import { createAccount, updateAccount, deleteAccount } from "@/features/finance/server/account-actions";
import { createCategory, updateCategory, deleteCategory } from "@/features/finance/server/category-actions";
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
  });
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    color: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/settings-data");
      if (response.ok) {
        const data = await response.json();
        // Type assertion since API returns the correct shape
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
    const data = {
      name: accountFormData.name,
      type: accountFormData.type,
      balance: parseFloat(accountFormData.balance) || 0,
      creditLimit: accountFormData.creditLimit ? parseFloat(accountFormData.creditLimit) : undefined,
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
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setAccountFormData({
      name: account.name,
      type: account.type as any,
      balance: account.balance.toString(),
      creditLimit: account.creditLimit?.toString() || "",
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
    setAccountFormData({ name: "", type: "CASH", balance: "", creditLimit: "" });
    setEditingAccount(null);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
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
        <Link
          href="/"
          className="p-2 hover:bg-slate-800 rounded-full transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* Accounts Section */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Accounts</h2>
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
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
                >
                  <div>
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
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Categories Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Categories</h2>
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
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        category.color || "text-slate-400 bg-slate-800"
                      }`}
                    >
                      <Tag size={20} />
                    </div>
                    <span className="font-medium">{category.name}</span>
                  </div>
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
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

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
                <label className="text-slate-400 text-xs mb-2 block">
                  Account Name
                </label>
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
                <label className="text-slate-400 text-xs mb-2 block">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ACCOUNT_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() =>
                          setAccountFormData({ ...accountFormData, type: type.value as any })
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
                <label className="text-slate-400 text-xs mb-2 block">
                  Current Balance
                </label>
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
                <div>
                  <label className="text-slate-400 text-xs mb-2 block">
                    Credit Limit
                  </label>
                  <input
                    type="number"
                    value={accountFormData.creditLimit}
                    onChange={(e) =>
                      setAccountFormData({ ...accountFormData, creditLimit: e.target.value })
                    }
                    placeholder="0"
                    className="w-full bg-slate-800 p-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 py-3 rounded-xl font-semibold text-slate-900 transition-colors"
              >
                {editingAccount ? "Update Account" : "Create Account"}
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
                <label className="text-slate-400 text-xs mb-2 block">
                  Preview
                </label>
                <div
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                    getCategoryColor(categoryFormData.name || "OTHER")
                  }`}
                >
                  <Tag size={16} />
                  <span className="font-medium">{categoryFormData.name || "CATEGORY"}</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 py-3 rounded-xl font-semibold text-slate-900 transition-colors"
              >
                {editingCategory ? "Update Category" : "Create Category"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
