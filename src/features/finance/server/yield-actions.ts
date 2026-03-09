// src/features/finance/server/yield-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

/**
 * Upsert (create or update) yield profile for an account
 * Only allowed for CASH and INVESTMENT account types
 * Supports FLEXI and TIME_DEPOSIT product types
 */
export async function upsertYieldProfile(data: {
  accountId: string;
  userId: string;
  rateValue: number;
  rateUnit: "MONTHLY" | "YEARLY";
  withholdingTaxRatePct: number;
  accrualStartDate: string; // ISO date string
  isActive: boolean;
  productType?: "FLEXI" | "TIME_DEPOSIT";
  depositTermMonths?: number;
  depositStartDate?: string;
  depositPrincipal?: number;
}): Promise<{
  success: boolean;
  error?: string;
  profile?: {
    id: string;
    rateValue: number;
    rateUnit: string;
    withholdingTaxRatePct: number;
    accrualStartDate: string;
    isActive: boolean;
    productType: string;
    depositTermMonths: number | null;
    depositStartDate: string | null;
    depositPrincipal: number | null;
  };
}> {
  try {
    const {
      accountId,
      userId,
      rateValue,
      rateUnit,
      withholdingTaxRatePct,
      accrualStartDate,
      isActive,
      productType = "FLEXI",
      depositTermMonths,
      depositStartDate,
      depositPrincipal,
    } = data;

    // Validate rate value
    if (rateValue < 0) {
      return { success: false, error: "Interest rate cannot be negative" };
    }

    if (rateValue > 100) {
      return { success: false, error: "Interest rate seems too high (max 100%)" };
    }

    // Validate withholding tax rate
    if (withholdingTaxRatePct < 0 || withholdingTaxRatePct > 100) {
      return { success: false, error: "Tax rate must be between 0 and 100" };
    }

    // Verify account exists and is eligible
    const account = await db.account.findFirst({
      where: { id: accountId, createdById: userId },
      select: { type: true },
    });

    if (!account) {
      return { success: false, error: "Account not found" };
    }

    // Only CASH and INVESTMENT accounts can have yield profiles
    if (account.type !== "CASH" && account.type !== "INVESTMENT") {
      return {
        success: false,
        error: "Yield profiles are only available for CASH and INVESTMENT accounts",
      };
    }

    // TIME_DEPOSIT validation
    if (productType === "TIME_DEPOSIT") {
      // Must be INVESTMENT account
      if (account.type !== "INVESTMENT") {
        return {
          success: false,
          error: "Time deposits are only available for INVESTMENT accounts",
        };
      }

      // Rate unit must be YEARLY
      if (rateUnit !== "YEARLY") {
        return {
          success: false,
          error: "Time deposits require yearly (annual) interest rate",
        };
      }

      // depositTermMonths required and in [1,3,6,12]
      if (!depositTermMonths || ![1, 3, 6, 12].includes(depositTermMonths)) {
        return {
          success: false,
          error: "Deposit term must be 1, 3, 6, or 12 months",
        };
      }

      // depositStartDate required
      if (!depositStartDate) {
        return {
          success: false,
          error: "Deposit start date is required for time deposits",
        };
      }

      // depositPrincipal required > 0
      if (!depositPrincipal || depositPrincipal <= 0) {
        return {
          success: false,
          error: "Deposit principal must be greater than 0",
        };
      }
    }

    const startDate = new Date(accrualStartDate);

    // Upsert yield profile
    const profile = await db.accountYieldProfile.upsert({
      where: { accountId },
      update: {
        rateValue,
        rateUnit,
        withholdingTaxRatePct,
        accrualStartDate: startDate,
        isActive,
        productType,
        depositTermMonths: productType === "TIME_DEPOSIT" ? depositTermMonths : null,
        depositStartDate: productType === "TIME_DEPOSIT" ? new Date(depositStartDate!) : null,
        depositPrincipal: productType === "TIME_DEPOSIT" ? depositPrincipal : null,
        updatedById: userId,
      },
      create: {
        accountId,
        rateValue,
        rateUnit,
        withholdingTaxRatePct,
        accrualStartDate: startDate,
        isActive,
        productType,
        depositTermMonths: productType === "TIME_DEPOSIT" ? depositTermMonths : null,
        depositStartDate: productType === "TIME_DEPOSIT" ? new Date(depositStartDate!) : null,
        depositPrincipal: productType === "TIME_DEPOSIT" ? depositPrincipal : null,
        createdById: userId,
      },
    });

    revalidatePath("/");
    revalidatePath("/settings");

    return {
      success: true,
      profile: {
        id: profile.id,
        rateValue: Number(profile.rateValue),
        rateUnit: profile.rateUnit,
        withholdingTaxRatePct: Number(profile.withholdingTaxRatePct),
        accrualStartDate: profile.accrualStartDate.toISOString(),
        isActive: profile.isActive,
        productType: profile.productType,
        depositTermMonths: profile.depositTermMonths,
        depositStartDate: profile.depositStartDate?.toISOString() ?? null,
        depositPrincipal: profile.depositPrincipal ? Number(profile.depositPrincipal) : null,
      },
    };
  } catch (error) {
    console.error("upsertYieldProfile error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to save yield profile" };
  }
}

/**
 * Get yield profile for an account
 */
export async function getYieldProfile(params: {
  accountId: string;
  userId: string;
}): Promise<{
  id?: string;
  rateValue?: number;
  rateUnit?: string;
  withholdingTaxRatePct?: number;
  accrualStartDate?: string;
  isActive?: boolean;
  productType?: string;
  depositTermMonths?: number | null;
  depositStartDate?: string | null;
  depositPrincipal?: number | null;
} | null> {
  try {
    const { accountId, userId } = params;

    const profile = await db.accountYieldProfile.findFirst({
      where: { accountId, account: { createdById: userId } },
    });

    if (!profile) {
      return null;
    }

    return {
      id: profile.id,
      rateValue: Number(profile.rateValue),
      rateUnit: profile.rateUnit,
      withholdingTaxRatePct: Number(profile.withholdingTaxRatePct),
      accrualStartDate: profile.accrualStartDate.toISOString(),
      isActive: profile.isActive,
      productType: profile.productType,
      depositTermMonths: profile.depositTermMonths,
      depositStartDate: profile.depositStartDate?.toISOString() ?? null,
      depositPrincipal: profile.depositPrincipal ? Number(profile.depositPrincipal) : null,
    };
  } catch (error) {
    console.error("getYieldProfile error:", error);
    return null;
  }
}

/**
 * Delete yield profile
 */
export async function deleteYieldProfile(params: {
  accountId: string;
  userId: string;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { accountId, userId } = params;

    // Verify ownership
    const profile = await db.accountYieldProfile.findFirst({
      where: { accountId, account: { createdById: userId } },
    });

    if (!profile) {
      return { success: false, error: "Yield profile not found" };
    }

    await db.accountYieldProfile.delete({
      where: { id: profile.id },
    });

    revalidatePath("/");
    revalidatePath("/settings");

    return { success: true };
  } catch (error) {
    console.error("deleteYieldProfile error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to delete yield profile" };
  }
}
