// src/features/finance/server/account-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { AccountSchema } from "../constants/schemas";
import { getOrCreateSystemReconciliationCategory } from "./category-actions";

/**
 * Serialize Prisma Account model to plain JSON-safe object
 * Converts Decimal and Date objects to primitives
 */
function serializeAccount(account: any) {
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    balance: Number(account.balance),
    creditLimit: account.creditLimit !== null ? Number(account.creditLimit) : null,
    currency: account.currency,
    statementDay: account.statementDay,
    dueDay: account.dueDay,
    createdAt: account.createdAt?.toISOString() ?? null,
    updatedAt: account.updatedAt?.toISOString() ?? null,
    deletedAt: account.deletedAt?.toISOString() ?? null,
    createdById: account.createdById,
    updatedById: account.updatedById,
  };
}

/**
 * Serialize CreditCardStatement to plain JSON-safe object
 */
function serializeStatement(statement: any) {
  return {
    id: statement.id,
    accountId: statement.accountId,
    statementDate: statement.statementDate?.toISOString() ?? null,
    startDate: statement.startDate?.toISOString() ?? null,
    endDate: statement.endDate?.toISOString() ?? null,
    dueDate: statement.dueDate?.toISOString() ?? null,
    statementBalance: Number(statement.statementBalance),
    minimumPayment: statement.minimumPayment !== null ? Number(statement.minimumPayment) : null,
    totalPayment: Number(statement.totalPayment),
    isPaid: statement.isPaid,
    paidAt: statement.paidAt?.toISOString() ?? null,
    createdAt: statement.createdAt?.toISOString() ?? null,
    createdById: statement.createdById,
  };
}

/**
 * Create a new account
 */
export async function createAccount(data: {
  name: string;
  type: "CASH" | "E_WALLET" | "CREDIT_CARD" | "INVESTMENT";
  balance: number;
  creditLimit?: number;
  statementDay?: number; // For credit cards: day of month statement is generated
  dueDay?: number;       // For credit cards: day of month payment is due
  userId: string;
}) {
  try {
    const { userId, ...accountData } = data;

    const account = await db.account.create({
      data: {
        ...accountData,
        createdById: userId,
      },
    });

    revalidatePath("/");
    return { success: true, data: serializeAccount(account) };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to create account" };
  }
}

/**
 * Update an account
 */
export async function updateAccount(data: {
  id: string;
  name: string;
  type: "CASH" | "E_WALLET" | "CREDIT_CARD" | "INVESTMENT";
  balance: number;
  creditLimit?: number;
  statementDay?: number;
  dueDay?: number;
  userId: string;
}) {
  try {
    const { userId, id, ...accountData } = data;

    // Verify ownership
    const existing = await db.account.findFirst({
      where: { id, createdById: userId },
    });

    if (!existing) {
      throw new Error("Account not found");
    }

    const account = await db.account.update({
      where: { id },
      data: {
        ...accountData,
        updatedById: userId,
      },
    });

    revalidatePath("/");
    return { success: true, data: serializeAccount(account) };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to update account" };
  }
}

/**
 * Delete an account (soft delete)
 */
export async function deleteAccount(accountId: string, userId: string) {
  try {
    // Verify ownership
    const existing = await db.account.findFirst({
      where: { id: accountId, createdById: userId },
    });

    if (!existing) {
      throw new Error("Account not found");
    }

    // Check for transactions
    const transactionCount = await db.transaction.count({
      where: {
        OR: [{ fromAccountId: accountId }, { toAccountId: accountId }],
      },
    });

    if (transactionCount > 0) {
      throw new Error(
        "Cannot delete account with transactions. Set balance to 0 instead."
      );
    }

    // Soft delete
    await db.account.update({
      where: { id: accountId },
      data: {
        deletedAt: new Date(),
        updatedById: userId,
      },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to delete account" };
  }
}

/**
 * Delete multiple accounts (soft delete)
 */
export async function deleteManyAccounts(accountIds: string[], userId: string) {
  try {
    if (!accountIds.length) {
      throw new Error("No accounts selected");
    }

    // Verify all accounts exist and belong to user
    const accounts = await db.account.findMany({
      where: {
        id: { in: accountIds },
        createdById: userId,
      },
    });

    if (accounts.length === 0) {
      throw new Error("No accounts found");
    }

    const results = {
      success: true,
      deleted: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Check for transactions on each account
    for (const account of accounts) {
      const transactionCount = await db.transaction.count({
        where: {
          OR: [{ fromAccountId: account.id }, { toAccountId: account.id }],
        },
      });

      if (transactionCount > 0) {
        results.failed++;
        results.errors.push(
          `Cannot delete "${account.name}" - it has ${transactionCount} transaction(s)`
        );
        continue;
      }

      // Soft delete
      await db.account.update({
        where: { id: account.id },
        data: {
          deletedAt: new Date(),
          updatedById: userId,
        },
      });

      results.deleted++;
    }

    revalidatePath("/");
    return {
      ...results,
      success: results.failed === 0,
    };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to delete accounts" };
  }
}

/**
 * Hard delete an account (for cleanup only)
 */
export async function hardDeleteAccount(accountId: string, userId: string) {
  try {
    await db.account.delete({
      where: { id: accountId, createdById: userId },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to delete account" };
  }
}

// ============================================
// CREDIT CARD STATEMENT MANAGEMENT
// ============================================

/**
 * Generate a new credit card statement
 * Called automatically when statement day is reached
 */
export async function generateStatement(data: {
  accountId: string;
  userId: string;
  statementDate?: Date;
}) {
  try {
    const { accountId, userId, statementDate = new Date() } = data;

    // Get account with billing cycle info
    const account = await db.account.findFirst({
      where: { id: accountId, createdById: userId, type: "CREDIT_CARD" },
    });

    if (!account) {
      throw new Error("Credit card account not found");
    }

    if (!account.statementDay || !account.dueDay) {
      throw new Error("Credit card billing cycle not configured");
    }

    // Calculate billing period
    const year = statementDate.getFullYear();
    const month = statementDate.getMonth();
    const statementDay = account.statementDay;
    const dueDay = account.dueDay;

    // Statement date is the current statement day
    const stmtDate = new Date(year, month, statementDay);

    // Previous statement date (for start of period)
    const prevStmtDate = new Date(year, month - 1, statementDay);

    // Due date is the due day of the current month (or next if due < statement)
    let dueDate: Date;
    if (dueDay > statementDay) {
      // Due date is same month
      dueDate = new Date(year, month, dueDay);
    } else {
      // Due date is next month
      dueDate = new Date(year, month + 1, dueDay);
    }

    // Get current balance as statement balance
    const statementBalance = account.balance;

    // Create statement
    const statement = await db.creditCardStatement.create({
      data: {
        accountId,
        statementDate: stmtDate,
        startDate: prevStmtDate,
        endDate: stmtDate,
        dueDate,
        statementBalance,
        minimumPayment: Number(statementBalance) * 0.1, // 10% minimum
        createdById: userId,
      },
    });

    revalidatePath("/");
    return { success: true, data: serializeStatement(statement) };
  } catch (error) {
    console.error("generateStatement error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to generate statement" };
  }
}

/**
 * Record a payment against a statement
 */
export async function recordStatementPayment(data: {
  statementId: string;
  amount: number;
  userId: string;
}) {
  try {
    const { statementId, amount, userId } = data;

    const statement = await db.creditCardStatement.findFirst({
      where: { id: statementId, createdById: userId },
      include: { account: true },
    });

    if (!statement) {
      throw new Error("Statement not found");
    }

    const newTotalPayment = Number(statement.totalPayment) + amount;
    const isPaid = newTotalPayment >= Number(statement.statementBalance);

    await db.creditCardStatement.update({
      where: { id: statementId },
      data: {
        totalPayment: newTotalPayment,
        isPaid,
        paidAt: isPaid ? new Date() : statement.paidAt,
      },
    });

    revalidatePath("/");
    return { success: true, isPaid };
  } catch (error) {
    console.error("recordStatementPayment error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to record payment" };
  }
}

/**
 * Get current statement for a credit card
 */
export async function getCurrentStatement(accountId: string, userId: string) {
  try {
    const now = new Date();

    // Find the most recent statement that hasn't passed its due date
    const statement = await db.creditCardStatement.findFirst({
      where: {
        accountId,
        createdById: userId,
        dueDate: { gte: now },
      },
      orderBy: { statementDate: "desc" },
    });

    return { success: true, data: statement ? serializeStatement(statement) : null };
  } catch (error) {
    console.error("getCurrentStatement error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to get statement" };
  }
}

/**
 * Get all statements for a credit card
 */
export async function getAccountStatements(accountId: string, userId: string) {
  try {
    const statements = await db.creditCardStatement.findMany({
      where: { accountId, createdById: userId },
      orderBy: { statementDate: "desc" },
    });

    return { success: true, data: statements.map(serializeStatement) };
  } catch (error) {
    console.error("getAccountStatements error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to get statements" };
  }
}

// ============================================
// RECONCILIATION ENGINE (BALANCE SYNC)
// ============================================

/**
 * Sync account balance with actual bank balance
 * Creates a corrective reconciliation transaction for the difference
 * 
 * @param accountId - Account to reconcile
 * @param actualBalance - The actual balance from the bank/statement
 * @param effectiveDate - Date for the reconciliation transaction (YYYY-MM-DD)
 * @param reason - Optional reason for the reconciliation
 * @param userId - User ID for ownership
 */
export async function syncAccountBalance(data: {
  accountId: string;
  actualBalance: number;
  effectiveDate: string; // YYYY-MM-DD
  reason?: string;
  userId: string;
}) {
  try {
    const { accountId, actualBalance, effectiveDate, reason, userId } = data;

    // Get account and verify ownership
    const account = await db.account.findFirst({
      where: { id: accountId, createdById: userId },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    const currentBalance = Number(account.balance);
    const delta = actualBalance - currentBalance;

    // If no difference, return success no-op
    if (delta === 0) {
      return {
        success: true,
        message: "Balance already matches. No reconciliation needed.",
        delta: 0,
        transactionId: null,
      };
    }

    // Get or create SYSTEM_RECONCILIATION category
    const categoryResult = await getOrCreateSystemReconciliationCategory(userId);
    if (!categoryResult.success || !categoryResult.data) {
      throw new Error("Failed to get reconciliation category");
    }
    const categoryId = categoryResult.data.id;

    const effectiveDateTime = new Date(effectiveDate);

    // Determine transaction type based on account type and delta
    // CASH/E_WALLET/INVESTMENT: delta > 0 => INCOME, delta < 0 => EXPENSE
    // CREDIT_CARD: delta > 0 => EXPENSE (debt increased), delta < 0 => INCOME (debt decreased)
    let txType: "INCOME" | "EXPENSE";
    let fromAccountId: string | null = null;
    let toAccountId: string | null = null;

    if (account.type === "CREDIT_CARD") {
      // Credit card: balance = debt
      if (delta > 0) {
        // Debt increased = EXPENSE
        txType = "EXPENSE";
        fromAccountId = accountId;
      } else {
        // Debt decreased = INCOME
        txType = "INCOME";
        toAccountId = accountId;
      }
    } else {
      // Asset accounts: balance = asset
      if (delta > 0) {
        // Asset increased = INCOME
        txType = "INCOME";
        toAccountId = accountId;
      } else {
        // Asset decreased = EXPENSE
        txType = "EXPENSE";
        fromAccountId = accountId;
      }
    }

    // Execute atomic transaction: create reconciliation tx + update balance + audit log
    await db.$transaction(async (tx) => {
      // Create reconciliation transaction
      await tx.transaction.create({
        data: {
          amount: Math.abs(delta),
          type: txType,
          description: `Balance Reconciliation: ${reason || "System sync"}`,
          categoryId,
          fromAccountId,
          toAccountId,
          date: effectiveDateTime,
          isReconciliation: true,
          createdById: userId,
          metadata: {
            beforeBalance: currentBalance,
            afterBalance: actualBalance,
            delta,
            reason: reason || "System sync",
          },
        },
      });

      // Update account balance
      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: actualBalance,
          updatedById: userId,
        },
      });

      // Write audit log
      await tx.auditLog.create({
        data: {
          action: "BALANCE_RECONCILIATION",
          model: "Account",
          recordId: accountId,
          payload: {
            beforeBalance: currentBalance,
            afterBalance: actualBalance,
            delta,
            reason: reason || "System sync",
            effectiveDate: effectiveDate,
          },
          reason: reason || "Balance synchronization",
          createdById: userId,
        },
      });
    });

    revalidatePath("/");
    revalidatePath("/settings");

    return {
      success: true,
      message: `Balance reconciled. Delta: ${delta > 0 ? "+" : ""}${delta}`,
      delta,
      transactionType: txType,
    };
  } catch (error) {
    console.error("syncAccountBalance error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to sync account balance" };
  }
}
