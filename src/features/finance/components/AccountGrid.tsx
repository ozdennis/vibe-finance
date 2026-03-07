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
      return "border-emerald-500/30";
    case "E_WALLET":
      return "border-blue-500/30";
    case "CREDIT_CARD":
      return "border-rose-500/30";
    case "INVESTMENT":
      return "border-purple-500/30";
    default:
      return "border-slate-700";
  }
}

// Helper to convert Decimal to number
const toNumber = (val: number | Decimal | null | undefined): number => {
  if (val == null) return 0;
  if (typeof val === "number") return val;
  return val.toNumber();
};

export function AccountGrid({ accounts }: AccountGridProps) {
  if (accounts.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        No accounts yet. Add your first account to get started.
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory -mx-4 px-4 scrollbar-hide">
      {accounts.map((account) => (
        <div
          key={account.id}
          className={`flex-shrink-0 w-72 bg-slate-900 p-5 rounded-2xl border ${getAccountColor(
            account.type
          )} snap-start`}
        >
          <div className="flex items-center gap-3 mb-4">
            {getAccountIcon(account.type)}
            <div>
              <p className="text-white font-semibold">{account.name}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                {account.type.replace("_", " ")}
              </p>
            </div>
          </div>

          <div className="mb-2">
            <p className="text-2xl font-bold text-white">
              {formatIDR(toNumber(account.balance))}
            </p>
          </div>

          {account.type === "CREDIT_CARD" && account.creditLimit && (
            <div className="mt-3 pt-3 border-t border-slate-800">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Available</span>
                <span className="text-emerald-400 font-medium">
                  {formatIDR(toNumber(account.creditLimit) - toNumber(account.balance))}
                </span>
              </div>
              <div className="mt-2 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full transition-all"
                  style={{
                    width: `${
                      (toNumber(account.balance) / toNumber(account.creditLimit)) * 100
                    }%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Skeleton loader for loading states
export function AccountGridSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex-shrink-0 w-72 bg-slate-900 p-5 rounded-2xl border border-slate-800 snap-start"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-5 h-5 bg-slate-800 rounded animate-pulse" />
            <div className="space-y-2">
              <div className="w-24 h-4 bg-slate-800 rounded animate-pulse" />
              <div className="w-16 h-3 bg-slate-800 rounded animate-pulse" />
            </div>
          </div>
          <div className="w-32 h-8 bg-slate-800 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}
