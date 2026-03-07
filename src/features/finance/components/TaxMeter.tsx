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
    <section className="bg-slate-900/50 rounded-3xl border border-slate-800 p-6 mt-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-amber-500" />
          <h3 className="text-white font-semibold">Tax Projection</h3>
        </div>
        <span className="text-xs text-slate-500">Est. Year-End</span>
      </div>

      {/* Projected Amount */}
      <div className="mb-4">
        <p className="text-3xl font-bold text-amber-500">
          {formatIDR(projectedTax || estimatedTax)}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Based on current income trends
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Paid YTD</span>
          <span className="text-emerald-400 font-medium">
            {formatIDR(paidTax)}
          </span>
        </div>
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 text-right">
          {progress.toFixed(1)}% of projected tax
        </p>
      </div>

      {/* Info Note */}
      <div className="mt-4 p-3 bg-slate-800/50 rounded-xl">
        <p className="text-xs text-slate-400">
          💡 Set aside{" "}
          <span className="text-amber-400 font-semibold">
            {formatIDR((projectedTax || estimatedTax) - paidTax)}
          </span>{" "}
          for tax season
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
    <section className="bg-slate-900/50 rounded-3xl border border-slate-800 p-6 mt-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-5 h-5 bg-slate-800 rounded animate-pulse" />
        <div className="w-32 h-5 bg-slate-800 rounded animate-pulse" />
      </div>
      <div className="w-40 h-10 bg-slate-800 rounded animate-pulse mb-4" />
      <div className="w-full h-2 bg-slate-800 rounded animate-pulse" />
    </section>
  );
}
