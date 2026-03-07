// src/features/finance/server/account-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { AccountSchema } from "../constants/schemas";

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
    return { success: true, data: account };
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
    return { success: true, data: account };
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
    return { success: true, data: statement };
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

    return { success: true, data: statement };
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

    return { success: true, data: statements };
  } catch (error) {
    console.error("getAccountStatements error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to get statements" };
  }
}
