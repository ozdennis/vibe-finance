// src/features/finance/server/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { TransactionSchema } from "../constants/schemas";

/**
 * Creates a new transaction (income, expense, or transfer)
 * 
 * Real-world logic:
 * - INCOME: Adds money TO an account (salary, gifts, refunds)
 * - EXPENSE: Removes money FROM an account (must have sufficient balance!)
 * - TRANSFER: Moves money BETWEEN accounts (source decreases, target increases)
 * - CREDIT CARD: 
 *   - Spending = balance INCREASES (you owe more)
 *   - Payment = balance DECREASES (you owe less)
 */
export async function createTransaction(data: {
  amount: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  description?: string;
  date?: string;
  userId: string;
}) {
  try {
    // Validate input
    if (!data.amount || data.amount <= 0) {
      return { success: false, error: "Amount must be greater than 0" };
    }
    
    if (!data.accountId) {
      return { success: false, error: "Please select an account" };
    }

    const validated = TransactionSchema.parse(data);
    const transactionDate = data.date ? new Date(data.date) : new Date();

    // Get the account
    const account = await db.account.findFirst({
      where: { id: validated.accountId, createdById: validated.userId },
    });

    if (!account) {
      return { success: false, error: "Account not found" };
    }

    await db.$transaction(async (tx) => {
      if (validated.type === "INCOME") {
        // INCOME: Add money to account
        await tx.account.update({
          where: { id: validated.accountId },
          data: { 
            balance: { increment: validated.amount },
            updatedById: validated.userId,
          },
        });

        await tx.transaction.create({
          data: {
            amount: validated.amount,
            type: "INCOME",
            date: transactionDate,
            fromAccountId: null,
            toAccountId: validated.accountId,
            categoryId: validated.categoryId,
            description: validated.description || "Income",
            createdById: validated.userId,
          },
        });
        
      } else if (validated.type === "EXPENSE") {
        // EXPENSE: Remove money from account
        // Check if account has sufficient balance (except for credit cards)
        const currentBalance = Number(account.balance);
        if (account.type !== "CREDIT_CARD" && currentBalance < validated.amount) {
          throw new Error(`Insufficient balance. Available: Rp ${currentBalance.toLocaleString('id-ID')}`);
        }
        
        // For credit cards, spending INCREASES the balance (you owe more)
        const balanceUpdate = account.type === "CREDIT_CARD"
          ? { increment: validated.amount }  // CC: spending increases debt
          : { decrement: validated.amount };  // Cash/E-wallet: spending decreases balance
        
        await tx.account.update({
          where: { id: validated.accountId },
          data: { 
            balance: balanceUpdate,
            updatedById: validated.userId,
          },
        });

        await tx.transaction.create({
          data: {
            amount: validated.amount,
            type: "EXPENSE",
            date: transactionDate,
            fromAccountId: validated.accountId,
            toAccountId: null,
            categoryId: validated.categoryId,
            description: validated.description || "Expense",
            createdById: validated.userId,
          },
        });
        
      } else if (validated.type === "TRANSFER" && data.toAccountId) {
        // TRANSFER: Move money between accounts
        if (account.type === "CREDIT_CARD") {
          throw new Error("Cannot transfer FROM a credit card. Use EXPENSE then INCOME instead.");
        }

        // Check sufficient balance for source account
        const currentBalance = Number(account.balance);
        if (currentBalance < validated.amount) {
          throw new Error(`Insufficient balance. Available: Rp ${currentBalance.toLocaleString('id-ID')}`);
        }
        
        // Get target account
        const targetAccount = await tx.account.findFirst({
          where: { id: data.toAccountId, createdById: validated.userId },
        });
        
        if (!targetAccount) {
          throw new Error("Target account not found");
        }
        
        // For credit card target, paying CC DECREASES the balance
        const targetUpdate = targetAccount.type === "CREDIT_CARD"
          ? { decrement: validated.amount }  // Paying CC reduces debt
          : { increment: validated.amount };  // Regular transfer increases balance
        
        // Decrease source account
        await tx.account.update({
          where: { id: validated.accountId },
          data: { 
            balance: { decrement: validated.amount },
            updatedById: validated.userId,
          },
        });

        // Increase target account
        await tx.account.update({
          where: { id: data.toAccountId },
          data: { 
            balance: targetUpdate,
            updatedById: validated.userId,
          },
        });

        await tx.transaction.create({
          data: {
            amount: validated.amount,
            type: "TRANSFER",
            date: transactionDate,
            fromAccountId: validated.accountId,
            toAccountId: data.toAccountId,
            categoryId: null,
            description: validated.description || `Transfer to ${targetAccount.name}`,
            createdById: validated.userId,
          },
        });
      }
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error('createTransaction error:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Deletes a transaction with balance rollback
 */
export async function deleteTransaction(
  transactionId: string,
  userId: string
) {
  try {
    const transaction = await db.transaction.findFirst({
      where: { id: transactionId, createdById: userId },
      include: { fromAccount: true, toAccount: true },
    });

    if (!transaction) {
      return { success: false, error: "Transaction not found" };
    }

    await db.$transaction(async (tx) => {
      // Rollback based on transaction type
      if (transaction.type === "EXPENSE" && transaction.fromAccountId) {
        // Refund: add money back (or reduce CC debt)
        const isCreditCard = transaction.fromAccount?.type === "CREDIT_CARD";
        await tx.account.update({
          where: { id: transaction.fromAccountId },
          data: { 
            balance: isCreditCard 
              ? { decrement: transaction.amount }  // Reduce CC debt
              : { increment: transaction.amount },  // Add cash back
          },
        });
      } else if (transaction.type === "INCOME" && transaction.toAccountId) {
        // Remove income
        const isCreditCard = transaction.toAccount?.type === "CREDIT_CARD";
        await tx.account.update({
          where: { id: transaction.toAccountId },
          data: { 
            balance: isCreditCard
              ? { increment: transaction.amount }  // Increase CC debt (reverse payment)
              : { decrement: transaction.amount },  // Remove cash
          },
        });
      } else if (transaction.type === "TRANSFER") {
        // Reverse transfer
        if (transaction.fromAccountId) {
          await tx.account.update({
            where: { id: transaction.fromAccountId },
            data: { balance: { increment: transaction.amount } },
          });
        }
        if (transaction.toAccountId) {
          const toAcc = await tx.account.findUnique({
            where: { id: transaction.toAccountId }
          });
          const isCreditCard = toAcc?.type === "CREDIT_CARD";
          await tx.account.update({
            where: { id: transaction.toAccountId },
            data: { 
              balance: isCreditCard
                ? { increment: transaction.amount }
                : { decrement: transaction.amount },
            },
          });
        }
      }

      await tx.transaction.delete({
        where: { id: transactionId },
      });
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error('deleteTransaction error:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "An unexpected error occurred" };
  }
}
