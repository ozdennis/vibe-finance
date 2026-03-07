// src/features/finance/components/MonthlyTrendChart.tsx
import { getMonthlyTrend } from "../server/queries";
import { formatIDR } from "../lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface MonthlyTrendChartProps {
  userId: string;
  months?: number;
}

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
}

export async function MonthlyTrendChart({ userId, months = 6 }: MonthlyTrendChartProps) {
  let trendData: MonthlyData[] = [];

  try {
    trendData = await getMonthlyTrend(userId, months);
  } catch (error) {
    console.error("Failed to load monthly trend:", error);
  }

  if (trendData.length === 0) {
    return (
      <section className="bg-slate-900/50 rounded-3xl border border-slate-800 p-6 mt-8">
        <h3 className="text-white font-semibold mb-4">Monthly Trend</h3>
        <div className="text-center py-8 text-slate-500 text-sm">
          No transaction data yet. Start logging to see trends.
        </div>
      </section>
    );
  }

  // Calculate max value for scaling
  const maxValue = Math.max(
    ...trendData.map((d) => Math.max(d.income, d.expense)),
    1
  );

  // Calculate totals
  const totalIncome = trendData.reduce((acc, d) => acc + d.income, 0);
  const totalExpense = trendData.reduce((acc, d) => acc + d.expense, 0);
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100) : 0;

  // Get month labels (short format)
  const getMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-US", { month: "short" });
  };

  return (
    <section className="bg-slate-900/50 rounded-3xl border border-slate-800 p-6 mt-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white font-semibold">Monthly Trend</h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-slate-400">Income</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500" />
            <span className="text-slate-400">Expense</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800/50 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Total Income</p>
          <p className="text-lg font-bold text-emerald-400">{formatIDR(totalIncome)}</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Total Expense</p>
          <p className="text-lg font-bold text-rose-400">{formatIDR(totalExpense)}</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Net Savings</p>
          <p className={`text-lg font-bold ${netSavings >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {formatIDR(netSavings)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="space-y-4">
        {trendData.map((data) => (
          <div key={data.month} className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-medium">{getMonthLabel(data.month)}</span>
              <span className="text-slate-500">
                {data.income > 0 ? ((data.expense / data.income) * 100).toFixed(0) : 0}% spent
              </span>
            </div>
            
            {/* Bars container */}
            <div className="relative h-8 bg-slate-800/50 rounded-lg overflow-hidden">
              {/* Income bar (background) */}
              <div
                className="absolute left-0 top-0 h-full bg-emerald-500/30 rounded-lg transition-all duration-500"
                style={{ width: `${(data.income / maxValue) * 100}%` }}
              />
              
              {/* Expense bar (foreground) */}
              <div
                className="absolute left-0 top-0 h-full bg-rose-500/60 rounded-lg transition-all duration-500"
                style={{ width: `${(data.expense / maxValue) * 100}%` }}
              />
              
              {/* Labels */}
              <div className="absolute inset-0 flex items-center justify-between px-3">
                <span className="text-xs font-semibold text-emerald-300 drop-shadow">
                  {formatIDR(data.income)}
                </span>
                <span className="text-xs font-semibold text-rose-200 drop-shadow">
                  {formatIDR(data.expense)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Savings Rate Indicator */}
      <div className="mt-6 pt-6 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {savingsRate >= 0 ? (
              <TrendingUp size={20} className="text-emerald-400" />
            ) : (
              <TrendingDown size={20} className="text-rose-400" />
            )}
            <span className="text-sm text-slate-400">Savings Rate</span>
          </div>
          <span className={`text-xl font-bold ${savingsRate >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {savingsRate.toFixed(1)}%
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {savingsRate >= 20 
            ? "🎉 Great job! You're saving more than 20%"
            : savingsRate >= 10
            ? "👍 Good start! Aim for 20% savings rate"
            : "⚠️ Try to reduce expenses and save more"}
        </p>
      </div>
    </section>
  );
}

// Skeleton loader
export function MonthlyTrendChartSkeleton() {
  return (
    <section className="bg-slate-900/50 rounded-3xl border border-slate-800 p-6 mt-8">
      <div className="flex items-center justify-between mb-6">
        <div className="w-32 h-5 bg-slate-800 rounded animate-pulse" />
        <div className="flex items-center gap-4">
          <div className="w-20 h-3 bg-slate-800 rounded animate-pulse" />
          <div className="w-20 h-3 bg-slate-800 rounded animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-800/50 rounded-xl p-4">
            <div className="w-20 h-3 bg-slate-800 rounded animate-pulse mb-2" />
            <div className="w-24 h-6 bg-slate-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="space-y-2">
            <div className="w-16 h-4 bg-slate-800 rounded animate-pulse" />
            <div className="h-8 bg-slate-800 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    </section>
  );
}
