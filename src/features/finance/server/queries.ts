// src/features/finance/server/queries.ts
import { db } from "@/lib/db";
import { getPeriodFilter, type PeriodFilter } from "../lib/utils";
import { getTaxSummary, getBusinessTaxYTD, getInterestTaxWithheldYTD } from "./tax-actions";
import { getEstimatedInterestMTD, getTotalInterestMTD, calculateTimeDepositProjection } from "./interest-actions";

/**
 * Calculates Net Liquidity: (Cash + E-Wallets) - Credit Card Debt
 * This is the "Real Money" metric users need to avoid overspending.
 * 
 * @param userId - User ID for filtering
 * @param period - Optional period filter (month/year). If not provided, returns current balances.
 */
export async function getNetLiquidity(userId: string, period?: { month?: number; year?: number }) {
  const periodFilter = period ? getPeriodFilter(period.month, period.year) : null;

  const accounts = await db.account.findMany({
    where: { createdById: userId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      balance: true,
      creditLimit: true,
      yieldProfile: {
        select: {
          productType: true,
          depositTermMonths: true,
          depositStartDate: true,
        },
      },
    },
  });

  let cash = 0;
  let debt = 0;
  let investments = 0;

  if (periodFilter) {
    // When period is specified, calculate balances based on transactions within that period
    for (const account of accounts) {
      const balance = await getAccountBalanceAtPeriod(account.id, userId, periodFilter);
      
      if (account.type === "CASH" || account.type === "E_WALLET") {
        cash += balance;
      } else if (account.type === "CREDIT_CARD") {
        debt += balance;
      } else if (account.type === "INVESTMENT") {
        investments += balance;
      }
    }
  } else {
    // No period - use current balances
    const cashAccounts = accounts
      .filter((a) => a.type === "CASH" || a.type === "E_WALLET")
      .reduce((acc, curr) => acc + Number(curr.balance), 0);

    const debtAccounts = accounts
      .filter((a) => a.type === "CREDIT_CARD")
      .reduce((acc, curr) => acc + Number(curr.balance), 0);

    const investmentAccounts = accounts
      .filter((a) => a.type === "INVESTMENT")
      .reduce((acc, curr) => acc + Number(curr.balance), 0);

    cash = cashAccounts;
    debt = debtAccounts;
    investments = investmentAccounts;
  }

  // Convert to plain objects with number types
  const serializedAccounts = accounts.map(acc => ({
    id: acc.id,
    name: acc.name,
    type: acc.type,
    balance: Number(acc.balance),
    creditLimit: acc.creditLimit ? Number(acc.creditLimit) : null,
    productType: acc.yieldProfile?.productType ?? null,
    depositTermMonths: acc.yieldProfile?.depositTermMonths ?? null,
    depositStartDate: acc.yieldProfile?.depositStartDate?.toISOString() ?? null,
  }));

  return {
    accounts: serializedAccounts,
    netLiquidity: cash - debt,
    cashTotal: cash,
    debtTotal: debt,
    investmentsTotal: investments,
  };
}

/**
 * Helper: Calculate account balance at a specific period
 * Starts from current balance and works backwards
 */
async function getAccountBalanceAtPeriod(
  accountId: string,
  userId: string,
  period: PeriodFilter
): Promise<number> {
  // Get all transactions affecting this account up to end of period
  const transactions = await db.transaction.findMany({
    where: {
      createdById: userId,
      date: { lte: period.endDate },
      OR: [{ fromAccountId: accountId }, { toAccountId: accountId }],
    },
    select: {
      amount: true,
      type: true,
      fromAccountId: true,
      toAccountId: true,
      date: true,
    },
  });

  // Calculate running balance up to end of period
  let balance = 0;
  for (const tx of transactions) {
    const amount = Number(tx.amount);
    if (tx.fromAccountId === accountId) {
      if (tx.type === "EXPENSE") {
        balance -= amount;
      } else if (tx.type === "TRANSFER") {
        balance -= amount;
      } else if (tx.type === "INCOME") {
        // Income to this account (rare, but possible for reversals)
        balance += amount;
      }
    }
    if (tx.toAccountId === accountId) {
      if (tx.type === "INCOME") {
        balance += amount;
      } else if (tx.type === "TRANSFER") {
        balance += amount;
      } else if (tx.type === "EXPENSE") {
        // Expense from this account (shouldn't happen, but handle it)
        balance -= amount;
      }
    }
  }

  return balance;
}

/**
 * Gets all categories for the user
 */
export async function getCategories(userId: string) {
  return await db.category.findMany({
    where: { createdById: userId },
    orderBy: { name: "asc" },
  });
}

/**
 * Gets recent transactions for the user
 * @param userId - User ID for filtering
 * @param limit - Maximum number of transactions to return
 * @param period - Optional period filter (month/year). Filters by Transaction.date.
 */
export async function getRecentTransactions(
  userId: string,
  limit = 20,
  period?: { month?: number; year?: number }
) {
  const periodFilter = period ? getPeriodFilter(period.month, period.year) : null;

  const transactions = await db.transaction.findMany({
    where: periodFilter
      ? {
          createdById: userId,
          date: {
            gte: periodFilter.startDate,
            lte: periodFilter.endDate,
          },
        }
      : { createdById: userId },
    include: {
      category: { select: { id: true, name: true, color: true } },
      fromAccount: { select: { id: true, name: true, type: true } },
      toAccount: { select: { id: true, name: true, type: true } },
    },
    orderBy: { date: "desc" },
    take: limit,
  });

  // Serialize Decimal to number for client components
  return transactions.map(tx => ({
    ...tx,
    amount: Number(tx.amount),
  }));
}

/**
 * Gets transactions grouped by category for a date range
 * @param userId - User ID for filtering
 * @param startDate - Start of period (deprecated, use period instead)
 * @param endDate - End of period (deprecated, use period instead)
 * @param period - Optional period filter (month/year). Filters by Transaction.date.
 */
export async function getTransactionsByCategory(
  userId: string,
  startDate?: Date,
  endDate?: Date,
  period?: { month?: number; year?: number }
) {
  const periodFilter = period ? getPeriodFilter(period.month, period.year) : null;
  const effectiveStart = startDate || (periodFilter ? periodFilter.startDate : new Date());
  const effectiveEnd = endDate || (periodFilter ? periodFilter.endDate : new Date());

  const transactions = await db.transaction.findMany({
    where: {
      createdById: userId,
      type: "EXPENSE",
      date: {
        gte: effectiveStart,
        lte: effectiveEnd,
      },
    },
    include: {
      category: { select: { id: true, name: true, color: true } },
    },
  });

  // Group by categoryId with category info
  const grouped = transactions.reduce((acc, tx) => {
    const categoryId = tx.categoryId || "uncategorized";
    const categoryName = tx.category?.name || categoryId;

    if (!acc[categoryId]) {
      acc[categoryId] = {
        categoryId,
        categoryName,
        total: 0,
        count: 0,
        color: tx.category?.color || null,
      };
    }

    acc[categoryId].total += Number(tx.amount);
    acc[categoryId].count += 1;

    return acc;
  }, {} as Record<string, { categoryId: string; categoryName: string; total: number; count: number; color: string | null }>);

  return Object.values(grouped).sort((a, b) => b.total - a.total);
}

/**
 * Calculates monthly income vs expense trend
 * @param userId - User ID for filtering
 * @param months - Number of months to include (default: 6)
 * @param period - Optional period filter. If provided, returns trend up to that month.
 */
export async function getMonthlyTrend(
  userId: string,
  months = 6,
  period?: { month?: number; year?: number }
) {
  const now = new Date();
  const targetYear = period?.year ?? now.getFullYear();
  const targetMonth = period?.month ?? (now.getMonth() + 1);

  // Calculate start date: first day of (targetMonth - months + 1), end date: last day of targetMonth
  const startDate = new Date(targetYear, targetMonth - months, 1);
  const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

  const transactions = await db.transaction.findMany({
    where: {
      createdById: userId,
      date: { gte: startDate, lte: endDate },
      type: { in: ["INCOME", "EXPENSE"] },
    },
    select: {
      amount: true,
      type: true,
      date: true,
    },
  });

  // Group by month
  const monthlyData = transactions.reduce((acc, tx) => {
    const monthKey = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, "0")}`;

    if (!acc[monthKey]) {
      acc[monthKey] = {
        month: monthKey,
        income: 0,
        expense: 0,
      };
    }

    if (tx.type === "INCOME") {
      acc[monthKey].income += Number(tx.amount);
    } else {
      acc[monthKey].expense += Number(tx.amount);
    }

    return acc;
  }, {} as Record<string, { month: string; income: number; expense: number }>);

  return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Gets year-to-date income and expenses for tax calculation
 * @param userId - User ID for filtering
 * @param period - Optional period filter. If provided, calculates for that year.
 */
export async function getYearToDateSummary(
  userId: string,
  period?: { month?: number; year?: number }
) {
  const now = new Date();
  const targetYear = period?.year ?? now.getFullYear();
  const startOfYear = new Date(targetYear, 0, 1);
  const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59, 999);

  const transactions = await db.transaction.findMany({
    where: {
      createdById: userId,
      date: { gte: startOfYear, lte: endOfYear },
      type: { in: ["INCOME", "EXPENSE"] },
    },
    select: {
      amount: true,
      type: true,
      isTaxDeductible: true,
    },
  });

  const totalIncome = transactions
    .filter((tx) => tx.type === "INCOME")
    .reduce((acc, tx) => acc + Number(tx.amount), 0);

  const totalExpenses = transactions
    .filter((tx) => tx.type === "EXPENSE")
    .reduce((acc, tx) => acc + Number(tx.amount), 0);

  const taxDeductibleExpenses = transactions
    .filter((tx) => tx.type === "EXPENSE" && tx.isTaxDeductible)
    .reduce((acc, tx) => acc + Number(tx.amount), 0);

  return {
    totalIncome,
    totalExpenses,
    taxDeductibleExpenses,
    netSavings: totalIncome - totalExpenses,
  };
}

// ============================================
// INVESTMENT SHELF QUERIES
// ============================================

/**
 * Get investment account data with MTD (Month-to-Date) growth
 * MTD Growth = Net monthly flows (incoming - outgoing investment transactions)
 * 
 * @param userId - User ID for filtering
 * @param period - Optional period filter. Defaults to current month.
 */
export async function getInvestmentMTD(
  userId: string,
  period?: { month?: number; year?: number }
) {
  const periodFilter = period ? getPeriodFilter(period.month, period.year) : getPeriodFilter();

  // Get all investment accounts
  const investmentAccounts = await db.account.findMany({
    where: {
      createdById: userId,
      type: "INVESTMENT",
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      balance: true,
      currency: true,
    },
  });

  // Calculate MTD growth for each account
  const accountData = await Promise.all(
    investmentAccounts.map(async (account) => {
      // Get all investment transactions within the period
      const transactions = await db.transaction.findMany({
        where: {
          createdById: userId,
          date: {
            gte: periodFilter.startDate,
            lte: periodFilter.endDate,
          },
          OR: [
            { fromAccountId: account.id },
            { toAccountId: account.id },
          ],
          type: { in: ["INCOME", "EXPENSE", "TRANSFER"] },
        },
        select: {
          amount: true,
          type: true,
          fromAccountId: true,
          toAccountId: true,
          description: true,
          date: true,
        },
      });

      // Calculate MTD growth: incoming - outgoing
      let mtdGrowth = 0;
      const inflows: number[] = [];
      const outflows: number[] = [];

      for (const tx of transactions) {
        const amount = Number(tx.amount);

        // Track money coming INTO the investment account
        if (tx.toAccountId === account.id) {
          if (tx.type === "INCOME" || tx.type === "TRANSFER") {
            inflows.push(amount);
            mtdGrowth += amount;
          }
        }

        // Track money going OUT of the investment account
        if (tx.fromAccountId === account.id) {
          if (tx.type === "EXPENSE" || tx.type === "TRANSFER") {
            outflows.push(amount);
            mtdGrowth -= amount;
          }
        }
      }

      return {
        accountId: account.id,
        name: account.name,
        currentBalance: Number(account.balance),
        currency: account.currency,
        mtdGrowth,
        mtdInflows: inflows.reduce((a, b) => a + b, 0),
        mtdOutflows: outflows.reduce((a, b) => a + b, 0),
        transactionCount: transactions.length,
      };
    })
  );

  // Calculate totals
  const totalBalance = accountData.reduce((acc, curr) => acc + curr.currentBalance, 0);
  const totalMtdGrowth = accountData.reduce((acc, curr) => acc + curr.mtdGrowth, 0);

  return {
    accounts: accountData,
    totalBalance,
    totalMtdGrowth,
    period: {
      month: periodFilter.month,
      year: periodFilter.year,
      label: periodFilter.label,
    },
  };
}

// ============================================
// CREDIT CARD STATEMENT QUERIES
// ============================================

/**
 * Get current statement with calculated "unbilled" amount
 * Unbilled = Current Balance - Last Statement Balance
 */
export async function getCreditCardStatus(accountId: string, userId: string) {
  const now = new Date();

  // Get account details
  const account = await db.account.findFirst({
    where: { id: accountId, createdById: userId, type: "CREDIT_CARD" },
    include: {
      statements: {
        orderBy: { statementDate: "desc" },
        take: 1,
      },
    },
  });

  if (!account) {
    return null;
  }

  const currentBalance = Number(account.balance);
  const lastStatement = account.statements[0];

  // Calculate unbilled amount (spending since last statement)
  let unbilledAmount = 0;
  let statementBalance = 0;
  let dueDate: Date | null = null;
  let daysUntilDue: number | null = null;
  let isPaid = false;

  if (lastStatement) {
    statementBalance = Number(lastStatement.statementBalance);
    dueDate = lastStatement.dueDate;
    isPaid = lastStatement.isPaid;

    // Unbilled = Current balance - What was on the statement
    // (This represents new charges since statement date)
    unbilledAmount = Math.max(0, currentBalance - statementBalance);

    // Calculate days until due
    if (dueDate) {
      const diffTime = dueDate.getTime() - now.getTime();
      daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  } else {
    // No statement yet - everything is unbilled
    unbilledAmount = currentBalance;
  }

  // Calculate next statement date
  let nextStatementDate: Date | null = null;
  if (account.statementDay) {
    const year = now.getFullYear();
    const month = now.getMonth();

    // If today is past statement day, next statement is next month
    if (now.getDate() > account.statementDay) {
      nextStatementDate = new Date(year, month + 1, account.statementDay);
    } else {
      nextStatementDate = new Date(year, month, account.statementDay);
    }
  }

  return {
    accountId: account.id,
    name: account.name,
    currentBalance,
    creditLimit: account.creditLimit ? Number(account.creditLimit) : null,
    statementBalance,
    unbilledAmount,
    dueDate,
    daysUntilDue,
    isPaid,
    statementDay: account.statementDay,
    dueDay: account.dueDay,
    nextStatementDate,
    utilizationRate: account.creditLimit
      ? (currentBalance / Number(account.creditLimit)) * 100
      : null,
  };
}

/**
 * Get all credit cards with their statement status
 */
export async function getAllCreditCardStatus(userId: string) {
  const creditCards = await db.account.findMany({
    where: {
      createdById: userId,
      type: "CREDIT_CARD",
      deletedAt: null,
    },
    include: {
      statements: {
        orderBy: { statementDate: "desc" },
        take: 1,
      },
    },
  });

  const now = new Date();

  return creditCards.map((account) => {
    const currentBalance = Number(account.balance);
    const lastStatement = account.statements[0];

    let unbilledAmount = 0;
    let statementBalance = 0;
    let dueDate: Date | null = null;
    let daysUntilDue: number | null = null;
    let isPaid = false;

    if (lastStatement) {
      statementBalance = Number(lastStatement.statementBalance);
      dueDate = lastStatement.dueDate;
      isPaid = lastStatement.isPaid;
      unbilledAmount = Math.max(0, currentBalance - statementBalance);

      if (dueDate) {
        const diffTime = dueDate.getTime() - now.getTime();
        daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
    } else {
      unbilledAmount = currentBalance;
    }

    // Calculate next statement date
    let nextStatementDate: Date | null = null;
    if (account.statementDay) {
      const year = now.getFullYear();
      const month = now.getMonth();

      if (now.getDate() > account.statementDay) {
        nextStatementDate = new Date(year, month + 1, account.statementDay);
      } else {
        nextStatementDate = new Date(year, month, account.statementDay);
      }
    }

    return {
      accountId: account.id,
      name: account.name,
      currentBalance,
      creditLimit: account.creditLimit ? Number(account.creditLimit) : null,
      statementBalance,
      unbilledAmount,
      dueDate,
      daysUntilDue,
      isPaid,
      statementDay: account.statementDay,
      dueDay: account.dueDay,
      nextStatementDate,
      utilizationRate: account.creditLimit
        ? (currentBalance / Number(account.creditLimit)) * 100
        : null,
    };
  });
}

/**
 * Gets account balance history for charts
 */
export async function getAccountBalanceHistory(
  userId: string,
  accountId: string,
  days = 30
) {
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Get all transactions affecting this account
  const transactions = await db.transaction.findMany({
    where: {
      createdById: userId,
      OR: [{ fromAccountId: accountId }, { toAccountId: accountId }],
      date: { gte: startDate },
    },
    orderBy: { date: "asc" },
    select: {
      amount: true,
      type: true,
      fromAccountId: true,
      toAccountId: true,
      date: true,
    },
  });

  // Calculate running balance
  const account = await db.account.findFirst({
    where: { id: accountId, createdById: userId },
    select: { balance: true },
  });

  const currentBalance = Number(account?.balance || 0);
  const history = [];
  let runningBalance = currentBalance;

  for (const tx of [...transactions].reverse()) {
    if (tx.fromAccountId === accountId && tx.type !== "INCOME") {
      runningBalance += Number(tx.amount);
    }
    if (tx.toAccountId === accountId && tx.type !== "EXPENSE") {
      runningBalance -= Number(tx.amount);
    }

    history.push({
      date: tx.date,
      balance: runningBalance,
    });
  }

  return history.reverse();
}

// ============================================
// AUDIT LOG QUERIES
// ============================================

/**
 * Get audit logs for a user
 */
export async function getAuditLogs(userId: string) {
  return await db.auditLog.findMany({
    where: { createdById: userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

// ============================================
// CREDIT CARD STATEMENT QUERIES (ALIAS)
// ============================================

/**
 * Get all credit card statements for a user
 * Alias for getAllCreditCardStatus for compatibility
 */
export async function getCreditCardStatements(userId: string) {
  return await getAllCreditCardStatus(userId);
}

// ============================================
// ENHANCED INVESTMENT SHELF WITH INTEREST
// ============================================

/**
 * Get investment account data with enhanced MTD breakdown:
 * - Flow MTD: Net monthly flows (incoming - outgoing investment transactions)
 * - Interest MTD: Estimated or posted interest (with tax info)
 * - Total MTD: Flow + Interest
 */
export async function getInvestmentMTDWithInterest(
  userId: string,
  period?: { month?: number; year?: number }
) {
  const periodFilter = period ? getPeriodFilter(period.month, period.year) : getPeriodFilter();

  // Get all investment accounts
  const investmentAccounts = await db.account.findMany({
    where: {
      createdById: userId,
      type: "INVESTMENT",
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      balance: true,
      currency: true,
      yieldProfile: {
        select: {
          productType: true,
          rateValue: true,
          rateUnit: true,
          withholdingTaxRatePct: true,
          depositTermMonths: true,
          depositStartDate: true,
          depositPrincipal: true,
        },
      },
    },
  });

  // Calculate MTD growth and interest for each account
  const accountData = await Promise.all(
    investmentAccounts.map(async (account) => {
      // Get all investment transactions within the period
      const transactions = await db.transaction.findMany({
        where: {
          createdById: userId,
          date: {
            gte: periodFilter.startDate,
            lte: periodFilter.endDate,
          },
          OR: [
            { fromAccountId: account.id },
            { toAccountId: account.id },
          ],
          type: { in: ["INCOME", "EXPENSE", "TRANSFER"] },
        },
        select: {
          amount: true,
          type: true,
          fromAccountId: true,
          toAccountId: true,
          description: true,
          date: true,
        },
      });

      // Calculate Flow MTD: incoming - outgoing
      let flowMTD = 0;
      const inflows: number[] = [];
      const outflows: number[] = [];

      for (const tx of transactions) {
        const amount = Number(tx.amount);

        // Track money coming INTO the investment account
        if (tx.toAccountId === account.id) {
          if (tx.type === "INCOME" || tx.type === "TRANSFER") {
            inflows.push(amount);
            flowMTD += amount;
          }
        }

        // Track money going OUT of the investment account
        if (tx.fromAccountId === account.id) {
          if (tx.type === "EXPENSE" || tx.type === "TRANSFER") {
            outflows.push(amount);
            flowMTD -= amount;
          }
        }
      }

      // Get Interest MTD (estimated or posted)
      // For TIME_DEPOSIT, interest is only recognized at maturity
      let interestNet = 0;
      let interestGross = 0;
      let interestTax = 0;
      let isInterestEstimated = true;
      let interestDaysAccrued = 0;

      // TIME_DEPOSIT handling
      const isTimeDeposit = account.yieldProfile?.productType === "TIME_DEPOSIT";
      let yieldMode: "TIME_DEPOSIT" | "FLEXI" = isTimeDeposit ? "TIME_DEPOSIT" : "FLEXI";
      let maturityDate: string | null = null;
      let projectedInterestGross: number | null = null;
      let projectedInterestTax: number | null = null;
      let projectedInterestNet: number | null = null;
      let isMatured = false;

      if (isTimeDeposit && account.yieldProfile?.depositStartDate && account.yieldProfile.depositTermMonths) {
        // Calculate maturity date
        const depositStartDate = account.yieldProfile.depositStartDate;
        const termMonths = account.yieldProfile.depositTermMonths;
        const maturity = new Date(depositStartDate);
        maturity.setMonth(maturity.getMonth() + termMonths);
        maturityDate = maturity.toISOString();

        // Check if matured
        isMatured = new Date() >= maturity;

        // Calculate projected interest at maturity
        const projection = await calculateTimeDepositProjection({
          principal: account.yieldProfile.depositPrincipal ? Number(account.yieldProfile.depositPrincipal) : Number(account.balance),
          annualRatePct: Number(account.yieldProfile.rateValue),
          termMonths: account.yieldProfile.depositTermMonths,
          taxRatePct: Number(account.yieldProfile.withholdingTaxRatePct),
          depositStartDate,
        });

        projectedInterestGross = projection.grossInterest;
        projectedInterestTax = projection.taxWithheld;
        projectedInterestNet = projection.netInterest;

        // Interest MTD: only recognized in maturity month
        const isMaturityMonth = 
          periodFilter.year === maturity.getFullYear() && 
          periodFilter.month === maturity.getMonth() + 1;

        if (isMaturityMonth) {
          interestNet = projectedInterestNet;
          interestGross = projectedInterestGross;
          interestTax = projectedInterestTax;
        }
        // Before maturity: interestMTD = 0
      } else {
        // FLEXI - use existing interest calculation
        const interestMTD = await getEstimatedInterestMTD({
          accountId: account.id,
          userId,
          periodMonth: periodFilter.month,
          periodYear: periodFilter.year,
        });

        interestNet = interestMTD?.netInterest ?? 0;
        interestGross = interestMTD?.grossInterest ?? 0;
        interestTax = interestMTD?.taxWithheld ?? 0;
        isInterestEstimated = interestMTD?.isEstimated ?? true;
        interestDaysAccrued = interestMTD?.daysAccrued ?? 0;
      }

      // Total MTD = Flow + Interest (net)
      const totalMTD = flowMTD + interestNet;

      return {
        accountId: account.id,
        name: account.name,
        currentBalance: Number(account.balance),
        currency: account.currency,
        flowMTD,
        flowInflows: inflows.reduce((a, b) => a + b, 0),
        flowOutflows: outflows.reduce((a, b) => a + b, 0),
        interestMTD: interestNet,
        interestGross,
        interestTax,
        isInterestEstimated,
        interestDaysAccrued,
        totalMTD,
        transactionCount: transactions.length,
        // TIME_DEPOSIT fields
        yieldMode,
        depositTermMonths: account.yieldProfile?.depositTermMonths ?? null,
        maturityDate,
        projectedInterestGross,
        projectedInterestTax,
        projectedInterestNet,
        isMatured,
      };
    })
  );

  // Calculate totals
  const totalBalance = accountData.reduce((acc, curr) => acc + curr.currentBalance, 0);
  const totalFlowMTD = accountData.reduce((acc, curr) => acc + curr.flowMTD, 0);
  const totalInterestMTD = accountData.reduce((acc, curr) => acc + curr.interestMTD, 0);
  const totalMTD = accountData.reduce((acc, curr) => acc + curr.totalMTD, 0);

  return {
    accounts: accountData,
    totalBalance,
    totalFlowMTD,
    totalInterestMTD,
    totalMTD,
    period: {
      month: periodFilter.month,
      year: periodFilter.year,
      label: periodFilter.label,
    },
  };
}

// ============================================
// CASH ACCOUNT INTEREST SUMMARY
// ============================================

/**
 * Get interest MTD for all cash accounts (for AccountGrid display)
 */
export async function getCashAccountInterestMTD(
  userId: string,
  period?: { month?: number; year?: number }
) {
  // Fetch eligible CASH account ids first
  const cashAccountsResult = await db.account.findMany({
    where: { createdById: userId, type: "CASH", deletedAt: null },
    select: { id: true },
  });
  const cashAccountIds = new Set(cashAccountsResult.map(a => a.id));

  const result = await getTotalInterestMTD({
    userId,
    periodMonth: period?.month,
    periodYear: period?.year,
  });

  // Filter breakdown synchronously using the Set
  const cashAccountBreakdown = result.accountBreakdown.filter(item =>
    cashAccountIds.has(item.accountId)
  );

  // Return totals for filtered cash breakdown only
  const totalGross = cashAccountBreakdown.reduce((sum, a) => sum + a.grossInterest, 0);
  const totalTax = cashAccountBreakdown.reduce((sum, a) => sum + a.taxWithheld, 0);
  const totalNet = cashAccountBreakdown.reduce((sum, a) => sum + a.netInterest, 0);

  return {
    totalGross,
    totalTax,
    totalNet,
    cashAccountBreakdown,
  };
}