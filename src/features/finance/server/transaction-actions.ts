// src/features/finance/server/transaction-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

/**
 * Update a transaction with audit logging
 */
export async function updateTransaction(data: {
  id: string;
  amount: number;
  description?: string;
  categoryId?: string;
  date: string; // ISO date string
  userId: string;
}) {
  try {
    // Get the original transaction
    const original = await db.transaction.findFirst({
      where: { id: data.id, createdById: data.userId },
      include: {
        fromAccount: true,
        toAccount: true,
      },
    });

    if (!original) {
      throw new Error("Transaction not found");
    }

    const amountDiff = data.amount - Number(original.amount);

    await db.$transaction(async (tx) => {
      // Update the transaction
      await tx.transaction.update({
        where: { id: data.id },
        data: {
          amount: data.amount,
          description: data.description,
          categoryId: data.categoryId,
          date: new Date(data.date),
          updatedById: data.userId,
        },
      });

      // Adjust account balances based on transaction type
      if (original.type === "EXPENSE") {
        // For expenses: adjust the fromAccount balance
        await tx.account.update({
          where: { id: original.fromAccountId! },
          data: { 
            balance: { decrement: amountDiff },
            updatedById: data.userId,
          },
        });
      } else if (original.type === "INCOME") {
        // For incomes: adjust the toAccount balance
        await tx.account.update({
          where: { id: original.toAccountId! },
          data: { 
            balance: { increment: amountDiff },
            updatedById: data.userId,
          },
        });
      } else if (original.type === "TRANSFER") {
        // For transfers: adjust both accounts
        if (original.fromAccountId) {
          await tx.account.update({
            where: { id: original.fromAccountId },
            data: { 
              balance: { decrement: amountDiff },
              updatedById: data.userId,
            },
          });
        }
        if (original.toAccountId) {
          await tx.account.update({
            where: { id: original.toAccountId },
            data: { 
              balance: { increment: amountDiff },
              updatedById: data.userId,
            },
          });
        }
      }

      // Create audit log entry
      await tx.auditLog.create({
        data: {
          action: "TRANSACTION_UPDATE",
          model: "Transaction",
          recordId: data.id,
          payload: {
            before: {
              amount: original.amount,
              description: original.description,
              categoryId: original.categoryId,
              date: original.date,
            },
            after: {
              amount: data.amount,
              description: data.description,
              categoryId: data.categoryId,
              date: data.date,
            },
          },
          createdById: data.userId,
        },
      });
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Delete a transaction with audit logging and balance rollback
 */
export async function deleteTransaction(
  transactionId: string,
  userId: string
) {
  try {
    // Get the transaction with account details
    const transaction = await db.transaction.findFirst({
      where: { id: transactionId, createdById: userId },
      include: {
        fromAccount: true,
        toAccount: true,
        category: true,
      },
    });

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    await db.$transaction(async (tx) => {
      // Rollback balance changes based on transaction type
      if (transaction.type === "EXPENSE" && transaction.fromAccountId) {
        // Refund the expense back to the account
        await tx.account.update({
          where: { id: transaction.fromAccountId },
          data: { 
            balance: { increment: transaction.amount },
            updatedById: userId,
          },
        });
      } else if (transaction.type === "INCOME" && transaction.toAccountId) {
        // Remove the income from the account
        await tx.account.update({
          where: { id: transaction.toAccountId },
          data: { 
            balance: { decrement: transaction.amount },
            updatedById: userId,
          },
        });
      } else if (transaction.type === "TRANSFER") {
        // Reverse the transfer
        if (transaction.fromAccountId) {
          await tx.account.update({
            where: { id: transaction.fromAccountId },
            data: { 
              balance: { increment: transaction.amount },
              updatedById: userId,
            },
          });
        }
        if (transaction.toAccountId) {
          await tx.account.update({
            where: { id: transaction.toAccountId },
            data: { 
              balance: { decrement: transaction.amount },
              updatedById: userId,
            },
          });
        }
      }

      // Create audit log entry before deleting
      await tx.auditLog.create({
        data: {
          action: "TRANSACTION_DELETE",
          model: "Transaction",
          recordId: transactionId,
          payload: {
            deletedTransaction: {
              id: transaction.id,
              amount: transaction.amount,
              type: transaction.type,
              description: transaction.description,
              date: transaction.date,
              category: transaction.category?.name,
              fromAccount: transaction.fromAccount?.name,
              toAccount: transaction.toAccount?.name,
            },
          },
          reason: "User deleted transaction",
          createdById: userId,
        },
      });

      // Delete the transaction
      await tx.transaction.delete({
        where: { id: transactionId },
      });
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get audit log for a specific transaction
 */
export async function getTransactionAuditLog(transactionId: string, userId: string) {
  try {
    const logs = await db.auditLog.findMany({
      where: {
        recordId: transactionId,
        createdById: userId,
        model: "Transaction",
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: logs };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "An unexpected error occurred" };
  }
}
