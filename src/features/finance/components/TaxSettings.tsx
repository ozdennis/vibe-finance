// src/features/finance/components/TaxSettings.tsx
"use client";

import { useState, useEffect } from "react";
import { TrendingUp, DollarSign } from "lucide-react";
import { getTaxSummary, updateWithheldTaxYTD } from "../server/tax-actions";
import { formatIDR } from "../lib/utils";

interface TaxSettingsProps {
  userId: string;
}

export function TaxSettings({ userId }: TaxSettingsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [withheldTaxYtd, setWithheldTaxYtd] = useState("");
  const [taxSummary, setTaxSummary] = useState<{
    businessTaxBase: number;
    plasticRevenue: number;
    affiliateNet: number;
    interestTaxWithheld: number;
    withheldTaxYtd: number;
    businessTaxDue: number;
    year: number;
  } | null>(null);

  useEffect(() => {
    loadTaxSummary();
  }, [userId, year]);

  const loadTaxSummary = async () => {
    setIsLoading(true);
    try {
      const summary = await getTaxSummary({ userId, year });
      setTaxSummary(summary);
      setWithheldTaxYtd(summary.withheldTaxYtd.toString());
    } catch (error) {
      console.error("Failed to load tax summary:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveWithheldTax = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    try {
      const result = await updateWithheldTaxYTD({
        userId,
        year,
        withheldTaxYtd: parseFloat(withheldTaxYtd) || 0,
      });

      if (result.success) {
        await loadTaxSummary();
        alert("Withheld tax YTD updated successfully");
      } else {
        alert(result.error || "Failed to update withheld tax");
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <section className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
        <div className="flex items-center justify-center gap-3 py-8">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400">Loading tax settings...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
          <TrendingUp size={20} className="text-amber-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Tax Settings</h3>
          <p className="text-slate-400 text-xs">Business tax and withheld tax configuration</p>
        </div>
      </div>

      {/* Year Selector */}
      <div className="mb-6">
        <label className="text-slate-400 text-xs mb-2 block">Tax Year</label>
        <select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="w-full bg-slate-800 p-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-amber-500/50"
        >
          {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Business Tax Summary */}
      {taxSummary && (
        <div className="space-y-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-3">Business Tax Base Breakdown</p>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">PLASTIC REVENUE</span>
                <span className="text-white font-medium">{formatIDR(taxSummary.plasticRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">AFFILIATE (net)</span>
                <span className="text-white font-medium">{formatIDR(taxSummary.affiliateNet)}</span>
              </div>
              <div className="border-t border-slate-700 pt-2 flex justify-between">
                <span className="text-slate-300 font-semibold">Business Tax Base</span>
                <span className="text-amber-400 font-bold">{formatIDR(taxSummary.businessTaxBase)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Estimated Tax Due (22%)</span>
                <span className="text-amber-400/80">{formatIDR(taxSummary.businessTaxDue)}</span>
              </div>
            </div>
          </div>

          {/* Interest Tax Withheld */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign size={14} className="text-emerald-400" />
              <p className="text-slate-400 text-xs uppercase tracking-wider">Interest Tax Withheld YTD</p>
            </div>
            <p className="text-2xl font-bold text-emerald-400">{formatIDR(taxSummary.interestTaxWithheld)}</p>
            <p className="text-slate-500 text-xs mt-1">
              Informational only - separate from business tax calculation
            </p>
          </div>
        </div>
      )}

      {/* Withheld Tax YTD Input */}
      <form onSubmit={handleSaveWithheldTax} className="space-y-4">
        <div>
          <label className="text-slate-400 text-xs mb-2 block">
            Withheld Tax YTD (Manual Input)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">Rp</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={withheldTaxYtd}
              onChange={(e) => setWithheldTaxYtd(e.target.value)}
              placeholder="0"
              className="w-full bg-slate-800 p-3 pl-10 rounded-xl text-white outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Total tax already withheld year-to-date (subtracted from business tax due)
          </p>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 disabled:cursor-not-allowed py-3 rounded-xl font-semibold text-slate-900 transition-colors"
        >
          {isSaving ? "Saving..." : "Save Withheld Tax YTD"}
        </button>
      </form>

      {/* Info Note */}
      <div className="mt-6 bg-amber-500/5 border border-amber-500/10 rounded-xl p-4">
        <p className="text-amber-200/80 text-xs leading-relaxed">
          <strong className="text-amber-300">Business Tax Scope:</strong> Includes PLASTIC REVENUE + 
          (AFFILIATE income - AFFILIATE COST, floor at 0). Excludes SALARY and interest income/tax.
        </p>
      </div>
    </section>
  );
}
