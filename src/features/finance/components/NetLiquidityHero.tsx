// src/features/finance/components/NetLiquidityHero.tsx
import { formatIDR } from "../lib/utils";

interface NetLiquidityHeroProps {
  netLiquidity: number;
  cashTotal: number;
  debtTotal: number;
}

export function NetLiquidityHero({
  netLiquidity,
  cashTotal,
  debtTotal,
}: NetLiquidityHeroProps) {
  const isPositive = netLiquidity >= 0;

  return (
    <section className="text-center py-10 px-6 bg-slate-900/50 rounded-3xl border border-slate-800 mb-8">
      <h2 className="text-slate-400 text-sm font-medium uppercase tracking-widest">
        Net Liquidity
      </h2>

      <div
        className={`text-5xl font-bold mt-2 ${
          isPositive ? "text-emerald-400" : "text-rose-400"
        }`}
      >
        {formatIDR(netLiquidity)}
      </div>

      <p className="text-xs text-slate-500 mt-2 italic">
        {isPositive ? "Real Money" : "You're in debt"}
      </p>

      {/* Mini breakdown */}
      <div className="flex justify-center gap-8 mt-6 text-xs">
        <div className="flex flex-col">
          <span className="text-slate-500">Cash & E-Wallets</span>
          <span className="text-emerald-400 font-semibold">
            {formatIDR(cashTotal)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-slate-500">Credit Card Debt</span>
          <span className="text-rose-400 font-semibold">
            {formatIDR(debtTotal)}
          </span>
        </div>
      </div>
    </section>
  );
}
