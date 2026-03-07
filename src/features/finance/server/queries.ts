// src/features/finance/server/queries.ts
import { db } from "@/lib/db";

/**
 * Calculates Net Liquidity: (Cash + E-Wallets) - Credit Card Debt
 * This is the "Real Money" metric users need to avoid overspending.
 */
export async function getNetLiquidity(userId: string) {
  const accounts = await db.account.findMany({
    where: { createdById: userId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      balance: true,
      creditLimit: true,
    },
  });

  const cash = accounts
    .filter((a) => a.type === "CASH" || a.type === "E_WALLET")
    .reduce((acc, curr) => acc + Number(curr.balance), 0);

  const debt = accounts
    .filter((a) => a.type === "CREDIT_CARD")
    .reduce((acc, curr) => acc + Number(curr.balance), 0);

  const investments = accounts
    .filter((a) => a.type === "INVESTMENT")
    .reduce((acc, curr) => acc + Number(curr.balance), 0);

  // Convert to plain objects with number types
  const serializedAccounts = accounts.map(acc => ({
    id: acc.id,
    name: acc.name,
    type: acc.type,
    balance: Number(acc.balance),
    creditLimit: acc.creditLimit ? Number(acc.creditLimit) : null,
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
 */
export async function getRecentTransactions(userId: string, limit = 20) {
  return await db.transaction.findMany({
    where: { createdById: userId },
    include: {
      fromAccount: { select: { id: true, name: true, type: true } },
      toAccount: { select: { id: true, name: true, type: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Gets transactions grouped by category for a date range
 */
export async function getTransactionsByCategory(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  const transactions = await db.transaction.findMany({
    where: {
      createdById: userId,
      type: "EXPENSE",
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // Group by categoryId (category names would be resolved client-side)
  const grouped = transactions.reduce((acc, tx) => {
    const categoryId = tx.categoryId || "uncategorized";

    if (!acc[categoryId]) {
      acc[categoryId] = {
        categoryId,
        categoryName: categoryId, // Use ID as name for now
        total: 0,
        count: 0,
      };
    }

    acc[categoryId].total += Number(tx.amount);
    acc[categoryId].count += 1;

    return acc;
  }, {} as Record<string, { categoryId: string; categoryName: string; total: number; count: number }>);

  return Object.values(grouped).sort((a, b) => b.total - a.total);
}

/**
 * Calculates monthly income vs expense trend
 */
export async function getMonthlyTrend(userId: string, months = 6) {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  const transactions = await db.transaction.findMany({
    where: {
      createdById: userId,
      createdAt: { gte: startDate },
      type: { in: ["INCOME", "EXPENSE"] },
    },
    select: {
      amount: true,
      type: true,
      createdAt: true,
    },
  });

  // Group by month
  const monthlyData = transactions.reduce((acc, tx) => {
    const monthKey = `${tx.createdAt.getFullYear()}-${String(tx.createdAt.getMonth() + 1).padStart(2, "0")}`;

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
 */
export async function getYearToDateSummary(userId: string) {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const transactions = await db.transaction.findMany({
    where: {
      createdById: userId,
      createdAt: { gte: startOfYear },
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
      createdAt: { gte: startDate },
    },
    orderBy: { createdAt: "asc" },
    select: {
      amount: true,
      type: true,
      fromAccountId: true,
      toAccountId: true,
      createdAt: true,
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
      date: tx.createdAt,
      balance: runningBalance,
    });
  }

  return history.reverse();
}
