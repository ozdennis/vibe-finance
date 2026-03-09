// src/features/finance/server/interest-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getPeriodFilter } from "../lib/utils";

/**
 * Calculate daily interest rate from annual or monthly rate
 */
function calculateDailyRate(rateValue: number, rateUnit: "MONTHLY" | "YEARLY"): number {
  if (rateUnit === "YEARLY") {
    return rateValue / 365;
  }
  // MONTHLY: assume 30 days per month for simplicity
  return rateValue / 30;
}

/**
 * Calculate withholding tax on interest
 */
function calculateWithholdingTax(grossInterest: number, taxRatePct: number): number {
  return Math.round((grossInterest * taxRatePct / 100) * 100) / 100;
}

/**
 * Calculate interest for a specific period (MTD - Month to Date)
 * Uses day-prorated calculation based on accrual start date
 * For current month only, caps at today (not month end)
 * Note: This is a server action wrapper - the actual calculation is synchronous
 */
export async function calculateInterestMTD(params: {
  principal: number;
  rateValue: number;
  rateUnit: "MONTHLY" | "YEARLY";
  accrualStartDate: Date;
  periodMonth: number;
  periodYear: number;
}): Promise<{
  grossInterest: number;
  daysAccrued: number;
  isFullMonth: boolean;
}> {
  const { principal, rateValue, rateUnit, accrualStartDate, periodMonth, periodYear } = params;

  const periodFilter = getPeriodFilter(periodMonth, periodYear);
  const periodStart = periodFilter.startDate;
  let periodEnd = periodFilter.endDate;

  // For current month only, cap at today (not month end)
  const now = new Date();
  const isCurrentMonth = now.getMonth() + 1 === periodMonth && now.getFullYear() === periodYear;
  if (isCurrentMonth) {
    // Use min(today, periodEnd) for current month
    periodEnd = now < periodEnd ? now : periodEnd;
  }

  // Determine effective start date (later of accrual start or period start)
  const effectiveStart = accrualStartDate > periodStart ? accrualStartDate : periodStart;

  // If effective start is after period end, no interest accrued
  if (effectiveStart > periodEnd) {
    return { grossInterest: 0, daysAccrued: 0, isFullMonth: false };
  }

  // Calculate days accrued in this period
  const daysAccrued = Math.floor(
    (periodEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1; // +1 to include the start date

  const totalDaysInMonth = periodEnd.getDate(); // e.g., 28, 30, 31
  const isFullMonth = daysAccrued >= totalDaysInMonth;

  // Calculate daily rate
  const dailyRate = calculateDailyRate(rateValue, rateUnit) / 100; // Convert percentage to decimal

  // Day-prorated interest
  const grossInterest = principal * dailyRate * daysAccrued;

  return {
    grossInterest: Math.round(grossInterest * 100) / 100, // Round to 2 decimal places
    daysAccrued,
    isFullMonth,
  };
}

/**
 * Get or create interest category by name
 */
async function getOrCreateInterestCategory(
  name: string,
  userId: string
): Promise<string | null> {
  const existing = await db.category.findFirst({
    where: { name, createdById: userId },
  });

  if (existing) {
    return existing.id;
  }

  const created = await db.category.create({
    data: {
      name,
      color: name.includes("TAX") ? "#f59e0b" : "#10b981",
      createdById: userId,
    },
  });

  return created.id;
}

/**
 * Post monthly interest for an account (idempotent)
 * Creates:
 * - INCOME transaction for gross interest
 * - EXPENSE transaction for tax withheld
 * Net effect on account balance = gross - tax
 */
export async function postMonthlyInterest(data: {
  accountId: string;
  userId: string;
  periodMonth?: number;
  periodYear?: number;
}): Promise<{
  success: boolean;
  error?: string;
  postingId?: string;
  grossInterest?: number;
  taxWithheld?: number;
  netInterest?: number;
}> {
  try {
    const { accountId, userId, periodMonth, periodYear } = data;

    const now = new Date();
    const targetMonth = periodMonth ?? now.getMonth() + 1;
    const targetYear = periodYear ?? now.getFullYear();

    // Get account with yield profile
    const account = await db.account.findFirst({
      where: { id: accountId, createdById: userId, type: { in: ["CASH", "INVESTMENT"] } },
      include: { yieldProfile: true },
    });

    if (!account) {
      return { success: false, error: "Account not found or not eligible for interest" };
    }

    if (!account.yieldProfile || !account.yieldProfile.isActive) {
      return { success: false, error: "Yield profile not configured or inactive" };
    }

    const { yieldProfile } = account;
    const periodFilter = getPeriodFilter(targetMonth, targetYear);

    // Calculate interest MTD
    const interestCalc = await calculateInterestMTD({
      principal: Number(account.balance),
      rateValue: Number(yieldProfile.rateValue),
      rateUnit: yieldProfile.rateUnit,
      accrualStartDate: yieldProfile.accrualStartDate,
      periodMonth: targetMonth,
      periodYear: targetYear,
    });

    if (interestCalc.grossInterest <= 0) {
      return { success: false, error: "No interest to post (zero or negative calculation)" };
    }

    // Calculate tax
    const taxRate = Number(yieldProfile.withholdingTaxRatePct);
    const taxWithheld = calculateWithholdingTax(interestCalc.grossInterest, taxRate);
    const netInterest = interestCalc.grossInterest - taxWithheld;

    // Check for existing posting (idempotency)
    const existingPosting = await db.interestPosting.findFirst({
      where: {
        accountId,
        year: targetYear,
        month: targetMonth,
        isEstimated: false,
      },
    });

    if (existingPosting) {
      return {
        success: false,
        error: "Interest already posted for this period",
        postingId: existingPosting.id,
      };
    }

    // Get categories
    const incomeCategoryId = await getOrCreateInterestCategory("INTEREST INCOME", userId);
    const taxCategoryId = await getOrCreateInterestCategory("INTEREST TAX WITHHELD", userId);

    if (!incomeCategoryId || !taxCategoryId) {
      return { success: false, error: "Failed to get interest categories" };
    }

    // Create transactions and posting in a database transaction
    const result = await db.$transaction(async (tx) => {
      // 1. Create gross interest INCOME transaction
      const grossTx = await tx.transaction.create({
        data: {
          amount: interestCalc.grossInterest,
          type: "INCOME",
          description: `Interest Income - ${periodFilter.label}`,
          categoryId: incomeCategoryId,
          toAccountId: accountId,
          date: periodFilter.endDate,
          createdById: userId,
          metadata: {
            isInterestPosting: true,
            periodMonth: targetMonth,
            periodYear: targetYear,
            rateValue: Number(yieldProfile.rateValue),
            rateUnit: yieldProfile.rateUnit,
          },
        },
      });

      // 2. Create tax WITHHELD expense transaction (only if tax > 0)
      let taxTxId: string | null = null;
      if (taxWithheld > 0) {
        const taxTx = await tx.transaction.create({
          data: {
            amount: taxWithheld,
            type: "EXPENSE",
            description: `Tax Withheld on Interest - ${periodFilter.label}`,
            categoryId: taxCategoryId,
            fromAccountId: accountId,
            date: periodFilter.endDate,
            createdById: userId,
            metadata: {
              isInterestTaxPosting: true,
              periodMonth: targetMonth,
              periodYear: targetYear,
              relatedGrossTxId: grossTx.id,
            },
          },
        });
        taxTxId = taxTx.id;
      }

      // 3. Update account balance (net effect)
      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: { increment: netInterest },
          updatedById: userId,
        },
      });

      // 4. Create interest posting record
      const posting = await tx.interestPosting.create({
        data: {
          accountId,
          year: targetYear,
          month: targetMonth,
          grossInterest: interestCalc.grossInterest,
          taxWithheld,
          netInterest,
          grossTxId: grossTx.id,
          taxTxId,
          isEstimated: false,
          createdById: userId,
        },
      });

      return posting;
    });

    revalidatePath("/");
    revalidatePath("/settings");

    return {
      success: true,
      postingId: result.id,
      grossInterest: Number(result.grossInterest),
      taxWithheld: Number(result.taxWithheld),
      netInterest: Number(result.netInterest),
    };
  } catch (error) {
    console.error("postMonthlyInterest error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to post interest" };
  }
}

/**
 * Get estimated interest MTD (without posting)
 * Used for UI display of "Interest MTD (Est)"
 */
export async function getEstimatedInterestMTD(params: {
  accountId: string;
  userId: string;
  periodMonth?: number;
  periodYear?: number;
}): Promise<{
  grossInterest: number;
  taxWithheld: number;
  netInterest: number;
  isEstimated: boolean;
  daysAccrued: number;
} | null> {
  try {
    const { accountId, userId, periodMonth, periodYear } = params;

    const now = new Date();
    const targetMonth = periodMonth ?? now.getMonth() + 1;
    const targetYear = periodYear ?? now.getFullYear();

    // Get account with yield profile
    const account = await db.account.findFirst({
      where: { id: accountId, createdById: userId, type: { in: ["CASH", "INVESTMENT"] } },
      include: { yieldProfile: true },
    });

    if (!account || !account.yieldProfile || !account.yieldProfile.isActive) {
      return null;
    }

    const { yieldProfile } = account;

    // Check if already posted
    const existingPosting = await db.interestPosting.findFirst({
      where: {
        accountId,
        year: targetYear,
        month: targetMonth,
        isEstimated: false,
      },
    });

    if (existingPosting) {
      // Return posted values
      return {
        grossInterest: Number(existingPosting.grossInterest),
        taxWithheld: Number(existingPosting.taxWithheld),
        netInterest: Number(existingPosting.netInterest),
        isEstimated: false,
        daysAccrued: 0,
      };
    }

    // Calculate estimated interest
    const interestCalc = await calculateInterestMTD({
      principal: Number(account.balance),
      rateValue: Number(yieldProfile.rateValue),
      rateUnit: yieldProfile.rateUnit,
      accrualStartDate: yieldProfile.accrualStartDate,
      periodMonth: targetMonth,
      periodYear: targetYear,
    });

    const taxWithheld = calculateWithholdingTax(
      interestCalc.grossInterest,
      Number(yieldProfile.withholdingTaxRatePct)
    );

    return {
      grossInterest: interestCalc.grossInterest,
      taxWithheld,
      netInterest: interestCalc.grossInterest - taxWithheld,
      isEstimated: true,
      daysAccrued: interestCalc.daysAccrued,
    };
  } catch (error) {
    console.error("getEstimatedInterestMTD error:", error);
    return null;
  }
}

/**
 * Get total interest MTD across all eligible accounts
 */
export async function getTotalInterestMTD(params: {
  userId: string;
  periodMonth?: number;
  periodYear?: number;
}): Promise<{
  totalGross: number;
  totalTax: number;
  totalNet: number;
  accountBreakdown: Array<{
    accountId: string;
    accountName: string;
    grossInterest: number;
    taxWithheld: number;
    netInterest: number;
    isEstimated: boolean;
  }>;
}> {
  const { userId, periodMonth, periodYear } = params;

  // Get all eligible accounts
  const accounts = await db.account.findMany({
    where: {
      createdById: userId,
      type: { in: ["CASH", "INVESTMENT"] },
      deletedAt: null,
    },
    include: { yieldProfile: true },
  });

  const breakdown = await Promise.all(
    accounts.map(async (account) => {
      const interest = await getEstimatedInterestMTD({
        accountId: account.id,
        userId,
        periodMonth,
        periodYear,
      });

      return {
        accountId: account.id,
        accountName: account.name,
        grossInterest: interest?.grossInterest ?? 0,
        taxWithheld: interest?.taxWithheld ?? 0,
        netInterest: interest?.netInterest ?? 0,
        isEstimated: interest?.isEstimated ?? true,
      };
    })
  );

  return {
    totalGross: breakdown.reduce((sum, a) => sum + a.grossInterest, 0),
    totalTax: breakdown.reduce((sum, a) => sum + a.taxWithheld, 0),
    totalNet: breakdown.reduce((sum, a) => sum + a.netInterest, 0),
    accountBreakdown: breakdown.filter(a => a.grossInterest > 0),
  };
}

// ============================================
// TIME DEPOSIT HELPERS
// ============================================

/**
 * Add months to a date safely (handles month overflow)
 */
export async function addMonthsSafe(date: Date, months: number): Promise<Date> {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Calculate time deposit projection at maturity
 * Formula: gross = principal * (annualRatePct / 100) * (termMonths / 12)
 *          tax = gross * (taxRatePct / 100)
 *          net = gross - tax
 */
export async function calculateTimeDepositProjection(params: {
  principal: number;
  annualRatePct: number;
  termMonths: number;
  taxRatePct: number;
  depositStartDate: Date;
}): Promise<{
  grossInterest: number;
  taxWithheld: number;
  netInterest: number;
  maturityDate: Date;
}> {
  const { principal, annualRatePct, termMonths, taxRatePct, depositStartDate } = params;

  // Gross interest = principal * annual rate * (term / 12)
  const grossInterest = principal * (annualRatePct / 100) * (termMonths / 12);

  // Tax on interest
  const taxWithheld = grossInterest * (taxRatePct / 100);

  // Net interest after tax
  const netInterest = grossInterest - taxWithheld;

  // Maturity date from deposit start date
  const maturityDate = await addMonthsSafe(depositStartDate, termMonths);

  return {
    grossInterest: Math.round(grossInterest * 100) / 100,
    taxWithheld: Math.round(taxWithheld * 100) / 100,
    netInterest: Math.round(netInterest * 100) / 100,
    maturityDate,
  };
}
