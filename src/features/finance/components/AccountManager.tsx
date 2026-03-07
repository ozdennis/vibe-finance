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
  statementDay?: number | null;
  dueDay?: number | null;
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
    statementDay: "",
    dueDay: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      name: formData.name,
      type: formData.type,
      balance: parseFloat(formData.balance) || 0,
      creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : undefined,
      statementDay: formData.statementDay ? parseInt(formData.statementDay) : undefined,
      dueDay: formData.dueDay ? parseInt(formData.dueDay) : undefined,
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
      statementDay: account.statementDay?.toString() || "",
      dueDay: account.dueDay?.toString() || "",
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
    setFormData({ name: "", type: "CASH", balance: "", creditLimit: "", statementDay: "", dueDay: "" });
    setEditingAccount(null);
  };

  const openNewAccountModal = () => {
    resetForm();
    setIsOpen(true);
  };

  return (
    <>
      <section className="glass-panel rounded-3xl p-6 relative">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-zinc-100 font-bold tracking-tight text-lg">Your Vaults</h3>
            <p className="text-sm text-zinc-500 font-medium tracking-wide mt-1">Manage active financial accounts</p>
          </div>
          <button
            onClick={openNewAccountModal}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-full font-bold tracking-wide transition-all active:scale-95 border border-indigo-500/20"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add Vault</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((account) => (
            <div
              key={account.id}
              className={`group flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${editingAccount?.id === account.id
                  ? "bg-indigo-500/10 border-indigo-500/30"
                  : "bg-zinc-900/40 hover:bg-zinc-800/80 border-transparent hover:border-white/5 active:scale-[0.99] active:duration-75"
                }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-white/5 shadow-inner flex items-center justify-center flex-shrink-0">
                  {ACCOUNT_TYPES.find(t => t.value === account.type)?.icon({ size: 24, className: "text-zinc-400" })}
                </div>
                <div>
                  <p className="text-zinc-100 font-semibold tracking-tight">{account.name}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mt-0.5">
                    {account.type.replace("_", " ")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-bold text-zinc-100 tracking-tight">
                    Rp {Number(account.balance).toLocaleString('id-ID')}
                  </p>
                  {account.creditLimit && (
                    <p className="text-xs text-zinc-500 font-medium">
                      Limit: Rp {Number(account.creditLimit).toLocaleString('id-ID')}
                    </p>
                  )}
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEdit(account); }}
                    className="p-2 bg-zinc-800/0 hover:bg-zinc-700/50 rounded-full transition-all text-zinc-400 hover:text-white"
                    aria-label="Edit account"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(account.id); }}
                    className="p-2 bg-rose-500/0 hover:bg-rose-500/10 rounded-full transition-all text-zinc-400 hover:text-rose-400"
                    aria-label="Delete account"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md">
          <div className="glass-panel rounded-3xl w-full max-w-md border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-zinc-900/40">
              <h3 className="text-xl font-bold text-white tracking-tight">
                {editingAccount ? "Edit Vault" : "New Vault"}
              </h3>
              <button
                onClick={() => {
                  setIsOpen(false);
                  resetForm();
                }}
                className="p-2 hover:bg-zinc-800 rounded-full transition-all active:scale-95 text-zinc-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
              <div>
                <label className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-3 block">
                  Account Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g. BCA, OVO"
                  className="w-full bg-zinc-900/50 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-zinc-600"
                  required
                />
              </div>

              <div>
                <label className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-3 block">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {ACCOUNT_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, type: type.value as any })
                        }
                        className={`p-4 rounded-2xl flex items-center gap-3 transition-all border ${formData.type === type.value
                          ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                          : "bg-zinc-900/40 border-transparent text-zinc-500 hover:bg-zinc-800 hover:text-white"
                          }`}
                      >
                        <Icon size={20} />
                        <span className="text-sm font-bold tracking-wide">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-3 block">
                  Current Balance <span className="text-zinc-600 font-normal normal-case ml-1">(IDR)</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.balance}
                  onChange={(e) =>
                    setFormData({ ...formData, balance: e.target.value })
                  }
                  placeholder="0"
                  className="w-full bg-zinc-900/50 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-lg placeholder:text-zinc-600"
                />
              </div>

              {formData.type === "CREDIT_CARD" && (
                <div className="space-y-5 border-t border-white/5 pt-5">
                  <div>
                    <label className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-3 block">
                      Credit Limit <span className="text-zinc-600 font-normal normal-case ml-1">(IDR)</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.creditLimit}
                      onChange={(e) =>
                        setFormData({ ...formData, creditLimit: e.target.value })
                      }
                      placeholder="0"
                      className="w-full bg-zinc-900/50 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-lg placeholder:text-zinc-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-3 block">
                        Statement Day
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={formData.statementDay}
                        onChange={(e) =>
                          setFormData({ ...formData, statementDay: e.target.value })
                        }
                        placeholder="5"
                        className="w-full bg-zinc-900/50 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-zinc-600"
                      />
                      <p className="text-zinc-500 text-xs font-medium mt-2">Day of month (1-31)</p>
                    </div>

                    <div>
                      <label className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-3 block">
                        Due Day
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={formData.dueDay}
                        onChange={(e) =>
                          setFormData({ ...formData, dueDay: e.target.value })
                        }
                        placeholder="15"
                        className="w-full bg-zinc-900/50 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-zinc-600"
                      />
                      <p className="text-zinc-500 text-xs font-medium mt-2">Day of month (1-31)</p>
                    </div>
                  </div>

                  <div className="bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-2xl">
                    <p className="text-indigo-300 text-xs font-medium leading-relaxed">
                      <strong className="text-indigo-200">Example:</strong> Statement on 5th, Due on 15th amounts to a 10-day grace period for payments.
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full bg-indigo-500 hover:bg-indigo-400 py-5 rounded-2xl font-bold tracking-wide text-white active:scale-95 transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)]"
                >
                  {editingAccount ? "Update Vault" : "Create Vault"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
