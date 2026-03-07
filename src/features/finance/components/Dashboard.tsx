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

    // Calculate projected tax (simplified: 12% effective rate projection)
    const monthlyAverage = yearlyIncome / 6; // Based on 6 months of data
    const projectedYearlyIncome = monthlyAverage * 12;
    projectedTax = Math.round(projectedYearlyIncome * 0.12); // Simplified 12% effective rate
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-32">
      {/* Header with Settings */}
      <div className="flex justify-end mb-4">
        <Link
          href="/settings"
          className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
          aria-label="Settings"
        >
          <Settings size={20} />
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
