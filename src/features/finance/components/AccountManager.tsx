// src/features/finance/components/AccountManager.tsx
"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X, Wallet, CreditCard, Smartphone, TrendingUp } from "lucide-react";
import { createAccount, updateAccount, deleteAccount } from "../server/account-actions";

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  creditLimit?: number | null;
}

interface AccountManagerProps {
  accounts: Account[];
  userId: string;
}

const ACCOUNT_TYPES = [
  { value: "CASH", label: "Cash", icon: Wallet },
  { value: "E_WALLET", label: "E-Wallet", icon: Smartphone },
  { value: "CREDIT_CARD", label: "Credit Card", icon: CreditCard },
  { value: "INVESTMENT", label: "Investment", icon: TrendingUp },
];

export function AccountManager({ accounts, userId }: AccountManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "CASH" as "CASH" | "E_WALLET" | "CREDIT_CARD" | "INVESTMENT",
    balance: "",
    creditLimit: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      name: formData.name,
      type: formData.type,
      balance: parseFloat(formData.balance) || 0,
      creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : undefined,
      userId,
    };

    let result;
    if (editingAccount) {
      result = await updateAccount({ ...data, id: editingAccount.id });
    } else {
      result = await createAccount(data);
    }

    if (result?.success) {
      resetForm();
      setIsOpen(false);
    } else {
      alert(result?.error || "Failed to save account");
    }
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      type: account.type as any,
      balance: account.balance.toString(),
      creditLimit: account.creditLimit?.toString() || "",
    });
    setIsOpen(true);
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm("Are you sure? This will soft-delete the account.")) return;

    const result = await deleteAccount(accountId, userId);
    if (!result?.success) {
      alert(result?.error || "Failed to delete account");
    }
  };

  const resetForm = () => {
    setFormData({ name: "", type: "CASH", balance: "", creditLimit: "" });
    setEditingAccount(null);
  };

  const openNewAccountModal = () => {
    resetForm();
    setIsOpen(true);
  };

  return (
    <>
      <button
        onClick={openNewAccountModal}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 rounded-xl transition-colors"
      >
        <Plus size={16} />
        Add Account
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-800">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h3 className="text-xl font-bold text-white">
                {editingAccount ? "Edit Account" : "New Account"}
              </h3>
              <button
                onClick={() => {
                  setIsOpen(false);
                  resetForm();
                }}
                className="p-2 hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-slate-400 text-xs mb-2 block">
                  Account Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
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
                          setFormData({ ...formData, type: type.value as any })
                        }
                        className={`p-3 rounded-xl flex items-center gap-2 transition-all ${
                          formData.type === type.value
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
                  value={formData.balance}
                  onChange={(e) =>
                    setFormData({ ...formData, balance: e.target.value })
                  }
                  placeholder="0"
                  className="w-full bg-slate-800 p-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              {formData.type === "CREDIT_CARD" && (
                <div>
                  <label className="text-slate-400 text-xs mb-2 block">
                    Credit Limit
                  </label>
                  <input
                    type="number"
                    value={formData.creditLimit}
                    onChange={(e) =>
                      setFormData({ ...formData, creditLimit: e.target.value })
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
    </>
  );
}
