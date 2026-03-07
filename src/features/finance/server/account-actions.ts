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
