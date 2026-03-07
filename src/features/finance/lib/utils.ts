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
