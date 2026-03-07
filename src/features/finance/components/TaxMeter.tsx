// src/features/finance/components/TaxMeter.tsx
import { TrendingUp } from "lucide-react";
import { formatIDR } from "../lib/utils";

interface TaxMeterProps {
  yearlyIncome?: number;
  projectedTax?: number;
  paidTax?: number;
}

/**
 * Tax Projection Card
 * Shows estimated year-end tax based on income trends
 * Formula: (Current_Income * 12_Month_Projection) - Deductions
 */
export function TaxMeter({
  yearlyIncome = 0,
  projectedTax = 0,
  paidTax = 0,
}: TaxMeterProps) {
  // Calculate progress percentage
  const progress =
    projectedTax > 0 ? Math.min((paidTax / projectedTax) * 100, 100) : 0;

  // Simple tax estimation (Indonesia PPh 21 progressive rates simplified)
  const estimatedTax = yearlyIncome > 0 ? calculateIndonesianTax(yearlyIncome) : 0;

  return (
    <section className="glass-panel rounded-3xl p-6 mt-8 relative overflow-hidden group">
      {/* Subtle ambient amber glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -z-10 group-hover:bg-amber-500/10 transition-colors duration-500"></div>

      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-inner flex items-center justify-center">
            <TrendingUp size={24} className="text-amber-400" />
          </div>
          <div>
            <h3 className="text-zinc-100 font-bold text-lg tracking-tight">Tax Projection</h3>
            <p className="text-zinc-500 text-sm font-medium mt-0.5">Est. Year-End Liability</p>
          </div>
        </div>
      </div>

      {/* Projected Amount */}
      <div className="mb-8 relative z-10 bg-zinc-900/40 border border-white/5 rounded-2xl p-5 hover:bg-zinc-800/60 transition-colors">
        <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Estimated Amount</p>
        <p className="text-3xl font-bold tracking-tight text-amber-400 text-shadow-sm">
          <span className="text-sm mr-1 opacity-70">Rp</span>
          {Number(projectedTax || estimatedTax).toLocaleString('id-ID')}
        </p>
        <p className="text-xs text-zinc-500 mt-2 font-medium">
          Based on current income trends & Indonesian PPh 21
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-3 relative z-10">
        <div className="flex justify-between items-baseline">
          <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">Paid YTD</span>
          <span className="text-emerald-400 font-bold tracking-tight text-shadow-sm">
            {formatIDR(paidTax)}
          </span>
        </div>

        <div className="w-full bg-zinc-900 h-2.5 rounded-full overflow-hidden shadow-inner border border-white/5 relative">
          <div
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(52,211,153,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-end">
          <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
            {progress.toFixed(1)}% <span className="text-zinc-600 font-medium lowercase tracking-normal">of projected tax</span>
          </p>
        </div>
      </div>

      {/* Info Note */}
      <div className="mt-8 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl relative z-10">
        <p className="text-xs text-amber-200/80 font-medium leading-relaxed flex items-start gap-2">
          <span className="text-amber-400 mt-0.5">💡</span>
          <span>
            Set aside{" "}
            <strong className="text-amber-400 font-bold drop-shadow-sm mx-1">
              Rp {Number((projectedTax || estimatedTax) - paidTax).toLocaleString('id-ID')}
            </strong>{" "}
            for the upcoming tax season.
          </span>
        </p>
      </div>
    </section>
  );
}

/**
 * Simplified Indonesian PPh 21 progressive tax calculation
 * Based on 2024 tax brackets (UU HPP)
 */
function calculateIndonesianTax(yearlyIncome: number): number {
  const brackets = [
    { limit: 60000000, rate: 0.05 },
    { limit: 250000000, rate: 0.15 },
    { limit: 500000000, rate: 0.25 },
    { limit: 5000000000, rate: 0.3 },
    { limit: Infinity, rate: 0.35 },
  ];

  let tax = 0;
  let remainingIncome = yearlyIncome;
  let previousLimit = 0;

  // Apply tax-free threshold (PTKP) for single individual
  const ptkp = 54000000; // Basic tax-free allowance
  const taxableIncome = Math.max(0, yearlyIncome - ptkp);

  for (const bracket of brackets) {
    const bracketRange = bracket.limit - previousLimit;
    const incomeInBracket = Math.min(remainingIncome, bracketRange);

    if (incomeInBracket > 0) {
      tax += incomeInBracket * bracket.rate;
      remainingIncome -= incomeInBracket;
    }

    previousLimit = bracket.limit;

    if (remainingIncome <= 0) break;
  }

  return tax;
}

// Skeleton loader
export function TaxMeterSkeleton() {
  return (
    <section className="glass-panel rounded-3xl p-6 mt-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-zinc-800/50 rounded-2xl animate-pulse" />
        <div className="space-y-2">
          <div className="w-32 h-6 bg-zinc-800/50 rounded-md animate-pulse" />
          <div className="w-40 h-3 bg-zinc-800/50 rounded-md animate-pulse" />
        </div>
      </div>
      <div className="w-full h-24 bg-zinc-900/40 rounded-2xl animate-pulse mb-8 border border-white/5" />
      <div className="space-y-3">
        <div className="flex justify-between">
          <div className="w-16 h-3 bg-zinc-800/50 rounded-sm animate-pulse" />
          <div className="w-24 h-4 bg-zinc-800/50 rounded-sm animate-pulse" />
        </div>
        <div className="w-full h-2.5 bg-zinc-900/50 rounded-full animate-pulse border border-white/5" />
      </div>
    </section>
  );
}
