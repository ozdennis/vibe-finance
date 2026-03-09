// src/features/finance/server/deposit-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { addMonthsSafe } from "./interest-actions";
import { getOrCreateSystemReconciliationCategory } from "./category-actions";

/**
 * Get or create DEPOSIT PENALTY category
 */
async function getOrCreateDepositPenaltyCategory(userId: string): Promise<string | null> {
  const existing = await db.category.findFirst({
    where: { name: "DEPOSIT PENALTY", createdById: userId },
  });

  if (existing) {
    return existing.id;
  }

  const created = await db.category.create({
    data: {
      name: "DEPOSIT PENALTY",
      color: "#f43f5e", // rose color
      createdById: userId,
    },
  });

  return created.id;
}

/**
 * Transfer from time deposit with optional early withdrawal penalty
 * Creates:
 * - TRANSFER transaction for net amount (amount - penalty)
 * - EXPENSE transaction for penalty (if penalty > 0)
 */
export async function transferFromDepositWithPenalty(data: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  penaltyAmount?: number;
  description?: string;
  date?: string; // ISO date string
  userId: string;
}): Promise<{
  success: boolean;
  error?: string;
  transferId?: string;
  netTransfer?: number;
  isEarlyWithdrawal?: boolean;
}> {
  try {
    const {
      fromAccountId,
      toAccountId,
      amount,
      penaltyAmount = 0,
      description,
      date,
      userId,
    } = data;

    // Validate amount
    if (amount <= 0) {
      return { success: false, error: "Amount must be greater than 0" };
    }

    // Validate penalty
    if (penaltyAmount < 0) {
      return { success: false, error: "Penalty cannot be negative" };
    }

    if (penaltyAmount > amount) {
      return { success: false, error: "Penalty cannot exceed transfer amount" };
    }

    // Get source account with yield profile
    const fromAccount = await db.account.findFirst({
      where: { id: fromAccountId, createdById: userId },
      include: { yieldProfile: true },
    });

    if (!fromAccount) {
      return { success: false, error: "Source account not found" };
    }

    // Verify source is INVESTMENT account with TIME_DEPOSIT
    if (fromAccount.type !== "INVESTMENT") {
      return {
        success: false,
        error: "Source must be an INVESTMENT account",
      };
    }

    if (fromAccount.yieldProfile?.productType !== "TIME_DEPOSIT") {
      return {
        success: false,
        error: "Source account is not a time deposit",
      };
    }

    if (!fromAccount.yieldProfile.depositStartDate || !fromAccount.yieldProfile.depositTermMonths) {
      return {
        success: false,
        error: "Time deposit configuration incomplete",
      };
    }

    // Calculate maturity date
    const depositStartDate = fromAccount.yieldProfile.depositStartDate;
    const termMonths = fromAccount.yieldProfile.depositTermMonths;
    const maturityDate = await addMonthsSafe(depositStartDate, termMonths);

    // Determine transfer date
    const transferDate = date ? new Date(date) : new Date();

    // Check if early withdrawal (before maturity)
    const isEarlyWithdrawal = transferDate < maturityDate;

    if (!isEarlyWithdrawal) {
      // Not early - instruct to use normal transfer flow
      return {
        success: false,
        error: "Deposit has matured. Use normal transfer flow instead.",
      };
    }

    // Calculate net transfer
    const netTransfer = amount - penaltyAmount;

    // Get target account
    const toAccount = await db.account.findFirst({
      where: { id: toAccountId, createdById: userId },
    });

    if (!toAccount) {
      return { success: false, error: "Target account not found" };
    }

    // Get DEPOSIT PENALTY category
    const penaltyCategoryId = await getOrCreateDepositPenaltyCategory(userId);
    if (!penaltyCategoryId) {
      return { success: false, error: "Failed to get deposit penalty category" };
    }

    // Execute database transaction
    const result = await db.$transaction(async (tx) => {
      // 1. Decrement source account by full amount
      await tx.account.update({
        where: { id: fromAccountId },
        data: {
          balance: { decrement: amount },
          updatedById: userId,
        },
      });

      // 2. Increment/decrement target account by net amount
      // For CREDIT_CARD: paying CC reduces debt (decrement)
      // For other accounts: transfer increases balance (increment)
      const targetUpdate = toAccount.type === "CREDIT_CARD"
        ? { decrement: netTransfer }
        : { increment: netTransfer };

      await tx.account.update({
        where: { id: toAccountId },
        data: {
          balance: targetUpdate,
          updatedById: userId,
        },
      });

      // 3. Create TRANSFER transaction for net amount
      const transfer = await tx.transaction.create({
        data: {
          amount: netTransfer,
          type: "TRANSFER",
          description: description || `Early withdrawal from ${fromAccount.name}`,
          fromAccountId,
          toAccountId,
          date: transferDate,
          createdById: userId,
          metadata: {
            isDepositEarlyTransfer: true,
            grossAmount: amount,
            penaltyAmount,
            netTransfer,
            maturityDate: maturityDate.toISOString(),
          },
        },
      });

      // 4. Create EXPENSE transaction for penalty (if penalty > 0)
      if (penaltyAmount > 0) {
        await tx.transaction.create({
          data: {
            amount: penaltyAmount,
            type: "EXPENSE",
            description: `Early withdrawal penalty - ${fromAccount.name}`,
            categoryId: penaltyCategoryId,
            fromAccountId,
            date: transferDate,
            createdById: userId,
            metadata: {
              isDepositPenalty: true,
              relatedTransferId: transfer.id,
            },
          },
        });
      }

      return transfer;
    });

    revalidatePath("/");
    revalidatePath("/settings");

    return {
      success: true,
      transferId: result.id,
      netTransfer,
      isEarlyWithdrawal: true,
    };
  } catch (error) {
    console.error("transferFromDepositWithPenalty error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to process early withdrawal" };
  }
}

/**
 * Check if an account is a time deposit and if it's before maturity
 */
export async function checkTimeDepositStatus(params: {
  accountId: string;
  userId: string;
}): Promise<{
  isTimeDeposit: boolean;
  isMatured: boolean;
  maturityDate?: Date;
  termMonths?: number;
  depositStartDate?: Date;
} | null> {
  try {
    const { accountId, userId } = params;

    const account = await db.account.findFirst({
      where: { id: accountId, createdById: userId },
      include: {
        yieldProfile: true,
      },
    });

    if (!account || !account.yieldProfile) {
      return null;
    }

    if (account.yieldProfile.productType !== "TIME_DEPOSIT") {
      return {
        isTimeDeposit: false,
        isMatured: true, // Not a time deposit, so not applicable
      };
    }

    if (!account.yieldProfile.depositStartDate || !account.yieldProfile.depositTermMonths) {
      return {
        isTimeDeposit: false,
        isMatured: true, // Incomplete config, treat as not a time deposit
      };
    }

    const depositStartDate = account.yieldProfile.depositStartDate;
    const termMonths = account.yieldProfile.depositTermMonths;
    const maturityDate = await addMonthsSafe(depositStartDate, termMonths);
    const isMatured = new Date() >= maturityDate;

    return {
      isTimeDeposit: true,
      isMatured,
      maturityDate,
      termMonths,
      depositStartDate,
    };
  } catch (error) {
    console.error("checkTimeDepositStatus error:", error);
    return null;
  }
}
