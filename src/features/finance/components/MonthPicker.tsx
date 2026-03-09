// src/features/finance/components/MonthPicker.tsx
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface MonthPickerProps {
  currentMonth?: number;
  currentYear?: number;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function parseMonthParam(monthStr: string | null): number | undefined {
  if (!monthStr || !/^\d+$/.test(monthStr)) return undefined;
  const parsed = Number.parseInt(monthStr, 10);
  return parsed >= 1 && parsed <= 12 ? parsed : undefined;
}

function parseYearParam(yearStr: string | null): number | undefined {
  if (!yearStr || !/^\d+$/.test(yearStr)) return undefined;
  const parsed = Number.parseInt(yearStr, 10);
  return parsed >= 2000 && parsed <= 2100 ? parsed : undefined;
}

/**
 * Global temporal header component with month/year navigation
 * Syncs selection to URL search params: ?month=MM&year=YYYY
 * 
 * Read compatibility: accepts both legacy (month=3) and canonical (month=03) formats
 * Write canonical: always writes zero-padded month (MM) and 4-digit year (YYYY)
 */
export function MonthPicker({ currentMonth, currentYear }: MonthPickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const now = new Date();
  const urlMonth = parseMonthParam(searchParams.get("month"));
  const urlYear = parseYearParam(searchParams.get("year"));
  const hasValidUrlPeriod = urlMonth !== undefined && urlYear !== undefined;

  // Read compatibility: supports both month=3 and month=03; invalid/partial params fallback to current period.
  const month = currentMonth ?? (hasValidUrlPeriod ? urlMonth : undefined) ?? now.getMonth() + 1;
  const year = currentYear ?? (hasValidUrlPeriod ? urlYear : undefined) ?? now.getFullYear();

  /**
   * Format month as zero-padded 2-digit string (canonical format)
   */
  const formatMonth = (m: number): string => m.toString().padStart(2, "0");

  const handlePreviousMonth = useCallback(() => {
    let prevMonth = month - 1;
    let prevYear = year;

    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear--;
    }

    const params = new URLSearchParams(searchParams.toString());
    // Canonical format: MM (zero-padded) and YYYY (4-digit)
    params.set("month", formatMonth(prevMonth));
    params.set("year", prevYear.toString());
    router.push(`/?${params.toString()}`);
  }, [month, year, searchParams, router]);

  const handleNextMonth = useCallback(() => {
    let nextMonth = month + 1;
    let nextYear = year;

    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear++;
    }

    const params = new URLSearchParams(searchParams.toString());
    // Canonical format: MM (zero-padded) and YYYY (4-digit)
    params.set("month", formatMonth(nextMonth));
    params.set("year", nextYear.toString());
    router.push(`/?${params.toString()}`);
  }, [month, year, searchParams, router]);

  const handleResetToCurrent = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("month");
    params.delete("year");
    router.push(`/?${params.toString()}`);
  }, [searchParams, router]);

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

  return (
    <div className="flex items-center justify-between mb-8">
      {/* Previous Month */}
      <button
        onClick={handlePreviousMonth}
        className="group relative p-3 rounded-2xl glass-panel hover:bg-zinc-800/80 transition-all duration-300 active:scale-[0.97] overflow-hidden border-white/10"
        aria-label="Previous month"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full duration-700 transition-transform"></div>
        <ChevronLeft size={20} className="text-zinc-400 group-hover:text-white transition-colors relative z-10" />
      </button>

      {/* Month/Year Display */}
      <div className="flex flex-col items-center">
        <button
          onClick={handleResetToCurrent}
          className={`group relative px-6 py-3 rounded-2xl transition-all duration-300 active:scale-[0.98] ${
            isCurrentMonth
              ? "bg-zinc-800/50 border border-white/5"
              : "glass-panel hover:bg-zinc-800/80 border-white/10"
          }`}
          aria-label={isCurrentMonth ? "Current month" : "Reset to current month"}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full duration-700 transition-transform"></div>
          <span className={`text-lg font-bold tracking-tight relative z-10 ${
            isCurrentMonth ? "text-emerald-400" : "text-white"
          }`}>
            {MONTH_NAMES[month - 1]} {year}
          </span>
        </button>
        {!isCurrentMonth && (
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mt-1">
            Historical View
          </span>
        )}
      </div>

      {/* Next Month */}
      <button
        onClick={handleNextMonth}
        className="group relative p-3 rounded-2xl glass-panel hover:bg-zinc-800/80 transition-all duration-300 active:scale-[0.97] overflow-hidden border-white/10"
        aria-label="Next month"
        disabled={year === now.getFullYear() && month >= now.getMonth() + 1}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full duration-700 transition-transform"></div>
        <ChevronRight
          size={20}
          className={`relative z-10 transition-colors ${
            year === now.getFullYear() && month >= now.getMonth() + 1
              ? "text-zinc-600 cursor-not-allowed"
              : "text-zinc-400 group-hover:text-white"
          }`}
        />
      </button>
    </div>
  );
}
