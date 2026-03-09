// src/features/finance/server/tax-actions.ts
"use server";

import { db } from "@/lib/db";
import { getPeriodFilter } from "../lib/utils";

/**
 * Calculate Business Tax YTD based on locked scope:
 * - Include PLASTIC REVENUE as gross income
 * - Include AFFILIATE as net = AFFILIATE income - AFFILIATE COST expense (floor at 0)
 * - Exclude SALARY
 * - Exclude interest income/tax from business-tax base
 *
 * Formula: Business Tax Base = PLASTIC REVENUE + max(0, AFFILIATE income - AFFILIATE COST)
 * 
 * Period handling:
 * - start = Jan 1 of target year
 * - end = end of selected month (if month provided), otherwise end of current month for target year
 */
export async function getBusinessTaxYTD(params: {
  userId: string;
  year?: number;
  month?: number;
}): Promise<{
  plasticRevenue: number;
  affiliateIncome: number;
  affiliateCost: number;
  affiliateNet: number;
  businessTaxBase: number;
  // Breakdown for UI display
  breakdown: {
    plasticRevenue: number;
    affiliateIncome: number;
    affiliateCost: number;
  };
}> {
  const { userId, year, month } = params;
  const targetYear = year ?? new Date().getFullYear();

  const yearStart = new Date(targetYear, 0, 1);
  
  // End date: end of selected month if provided, otherwise end of current month
  let yearEnd: Date;
  if (month) {
    const periodFilter = getPeriodFilter(month, targetYear);
    yearEnd = periodFilter.endDate;
  } else {
    // Default to end of current month in target year
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const periodFilter = getPeriodFilter(currentMonth, targetYear);
    yearEnd = periodFilter.endDate;
  }

  // Get categories
  const categories = await db.category.findMany({
    where: { createdById: userId },
  });

  const plasticRevenueCat = categories.find(c => c.name === "PLASTIC REVENUE");
  const affiliateIncomeCat = categories.find(c => c.name === "AFFILIATE");
  const affiliateCostCat = categories.find(c => c.name === "AFFILIATE COST");

  // Get transactions for the year
  const transactions = await db.transaction.findMany({
    where: {
      createdById: userId,
      date: { gte: yearStart, lte: yearEnd },
      type: { in: ["INCOME", "EXPENSE"] },
    },
    select: {
      amount: true,
      type: true,
      categoryId: true,
    },
  });

  // Calculate PLASTIC REVENUE (INCOME only)
  let plasticRevenue = 0;
  if (plasticRevenueCat) {
    plasticRevenue = transactions
      .filter(tx => tx.categoryId === plasticRevenueCat.id && tx.type === "INCOME")
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
  }

  // Calculate AFFILIATE income
  let affiliateIncome = 0;
  if (affiliateIncomeCat) {
    affiliateIncome = transactions
      .filter(tx => tx.categoryId === affiliateIncomeCat.id && tx.type === "INCOME")
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
  }

  // Calculate AFFILIATE COST (EXPENSE only)
  let affiliateCost = 0;
  if (affiliateCostCat) {
    affiliateCost = transactions
      .filter(tx => tx.categoryId === affiliateCostCat.id && tx.type === "EXPENSE")
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
  }

  // Affiliate net = income - cost (floor at 0)
  const affiliateNet = Math.max(0, affiliateIncome - affiliateCost);

  // Business tax base = PLASTIC REVENUE + affiliate net
  const businessTaxBase = plasticRevenue + affiliateNet;

  return {
    plasticRevenue,
    affiliateIncome,
    affiliateCost,
    affiliateNet,
    businessTaxBase,
    breakdown: {
      plasticRevenue,
      affiliateIncome,
      affiliateCost,
    },
  };
}

/**
 * Get total interest tax withheld YTD
 * This is informational only - separate from business tax
 */
export async function getInterestTaxWithheldYTD(params: {
  userId: string;
  year?: number;
}): Promise<{
  totalTaxWithheld: number;
  postings: Array<{
    accountId: string;
    accountName: string;
    taxWithheld: number;
    month: number;
  }>;
}> {
  const { userId, year } = params;
  const targetYear = year ?? new Date().getFullYear();

  const postings = await db.interestPosting.findMany({
    where: {
      createdById: userId,
      year: targetYear,
      isEstimated: false,
    },
    include: {
      account: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const breakdown = postings.map(p => ({
    accountId: p.accountId,
    accountName: p.account.name,
    taxWithheld: Number(p.taxWithheld),
    month: p.month,
  }));

  const totalTaxWithheld = postings.reduce((sum, p) => sum + Number(p.taxWithheld), 0);

  return {
    totalTaxWithheld,
    postings: breakdown,
  };
}

/**
 * Get or create TaxYearSetting for a user/year
 */
export async function getOrCreateTaxYearSetting(params: {
  userId: string;
  year: number;
}): Promise<{
  id: string;
  year: number;
  withheldTaxYtd: number;
}> {
  const { userId, year } = params;

  const existing = await db.taxYearSetting.findFirst({
    where: { createdById: userId, year },
  });

  if (existing) {
    return {
      id: existing.id,
      year: existing.year,
      withheldTaxYtd: Number(existing.withheldTaxYtd),
    };
  }

  const created = await db.taxYearSetting.create({
    data: {
      createdById: userId,
      year,
      withheldTaxYtd: 0,
    },
  });

  return {
    id: created.id,
    year: created.year,
    withheldTaxYtd: Number(created.withheldTaxYtd),
  };
}

/**
 * Update Withheld Tax YTD for a year
 */
export async function updateWithheldTaxYTD(params: {
  userId: string;
  year: number;
  withheldTaxYtd: number;
}): Promise<{
  success: boolean;
  error?: string;
  withheldTaxYtd?: number;
}> {
  try {
    const { userId, year, withheldTaxYtd } = params;

    if (withheldTaxYtd < 0) {
      return { success: false, error: "Withheld tax cannot be negative" };
    }

    await db.taxYearSetting.upsert({
      where: {
        createdById_year: {
          createdById: userId,
          year,
        },
      },
      update: {
        withheldTaxYtd,
      },
      create: {
        createdById: userId,
        year,
        withheldTaxYtd,
      },
    });

    return {
      success: true,
      withheldTaxYtd,
    };
  } catch (error) {
    console.error("updateWithheldTaxYTD error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to update withheld tax" };
  }
}

/**
 * Get comprehensive tax summary for UI display
 */
export async function getTaxSummary(params: {
  userId: string;
  year?: number;
  month?: number;
}): Promise<{
  // Business Tax
  businessTaxBase: number;
  plasticRevenue: number;
  affiliateNet: number;
  // Interest Tax
  interestTaxWithheld: number;
  // Withheld Tax YTD (manual input)
  withheldTaxYtd: number;
  // Calculated business tax due (simplified - apply flat rate for now)
  businessTaxDue: number;
  year: number;
}> {
  const { userId, year, month } = params;
  const targetYear = year ?? new Date().getFullYear();

  const [businessTax, interestTax, taxSetting] = await Promise.all([
    getBusinessTaxYTD({ userId, year: targetYear, month }),
    getInterestTaxWithheldYTD({ userId, year: targetYear }),
    getOrCreateTaxYearSetting({ userId, year: targetYear }),
  ]);

  // Simplified business tax calculation (flat 22% corporate rate for Indonesia)
  // In production, this would use progressive brackets
  const businessTaxRate = 0.22;
  const businessTaxDue = businessTax.businessTaxBase * businessTaxRate;

  return {
    businessTaxBase: businessTax.businessTaxBase,
    plasticRevenue: businessTax.plasticRevenue,
    affiliateNet: businessTax.affiliateNet,
    interestTaxWithheld: interestTax.totalTaxWithheld,
    withheldTaxYtd: taxSetting.withheldTaxYtd,
    businessTaxDue: Math.round(businessTaxDue * 100) / 100,
    year: targetYear,
  };
}
