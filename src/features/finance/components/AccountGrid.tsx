// src/features/finance/components/AccountGrid.tsx
import { Wallet, CreditCard, Smartphone, TrendingUp } from "lucide-react";
import { formatIDR } from "../lib/utils";
import { Decimal } from "@prisma/client/runtime/library";

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number | Decimal;
  creditLimit?: number | Decimal | null;
}

interface AccountGridProps {
  accounts: Account[];
}

function getAccountIcon(type: string) {
  switch (type) {
    case "CASH":
      return <Wallet size={20} className="text-emerald-400" />;
    case "E_WALLET":
      return <Smartphone size={20} className="text-blue-400" />;
    case "CREDIT_CARD":
      return <CreditCard size={20} className="text-rose-400" />;
    case "INVESTMENT":
      return <TrendingUp size={20} className="text-purple-400" />;
    default:
      return <Wallet size={20} className="text-slate-400" />;
  }
}

function getAccountColor(type: string) {
  switch (type) {
    case "CASH":
      return "border-emerald-500/20 group-hover:border-emerald-500/40";
    case "E_WALLET":
      return "border-indigo-500/20 group-hover:border-indigo-500/40";
    case "CREDIT_CARD":
      return "border-rose-500/20 group-hover:border-rose-500/40";
    case "INVESTMENT":
      return "border-violet-500/20 group-hover:border-violet-500/40";
    default:
      return "border-white/5 group-hover:border-white/20";
  }
}

// Helper to convert Decimal to number
const toNumber = (val: number | Decimal | null | undefined): number => {
  if (val == null) return 0;
  if (typeof val === "number") return val;
  return val.toNumber();
};

export function AccountGrid({ accounts }: AccountGridProps) {
  // Filter out INVESTMENT accounts - they're shown in InvestmentShelf
  const liquidAccounts = accounts.filter(a => a.type !== "INVESTMENT");

  if (liquidAccounts.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        No accounts yet. Add your first account to get started.
      </div>
    );
  }

  // Group accounts by type
  const groupedAccounts = liquidAccounts.reduce((acc, account) => {
    if (!acc[account.type]) {
      acc[account.type] = [];
    }
    acc[account.type].push(account);
    return acc;
  }, {} as Record<string, Account[]>);

  // Preferred order of categories for presentation
  const typeOrder = ["CASH", "E_WALLET", "CREDIT_CARD", "INVESTMENT"];
  const sortedTypes = Object.keys(groupedAccounts).sort((a, b) => {
    const indexA = typeOrder.indexOf(a);
    const indexB = typeOrder.indexOf(b);
    return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
  });

  const getCategoryLabel = (type: string) => {
    switch (type) {
      case "CASH": return "Cash & Bank Accounts";
      case "E_WALLET": return "E-Wallets & Digital";
      case "CREDIT_CARD": return "Credit Cards";
      case "INVESTMENT": return "Investments & Wealth";
      default: return type.replace("_", " ");
    }
  };

  return (
    <div className="space-y-8 mt-2">
      {sortedTypes.map((type, index) => (
        <div
          key={type}
          className="animate-in fade-in slide-in-from-bottom-4"
          style={{ animationDuration: `${(index + 1) * 300}ms` }}
        >
          <div className="flex items-center gap-3 mb-5 px-1">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em]">{getCategoryLabel(type)}</h3>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {groupedAccounts[type].map((account) => (
              <div
                key={account.id}
                className={`group p-6 rounded-3xl border interactive-card ${getAccountColor(
                  account.type
                )} relative overflow-hidden flex flex-col`}
              >
                {/* Subtle background glow based on account type */}
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-white/5 rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>

                <div className="flex items-center gap-3 mb-6 relative z-10">
                  <div className="p-2.5 bg-zinc-800/80 rounded-xl border border-white/5 shadow-inner">
                    {getAccountIcon(account.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-100 font-semibold text-lg tracking-tight leading-tight truncate">{account.name}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mt-0.5">
                      {account.type.replace("_", " ")}
                    </p>
                  </div>
                </div>

                <div className="mb-1 relative z-10 mt-auto">
                  <p className="text-3xl font-bold tracking-tighter text-white truncate">
                    {formatIDR(toNumber(account.balance))}
                  </p>
                </div>

                {account.type === "CREDIT_CARD" && account.creditLimit && (
                  <div className="mt-5 border-t border-white/5 pt-4 relative z-10">
                    <div className="flex justify-between text-[11px] mb-2 font-medium tracking-wide">
                      <span className="text-zinc-500">Available Limit</span>
                      <span className="text-emerald-400">
                        {formatIDR(Math.max(0, toNumber(account.creditLimit) - toNumber(account.balance)))}
                      </span>
                    </div>
                    <div className="w-full bg-zinc-950/50 h-2 rounded-full overflow-hidden shadow-inner border border-white/5">
                      <div
                        className="bg-gradient-to-r from-rose-600 to-rose-400 h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${Math.min(100, Math.max(0, (toNumber(account.balance) / toNumber(account.creditLimit)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AccountGridSkeleton() {
  return (
    <div className="space-y-8 mt-2">
      {[1, 2].map((section) => (
        <div key={section}>
          <div className="flex items-center gap-3 mb-5 px-1">
            <div className="w-32 h-3 bg-zinc-800/50 rounded-md animate-pulse"></div>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-white/5 to-transparent"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-zinc-900/40 p-6 rounded-3xl border border-white/5 relative overflow-hidden h-[160px]"
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>

                <div className="flex items-center gap-3 mb-6 relative z-10">
                  <div className="w-10 h-10 bg-zinc-800/50 rounded-xl animate-pulse" />
                  <div className="space-y-2">
                    <div className="w-24 h-4 bg-zinc-800/50 rounded-md animate-pulse" />
                    <div className="w-16 h-2 bg-zinc-800/50 rounded-md animate-pulse" />
                  </div>
                </div>
                <div className="w-32 h-8 bg-zinc-800/50 rounded-lg animate-pulse mt-auto relative z-10" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
