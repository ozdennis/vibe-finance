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
  const transactions = await db.transaction.findMany({
    where: { createdById: userId },
    include: {
      category: { select: { id: true, name: true, color: true } },
      fromAccount: { select: { id: true, name: true, type: true } },
      toAccount: { select: { id: true, name: true, type: true } },
    },
    orderBy: { createdAt: "desc" },
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