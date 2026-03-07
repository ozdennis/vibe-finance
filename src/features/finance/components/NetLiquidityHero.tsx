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
    <section className="relative group interactive-card rounded-3xl p-8 md:p-12 mb-10 overflow-hidden flex flex-col items-center justify-center min-h-[300px]">
      {/* Background glow effects */}
      <div className={`absolute -inset-x-20 top-0 h-[1px] bg-gradient-to-r from-transparent ${isPositive ? 'via-emerald-500/30' : 'via-rose-500/30'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700`}></div>
      <div className={`absolute inset-0 bg-gradient-to-b ${isPositive ? 'from-emerald-500/5' : 'from-rose-500/5'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        <h2 className="text-zinc-400 text-sm font-medium uppercase tracking-[0.2em] mb-4">
          Net Liquidity
        </h2>

        <div className="relative">
          <div className={`text-5xl md:text-7xl font-bold tracking-tighter ${isPositive ? "text-emerald-400 text-glow-emerald" : "text-rose-400 text-glow-rose"} transition-all duration-300`}>
            {formatIDR(netLiquidity)}
          </div>
        </div>

        <p className="text-sm text-zinc-500 mt-4 font-light tracking-wide">
          {isPositive ? "Verified Real Money" : "Currently in Debt"}
        </p>

        {/* Breakdown Panel */}
        <div className="flex flex-row justify-center items-center gap-8 md:gap-16 mt-10 pt-8 border-t border-white/5 w-full max-w-lg">
          <div className="flex flex-col items-center">
            <span className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Liquid Assets</span>
            <span className="text-emerald-400 font-medium text-lg tracking-tight">
              {formatIDR(cashTotal)}
            </span>
          </div>

          <div className="h-10 w-[1px] bg-white/5"></div>

          <div className="flex flex-col items-center">
            <span className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Credit Debt</span>
            <span className="text-rose-400 font-medium text-lg tracking-tight">
              {formatIDR(debtTotal)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
