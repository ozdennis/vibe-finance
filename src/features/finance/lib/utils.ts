// src/features/finance/lib/utils.ts

/**
 * Formats a number as Indonesian Rupiah (IDR)
 */
export function formatIDR(amount: number): string {
  const formatted = amount.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `Rp ${formatted}`;
}

/**
 * Formats a date to Indonesian locale
 */
export function formatDateID(date: Date | string): string {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Truncates a string with ellipsis
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

/**
 * Gets a category color based on type
 */
export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    FOOD: "text-orange-400 bg-orange-400/10",
    TRANSPORT: "text-blue-400 bg-blue-400/10",
    SHOPPING: "text-pink-400 bg-pink-400/10",
    ENTERTAINMENT: "text-purple-400 bg-purple-400/10",
    UTILITIES: "text-yellow-400 bg-yellow-400/10",
    HEALTHCARE: "text-red-400 bg-red-400/10",
    GROCERIES: "text-green-400 bg-green-400/10",
    OTHER: "text-slate-400 bg-slate-400/10",
  };
  return colors[category] || colors.OTHER;
}

/**
 * Calculate linear regression for trend analysis
 */
export function calculateLinearRegression(data: number[]): {
  slope: number;
  intercept: number;
  predict: (x: number) => number;
  rSquared: number;
} {
  const n = data.length;
  if (n < 2) {
    return { slope: 0, intercept: data[0] || 0, predict: () => data[0] || 0, rSquared: 0 };
  }

  const sumX = n * (n - 1) / 2;
  const meanX = sumX / n;
  const meanY = data.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (i - meanX) * (data[i] - meanY);
    denominator += Math.pow(i - meanX, 2);
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = meanY - slope * meanX;

  const predicted = data.map((_, i) => slope * i + intercept);
  const ssRes = data.reduce((sum, y, i) => sum + Math.pow(y - predicted[i], 2), 0);
  const ssTot = data.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return {
    slope,
    intercept,
    predict: (x: number) => slope * x + intercept,
    rSquared,
  };
}

/**
 * Project yearly income based on monthly trends
 */
export function projectYearlyIncome(monthlyIncomes: number[]): {
  projectedMonthly: number;
  projectedYearly: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
} {
  if (monthlyIncomes.length < 2) {
    const avg = monthlyIncomes[0] || 0;
    return {
      projectedMonthly: avg,
      projectedYearly: avg * 12,
      trend: 'stable',
      confidence: 0,
    };
  }

  const regression = calculateLinearRegression(monthlyIncomes);
  const projectedMonthly = Math.max(0, regression.predict(monthlyIncomes.length));
  const projectedYearly = projectedMonthly * 12;

  const slopePercent = (regression.slope / (monthlyIncomes[monthlyIncomes.length - 1] || 1)) * 100;
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (slopePercent > 5) trend = 'increasing';
  else if (slopePercent < -5) trend = 'decreasing';

  return {
    projectedMonthly,
    projectedYearly,
    trend,
    confidence: regression.rSquared,
  };
}

/**
 * Calculate Indonesian PPh 21 progressive tax
 * Based on 2024 tax brackets (UU HPP)
 */
export function calculateIndonesianTax(yearlyIncome: number): number {
  const brackets = [
    { limit: 60000000, rate: 0.05 },
    { limit: 250000000, rate: 0.15 },
    { limit: 500000000, rate: 0.25 },
    { limit: 5000000000, rate: 0.3 },
    { limit: Infinity, rate: 0.35 },
  ];

  let tax = 0;
  let remainingIncome = yearlyIncome;
  let previousLimit = 0;

  // Apply tax-free threshold (PTKP) for single individual
  const ptkp = 54000000; // Basic tax-free allowance
  const taxableIncome = Math.max(0, yearlyIncome - ptkp);

  for (const bracket of brackets) {
    const bracketRange = bracket.limit - previousLimit;
    const incomeInBracket = Math.min(remainingIncome, bracketRange);

    if (incomeInBracket > 0) {
      tax += incomeInBracket * bracket.rate;
      remainingIncome -= incomeInBracket;
    }

    previousLimit = bracket.limit;

    if (remainingIncome <= 0) break;
  }

  return Math.round(tax);
}

/**
 * Period resolver for temporal filtering
 * Returns start and end dates for a given month/year context
 */
export interface PeriodFilter {
  startDate: Date;
  endDate: Date;
  month: number;
  year: number;
  label: string;
}

/**
 * Get period filter for a specific month/year
 * @param month - 1-12 (defaults to current month)
 * @param year - YYYY (defaults to current year)
 */
export function getPeriodFilter(month?: number, year?: number): PeriodFilter {
  const now = new Date();
  const targetMonth = month ?? now.getMonth() + 1;
  const targetYear = year ?? now.getFullYear();

  // Validate month
  const safeMonth = Math.max(1, Math.min(12, targetMonth));

  // Start of month
  const startDate = new Date(targetYear, safeMonth - 1, 1);

  // End of month (start of next month)
  const endDate = new Date(targetYear, safeMonth, 0, 23, 59, 59, 999);

  // Human-readable label
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const label = `${monthNames[safeMonth - 1]} ${targetYear}`;

  return {
    startDate,
    endDate,
    month: safeMonth,
    year: targetYear,
    label,
  };
}

/**
 * Get current period filter (this month)
 */
export function getCurrentPeriodFilter(): PeriodFilter {
  return getPeriodFilter();
}

/**
 * Get previous month period filter
 */
export function getPreviousPeriodFilter(month?: number, year?: number): PeriodFilter {
  const now = new Date();
  const targetMonth = month ?? now.getMonth() + 1;
  const targetYear = year ?? now.getFullYear();

  let prevMonth = targetMonth - 1;
  let prevYear = targetYear;

  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear--;
  }

  return getPeriodFilter(prevMonth, prevYear);
}

/**
 * Get next month period filter
 */
export function getNextPeriodFilter(month?: number, year?: number): PeriodFilter {
  const now = new Date();
  const targetMonth = month ?? now.getMonth() + 1;
  const targetYear = year ?? now.getFullYear();

  let nextMonth = targetMonth + 1;
  let nextYear = targetYear;

  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear++;
  }

  return getPeriodFilter(nextMonth, nextYear);
}

/**
 * Get year-to-date period filter
 */
export function getYearToDatePeriodFilter(year?: number): PeriodFilter {
  const now = new Date();
  const targetYear = year ?? now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  return getPeriodFilter(currentMonth, targetYear);
}
