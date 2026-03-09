// src/features/finance/server/statement-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

/**
 * Serialize CreditCardStatement to plain JSON-safe object
 * Converts Decimal and Date objects to primitives
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
 * Generate a new credit card statement
 */
export async function generateCreditCardStatement(data: {
  accountId: string;
  userId: string;
}) {
  try {
    // Verify account ownership
    const account = await db.account.findFirst({
      where: { id: data.accountId, createdById: data.userId, type: "CREDIT_CARD" },
    });

    if (!account) {
      return { success: false, error: "Credit card account not found" };
    }

    const now = new Date();

    // Calculate statement period
    const statementDay = account.statementDay || 1;
    const dueDay = account.dueDay || 15;

    // Last statement date (or account creation date if no statement yet)
    const lastStatement = await db.creditCardStatement.findFirst({
      where: { accountId: data.accountId },
      orderBy: { statementDate: "desc" },
    });

    const startDate = lastStatement 
      ? new Date(lastStatement.statementDate)
      : account.createdAt;

    // Create statement
    const statement = await db.creditCardStatement.create({
      data: {
        accountId: data.accountId,
        statementDate: now,
        startDate,
        endDate: now,
        dueDate: new Date(now.getFullYear(), now.getMonth() + 1, dueDay),
        statementBalance: account.balance,
        minimumPayment: Number(account.balance) * 0.05, // 5% minimum
        totalPayment: 0,
        isPaid: false,
        createdById: data.userId,
      },
    });

    revalidatePath("/");
    return { success: true, data: serializeStatement(statement) };
  } catch (error) {
    console.error("generateCreditCardStatement error:", error);
    return { success: false, error: "Failed to generate statement" };
  }
}

/**
 * Mark a statement as paid
 */
export async function markStatementAsPaid(data: {
  statementId: string;
  userId: string;
  paymentAmount: number;
}) {
  try {
    // Verify statement ownership
    const statement = await db.creditCardStatement.findFirst({
      where: { id: data.statementId },
      include: { account: true },
    });

    if (!statement || statement.account.createdById !== data.userId) {
      return { success: false, error: "Statement not found" };
    }

    const now = new Date();

    // Update statement
    const updatedStatement = await db.creditCardStatement.update({
      where: { id: data.statementId },
      data: {
        totalPayment: { increment: data.paymentAmount },
        isPaid: Number(statement.totalPayment) + data.paymentAmount >= Number(statement.statementBalance),
        paidAt: Number(statement.totalPayment) + data.paymentAmount >= Number(statement.statementBalance) ? now : undefined,
      },
    });

    // Update account balance (decrement by payment amount)
    await db.account.update({
      where: { id: statement.accountId },
      data: {
        balance: { decrement: data.paymentAmount },
      },
    });

    // Create transaction for payment
    await db.transaction.create({
      data: {
        amount: data.paymentAmount,
        type: "TRANSFER",
        description: `Credit Card Payment - ${statement.account.name}`,
        fromAccountId: null, // Will be set based on payment source
        toAccountId: statement.accountId,
        createdById: data.userId,
        date: now,
      },
    });

    revalidatePath("/");
    return { success: true, data: serializeStatement(updatedStatement) };
  } catch (error) {
    console.error("markStatementAsPaid error:", error);
    return { success: false, error: "Failed to process payment" };
  }
}

/**
 * Delete a statement (only if not paid)
 */
export async function deleteStatement(data: {
  statementId: string;
  userId: string;
}) {
  try {
    const statement = await db.creditCardStatement.findFirst({
      where: { id: data.statementId },
      include: { account: true },
    });

    if (!statement || statement.account.createdById !== data.userId) {
      return { success: false, error: "Statement not found" };
    }

    if (statement.isPaid) {
      return { success: false, error: "Cannot delete paid statements" };
    }

    await db.creditCardStatement.delete({
      where: { id: data.statementId },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("deleteStatement error:", error);
    return { success: false, error: "Failed to delete statement" };
  }
}
