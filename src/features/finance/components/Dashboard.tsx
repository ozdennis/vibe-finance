// src/features/finance/components/Dashboard.tsx
import { Suspense } from "react";
import { getNetLiquidity, getCategories, getYearToDateSummary, getMonthlyTrend, getRecentTransactions, getAllCreditCardStatus } from "../server/queries";
import { NetLiquidityHero } from "./NetLiquidityHero";
import { AccountGrid, AccountGridSkeleton } from "./AccountGrid";
import { TaxMeter, TaxMeterSkeleton } from "./TaxMeter";
import { MonthlyTrendChart, MonthlyTrendChartSkeleton } from "./MonthlyTrendChart";
import { TransactionHistory, TransactionHistorySkeleton } from "./TransactionHistory";
import { CreditCardWidget, CreditCardWidgetSkeleton } from "./CreditCardWidget";
import { QuickLogDrawer } from "./QuickLogDrawer";
import { PWAProvider } from "./PWAProvider";
import { ErrorBoundary } from "./ErrorBoundary";
import { Settings } from "lucide-react";
import Link from "next/link";
import { calculateIndonesianTax } from "../lib/utils";

interface DashboardProps {
  userId: string;
}

// Force dynamic rendering - NO CACHING
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function Dashboard({ userId }: DashboardProps) {
  let accounts: {
    id: string;
    name: string;
    type: string;
    balance: number;
    creditLimit?: number | null;
  }[] = [];
  let netLiquidity = 0;
  let cashTotal = 0;
  let debtTotal = 0;
  let categories: { id: string; name: string }[] = [];
  let yearlyIncome = 0;
  let projectedTax = 0;
  let paidTax = 0;
  let transactions: any[] = [];
  let creditCards: any[] = [];

  try {
    const [liquidityData, categoriesData, taxData, trendData, transactionsData, creditCardData] = await Promise.all([
      getNetLiquidity(userId),
      getCategories(userId),
      getYearToDateSummary(userId),
      getMonthlyTrend(userId, 6),
      getRecentTransactions(userId, 10),
      getAllCreditCardStatus(userId),
    ]);
    accounts = liquidityData.accounts;
    netLiquidity = liquidityData.netLiquidity;
    cashTotal = liquidityData.cashTotal;
    debtTotal = liquidityData.debtTotal;
    categories = categoriesData;
    yearlyIncome = taxData.totalIncome;
    transactions = transactionsData;
    creditCards = creditCardData;

    // Calculate projected tax using monthly trends
    const monthlyIncomes = trendData.map(m => m.income);

    // Use last month's income to project yearly
    let projectedYearlyIncome = yearlyIncome * 2; // Default: double current 6-month income

    if (monthlyIncomes.length >= 2) {
      const lastMonthIncome = monthlyIncomes[monthlyIncomes.length - 1];
      projectedYearlyIncome = lastMonthIncome * 12;
    }

    // Calculate Indonesian tax (PPh 21) with PTKP
    projectedTax = calculateIndonesianTax(projectedYearlyIncome);
    paidTax = 0; // Would track actual tax payments in a real app
  } catch (error) {
    console.error("Failed to load dashboard data:", error);
    // Use empty state - ErrorBoundary will handle display
  }

  // Fallback categories if none found
  if (categories.length === 0) {
    categories = [
      { id: "1", name: "FOOD" },
      { id: "2", name: "TRANSPORT" },
      { id: "3", name: "SHOPPING" },
      { id: "4", name: "ENTERTAINMENT" },
      { id: "5", name: "UTILITIES" },
      { id: "6", name: "HEALTHCARE" },
      { id: "7", name: "GROCERIES" },
      { id: "8", name: "OTHER" },
    ];
  }

  return (
    <div className="min-h-screen bg-transparent text-zinc-300 p-4 md:p-8 pb-32 max-w-7xl mx-auto">
      {/* Header with Settings */}
      <div className="flex justify-between items-center mb-8 sm:mb-12">
        <div className="relative">
          {/* Subtle background glow for logo area */}
          <div className="absolute -inset-4 bg-indigo-500/10 blur-3xl rounded-full opacity-50 pointer-events-none"></div>
          <h1 className="text-3xl font-bold tracking-tighter text-white relative z-10">Vibe Finance</h1>
          <p className="text-zinc-400 text-sm mt-1 font-medium tracking-wide relative z-10">Personal Wealth OS</p>
        </div>
        <Link
          href="/settings"
          className="group relative p-2 pr-3 sm:pr-4 rounded-2xl glass-panel hover:bg-zinc-800/80 transition-all duration-300 active:scale-[0.97] overflow-hidden flex items-center gap-3 border-white/10"
          aria-label="Settings"
        >
          {/* Hover gradient sweep */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform empty:hidden"></div>

          <div className="relative z-10 p-2 sm:p-2.5 bg-zinc-800/80 rounded-xl border border-white/5 shadow-inner group-hover:border-indigo-500/30 transition-colors">
            <Settings size={18} className="text-zinc-400 group-hover:text-indigo-400 transition-colors" />
          </div>

          <span className="relative z-10 text-xs sm:text-sm font-bold tracking-widest uppercase text-zinc-400 group-hover:text-zinc-100 transition-colors">
            Settings
          </span>
        </Link>
      </div>

      {/* PWA Install Prompt */}
      <PWAProvider />

      {/* Error Boundary for entire dashboard */}
      <ErrorBoundary name="Dashboard">
        {/* Net Liquidity Hero */}
        <NetLiquidityHero
          netLiquidity={netLiquidity}
          cashTotal={cashTotal}
          debtTotal={debtTotal}
        />

        {/* Account Grid with Horizontal Scroll */}
        <Suspense fallback={<AccountGridSkeleton />}>
          <ErrorBoundary name="AccountGrid">
            <AccountGrid accounts={accounts} />
          </ErrorBoundary>
        </Suspense>

        {/* Tax Projection */}
        <Suspense fallback={<TaxMeterSkeleton />}>
          <ErrorBoundary name="TaxMeter">
            <TaxMeter
              yearlyIncome={yearlyIncome}
              projectedTax={projectedTax}
              paidTax={paidTax}
            />
          </ErrorBoundary>
        </Suspense>

        {/* Monthly Trend Chart */}
        <Suspense fallback={<MonthlyTrendChartSkeleton />}>
          <ErrorBoundary name="MonthlyTrendChart">
            <MonthlyTrendChart userId={userId} months={6} />
          </ErrorBoundary>
        </Suspense>

        {/* Credit Card Widget */}
        {creditCards.length > 0 && (
          <Suspense fallback={<CreditCardWidgetSkeleton />}>
            <ErrorBoundary name="CreditCardWidget">
              <CreditCardWidget cards={creditCards} />
            </ErrorBoundary>
          </Suspense>
        )}

        {/* Transaction History */}
        <ErrorBoundary name="TransactionHistory">
          <TransactionHistory
            userId={userId}
            limit={10}
            transactions={transactions}
            categories={categories}
            accounts={accounts}
          />
        </ErrorBoundary>
      </ErrorBoundary>

      {/* Quick Log Drawer (Client Component) */}
      <ErrorBoundary name="QuickLogDrawer">
        <QuickLogDrawer accounts={accounts} categories={categories} />
      </ErrorBoundary>
    </div>
  );
}
