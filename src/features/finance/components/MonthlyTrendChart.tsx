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
      <section className="glass-panel rounded-3xl p-6 mt-8 relative overflow-hidden group">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -z-10 group-hover:bg-indigo-500/10 transition-colors duration-500"></div>
        <div className="relative z-10">
          <h3 className="text-zinc-100 font-bold text-lg tracking-tight mb-4">Monthly Trend</h3>
          <div className="text-center py-12 px-4 bg-zinc-900/40 rounded-2xl border border-white/5 border-dashed">
            <TrendingUp className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400 font-medium">No transaction data yet</p>
            <p className="text-zinc-500 text-xs mt-1">Start logging to see your financial trends</p>
          </div>
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
    <section className="glass-panel rounded-3xl p-6 mt-8 relative overflow-hidden group">
      {/* Subtle blue/indigo ambient glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -z-10 group-hover:bg-indigo-500/10 transition-colors duration-500"></div>

      <div className="flex items-center justify-between mb-8 relative z-10">
        <div>
          <h3 className="text-zinc-100 font-bold text-lg tracking-tight">Monthly Trend</h3>
          <p className="text-zinc-500 text-sm font-medium mt-0.5">Income vs Expense tracking</p>
        </div>
        <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest font-bold">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
            <span className="text-zinc-400 hover:text-white transition-colors">Income</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]" />
            <span className="text-zinc-400 hover:text-white transition-colors">Expense</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 relative z-10">
        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-4 hover:bg-zinc-800/60 transition-colors">
          <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Total Income
          </p>
          <p className="text-xl font-bold tracking-tight text-zinc-100">
            <span className="text-emerald-400 text-sm mr-1">Rp</span>
            {Number(totalIncome).toLocaleString('id-ID')}
          </p>
        </div>
        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-4 hover:bg-zinc-800/60 transition-colors">
          <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Total Expense
          </p>
          <p className="text-xl font-bold tracking-tight text-zinc-100">
            <span className="text-rose-400 text-sm mr-1">Rp</span>
            {Number(totalExpense).toLocaleString('id-ID')}
          </p>
        </div>
        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-4 hover:bg-zinc-800/60 transition-colors relative overflow-hidden">
          {/* subtle background hue based on net savings */}
          <div className={`absolute inset-0 opacity-10 ${netSavings >= 0 ? 'bg-emerald-500' : 'bg-rose-500'} pointer-events-none`}></div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 relative z-10">Net Savings</p>
          <p className={`text-xl font-bold tracking-tight relative z-10 ${netSavings >= 0 ? "text-emerald-400 text-shadow-sm" : "text-rose-400 text-shadow-sm"}`}>
            <span className="text-sm mr-1 opacity-70">Rp</span>
            {Number(netSavings).toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="space-y-6 relative z-10 font-mono">
        {trendData.map((data) => (
          <div key={data.month} className="group/row">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-zinc-300 font-bold text-sm tracking-tight">{getMonthLabel(data.month)}</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold font-sans">
                {data.income > 0 ? ((data.expense / data.income) * 100).toFixed(0) : 0}% spent
              </span>
            </div>

            {/* Bars container */}
            <div className="relative h-10 bg-zinc-900/50 rounded-xl overflow-hidden shadow-inner border border-white/5">
              {/* Income bar (background) */}
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-600/30 to-emerald-500/20 transition-all duration-1000 ease-out border-r border-emerald-500/30"
                style={{ width: `${(data.income / maxValue) * 100}%` }}
              />

              {/* Expense bar (foreground) */}
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-rose-600/50 to-rose-500/40 transition-all duration-1000 ease-out border-r border-rose-500/50"
                style={{ width: `${(data.expense / maxValue) * 100}%` }}
              />

              {/* Labels - inside bars for clean look */}
              <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
                <span className={`text-[11px] font-bold ${data.income > 0 ? 'text-emerald-100/90 text-shadow-sm' : 'text-transparent'}`}>
                  {formatIDR(data.income)}
                </span>
                <span className={`text-[11px] font-bold ${data.expense > 0 ? 'text-rose-100/90 text-shadow-sm' : 'text-transparent'}`}>
                  {formatIDR(data.expense)}
                </span>
              </div>

              {/* Hover overlay hint */}
              <div className="absolute inset-0 bg-white/0 group-hover/row:bg-white/[0.02] transition-colors pointer-events-none"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Savings Rate Indicator */}
      <div className="mt-8 pt-6 border-t border-white/5 relative z-10">
        <div className="flex items-center justify-between bg-zinc-900/30 p-4 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${savingsRate >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
              {savingsRate >= 0 ? (
                <TrendingUp size={20} />
              ) : (
                <TrendingDown size={20} />
              )}
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 block mb-0.5">Average Savings Rate</span>
              <p className="text-xs text-zinc-400 font-medium font-sans">
                {savingsRate >= 20
                  ? "🎉 Excellent health status"
                  : savingsRate >= 10
                    ? "👍 Good progression"
                    : "⚠️ Attention required"}
              </p>
            </div>
          </div>
          <span className={`text-2xl font-bold tracking-tight ${savingsRate >= 0 ? "text-emerald-400 text-shadow-sm" : "text-rose-400 text-shadow-sm"}`}>
            {savingsRate.toFixed(1)}%
          </span>
        </div>
      </div>
    </section>
  );
}

// Skeleton loader
export function MonthlyTrendChartSkeleton() {
  return (
    <section className="glass-panel rounded-3xl p-6 mt-8">
      <div className="flex items-center justify-between mb-8">
        <div className="w-40 h-6 bg-zinc-800/50 rounded-md animate-pulse" />
        <div className="flex items-center gap-4">
          <div className="w-16 h-3 bg-zinc-800/50 rounded-sm animate-pulse" />
          <div className="w-16 h-3 bg-zinc-800/50 rounded-sm animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-zinc-900/40 rounded-2xl p-4 border border-white/5">
            <div className="w-24 h-3 bg-zinc-800/50 rounded-sm animate-pulse mb-3" />
            <div className="w-32 h-6 bg-zinc-800/50 rounded-md animate-pulse" />
          </div>
        ))}
      </div>
      <div className="space-y-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="space-y-3">
            <div className="flex justify-between">
              <div className="w-16 h-4 bg-zinc-800/50 rounded-sm animate-pulse" />
              <div className="w-12 h-3 bg-zinc-800/50 rounded-sm animate-pulse" />
            </div>
            <div className="h-10 bg-zinc-900/50 rounded-xl animate-pulse border border-white/5" />
          </div>
        ))}
      </div>
    </section>
  );
}
