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
        // Credit cards: expense increase = debt increase (increment)
        // Cash/e-wallet: expense increase = balance decrease (decrement)
        const isCreditCard = original.fromAccount?.type === "CREDIT_CARD";
        await tx.account.update({
          where: { id: original.fromAccountId! },
          data: { 
            balance: isCreditCard 
              ? { increment: amountDiff }  // CC: More expense = more debt
              : { decrement: amountDiff }, // Cash: More expense = less money
            updatedById: data.userId,
          },
        });
      } else if (original.type === "INCOME") {
        // For incomes: adjust the toAccount balance
        // Credit cards: income increase (payment) = debt decrease (decrement)
        // Cash/e-wallet: income increase = balance increase (increment)
        const isCreditCard = original.toAccount?.type === "CREDIT_CARD";
        await tx.account.update({
          where: { id: original.toAccountId! },
          data: { 
            balance: isCreditCard
              ? { decrement: amountDiff }  // CC: More payment = less debt
              : { increment: amountDiff }, // Cash: More income = more money
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
          // For credit cards as target: transfer is a payment, reduces debt
          const isCreditCard = original.toAccount?.type === "CREDIT_CARD";
          await tx.account.update({
            where: { id: original.toAccountId },
            data: { 
              balance: isCreditCard
                ? { decrement: amountDiff }  // CC: More payment = less debt
                : { increment: amountDiff }, // Cash: More transfer = more money
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
        // For credit cards: deleting an expense REDUCES debt (decrement)
        // For cash/e-wallet: deleting an expense ADDS money back (increment)
        const isCreditCard = transaction.fromAccount?.type === "CREDIT_CARD";
        await tx.account.update({
          where: { id: transaction.fromAccountId },
          data: { 
            balance: isCreditCard 
              ? { decrement: transaction.amount }  // CC: Reduce debt
              : { increment: transaction.amount }, // Cash: Add money back
            updatedById: userId,
          },
        });
      } else if (transaction.type === "INCOME" && transaction.toAccountId) {
        // Remove the income from the account
        // For credit cards: deleting income (payment) INCREASES debt (increment)
        // For cash/e-wallet: deleting income REMOVES money (decrement)
        const isCreditCard = transaction.toAccount?.type === "CREDIT_CARD";
        await tx.account.update({
          where: { id: transaction.toAccountId },
          data: { 
            balance: isCreditCard
              ? { increment: transaction.amount }  // CC: Increase debt (reverse payment)
              : { decrement: transaction.amount }, // Cash: Remove money
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
          // For credit cards as target: reverse payment means increase debt
          const toAccount = await tx.account.findUnique({
            where: { id: transaction.toAccountId }
          });
          const isCreditCard = toAccount?.type === "CREDIT_CARD";
          await tx.account.update({
            where: { id: transaction.toAccountId },
            data: { 
              balance: isCreditCard
                ? { increment: transaction.amount }  // CC: Reverse payment = increase debt
                : { decrement: transaction.amount }, // Cash: Remove money
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
 * Delete multiple transactions with audit logging and balance rollback
 */
export async function deleteManyTransactions(
  transactionIds: string[],
  userId: string
) {
  try {
    if (!transactionIds.length) {
      throw new Error("No transactions selected");
    }

    // Get all transactions with account details
    const transactions = await db.transaction.findMany({
      where: {
        id: { in: transactionIds },
        createdById: userId,
      },
      include: {
        fromAccount: true,
        toAccount: true,
        category: true,
      },
    });

    if (transactions.length === 0) {
      throw new Error("No transactions found");
    }

    const results = {
      success: true,
      deleted: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each transaction in a transaction
    await db.$transaction(async (tx) => {
      for (const transaction of transactions) {
        try {
          // Rollback balance changes based on transaction type
          if (transaction.type === "EXPENSE" && transaction.fromAccountId) {
            const isCreditCard = transaction.fromAccount?.type === "CREDIT_CARD";
            await tx.account.update({
              where: { id: transaction.fromAccountId },
              data: {
                balance: isCreditCard
                  ? { decrement: transaction.amount }
                  : { increment: transaction.amount },
                updatedById: userId,
              },
            });
          } else if (transaction.type === "INCOME" && transaction.toAccountId) {
            const isCreditCard = transaction.toAccount?.type === "CREDIT_CARD";
            await tx.account.update({
              where: { id: transaction.toAccountId },
              data: {
                balance: isCreditCard
                  ? { increment: transaction.amount }
                  : { decrement: transaction.amount },
                updatedById: userId,
              },
            });
          } else if (transaction.type === "TRANSFER") {
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
              const toAccount = await tx.account.findUnique({
                where: { id: transaction.toAccountId },
              });
              const isCreditCard = toAccount?.type === "CREDIT_CARD";
              await tx.account.update({
                where: { id: transaction.toAccountId },
                data: {
                  balance: isCreditCard
                    ? { increment: transaction.amount }
                    : { decrement: transaction.amount },
                  updatedById: userId,
                },
              });
            }
          }

          // Create audit log entry
          await tx.auditLog.create({
            data: {
              action: "TRANSACTION_DELETE",
              model: "Transaction",
              recordId: transaction.id,
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
              reason: "Bulk delete",
              createdById: userId,
            },
          });

          // Delete the transaction
          await tx.transaction.delete({
            where: { id: transaction.id },
          });

          results.deleted++;
        } catch (error) {
          results.failed++;
          results.errors.push(
            `Failed to delete transaction ${transaction.id}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }
    });

    revalidatePath("/");
    return {
      ...results,
      success: results.failed === 0,
    };
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