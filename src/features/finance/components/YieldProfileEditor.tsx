// src/features/finance/components/YieldProfileEditor.tsx
"use client";

import { useState, useEffect } from "react";
import { X, TrendingUp, Percent, Calendar, Clock } from "lucide-react";
import { upsertYieldProfile, getYieldProfile } from "../server/yield-actions";

interface YieldProfileEditorProps {
  accountId: string;
  userId: string;
  accountType: "CASH" | "INVESTMENT";
  accountName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function YieldProfileEditor({
  accountId,
  userId,
  accountType,
  accountName,
  onClose,
  onSuccess,
}: YieldProfileEditorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    rateValue: "",
    rateUnit: "MONTHLY" as "MONTHLY" | "YEARLY",
    withholdingTaxRatePct: "",
    accrualStartDate: new Date().toISOString().split("T")[0],
    isActive: true,
    productType: "FLEXI" as "FLEXI" | "TIME_DEPOSIT",
    depositTermMonths: "",
    depositStartDate: new Date().toISOString().split("T")[0],
    depositPrincipal: "",
  });

  useEffect(() => {
    loadYieldProfile();
  }, [accountId]);

  const loadYieldProfile = async () => {
    setIsLoading(true);
    try {
      const profile = await getYieldProfile({ accountId, userId });
      if (profile) {
        setFormData({
          rateValue: profile.rateValue?.toString() || "",
          rateUnit: profile.rateUnit as "MONTHLY" | "YEARLY",
          withholdingTaxRatePct: profile.withholdingTaxRatePct?.toString() || "",
          accrualStartDate: profile.accrualStartDate
            ? new Date(profile.accrualStartDate).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          isActive: profile.isActive ?? true,
          productType: profile.productType as "FLEXI" | "TIME_DEPOSIT" || "FLEXI",
          depositTermMonths: profile.depositTermMonths?.toString() || "",
          depositStartDate: profile.depositStartDate
            ? new Date(profile.depositStartDate).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          depositPrincipal: profile.depositPrincipal?.toString() || "",
        });
      }
    } catch (error) {
      console.error("Failed to load yield profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await upsertYieldProfile({
        accountId,
        userId,
        rateValue: parseFloat(formData.rateValue) || 0,
        rateUnit: formData.rateUnit,
        withholdingTaxRatePct: parseFloat(formData.withholdingTaxRatePct) || 0,
        accrualStartDate: formData.accrualStartDate,
        isActive: formData.isActive,
        productType: formData.productType,
        depositTermMonths: formData.productType === "TIME_DEPOSIT" ? parseInt(formData.depositTermMonths) : undefined,
        depositStartDate: formData.productType === "TIME_DEPOSIT" ? formData.depositStartDate : undefined,
        depositPrincipal: formData.productType === "TIME_DEPOSIT" ? parseFloat(formData.depositPrincipal) : undefined,
      });

      if (result.success) {
        onSuccess();
        onClose();
      } else {
        alert(result.error || "Failed to save yield profile");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-800 p-8">
          <div className="flex items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400">Loading yield profile...</p>
          </div>
        </div>
      </div>
    );
  }

  const isTimeDeposit = formData.productType === "TIME_DEPOSIT";
  const isCashAccount = accountType === "CASH";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-800 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp size={20} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Interest Settings</h3>
              <p className="text-slate-400 text-xs">{accountName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Product Type Selector - Only for INVESTMENT */}
          {!isCashAccount && (
            <div>
              <label className="text-slate-400 text-xs mb-2 block">
                Product Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, productType: "FLEXI", rateUnit: "MONTHLY" })}
                  className={`p-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                    formData.productType === "FLEXI"
                      ? "bg-emerald-500 text-slate-900"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  <TrendingUp size={16} />
                  <span className="text-sm font-medium">Flexi</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, productType: "TIME_DEPOSIT", rateUnit: "YEARLY" })}
                  className={`p-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                    formData.productType === "TIME_DEPOSIT"
                      ? "bg-emerald-500 text-slate-900"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  <Clock size={16} />
                  <span className="text-sm font-medium">Time Deposit</span>
                </button>
              </div>
            </div>
          )}

          {/* Info Banner */}
          <div className={`rounded-xl p-4 ${
            isTimeDeposit
              ? "bg-indigo-500/10 border border-indigo-500/20"
              : "bg-emerald-500/10 border border-emerald-500/20"
          }`}>
            <p className={`text-xs leading-relaxed ${
              isTimeDeposit ? "text-indigo-300" : "text-emerald-300"
            }`}>
              <strong className={isTimeDeposit ? "text-indigo-200" : "text-emerald-200"}>
                {isTimeDeposit ? "Time Deposit" : "Flexi Interest"}
              </strong>
              {isTimeDeposit
                ? " Fixed term (1/3/6/12 months). Interest projected at maturity, not monthly accrual."
                : " Flexible interest accrual with monthly or yearly rates."}
            </p>
          </div>

          {/* Interest Rate */}
          <div>
            <label className="text-slate-400 text-xs mb-2 block">
              Interest Rate (%)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.rateValue}
                onChange={(e) =>
                  setFormData({ ...formData, rateValue: e.target.value })
                }
                placeholder="0.00"
                className="w-full bg-slate-800 p-3 pl-3 pr-10 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                required
              />
              <Percent size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
          </div>

          {/* Rate Unit - Disabled for TIME_DEPOSIT */}
          <div>
            <label className="text-slate-400 text-xs mb-2 block">Rate Period</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, rateUnit: "MONTHLY" })}
                disabled={isTimeDeposit}
                className={`p-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  formData.rateUnit === "MONTHLY" && !isTimeDeposit
                    ? "bg-emerald-500 text-slate-900"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                } ${isTimeDeposit ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span className="text-sm font-medium">Monthly</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, rateUnit: "YEARLY" })}
                className={`p-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  formData.rateUnit === "YEARLY"
                    ? "bg-emerald-500 text-slate-900"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                <span className="text-sm font-medium">Yearly (APY)</span>
              </button>
            </div>
            {isTimeDeposit && (
              <p className="text-slate-500 text-xs mt-1">
                Time deposits use annual rate only
              </p>
            )}
          </div>

          {/* TIME_DEPOSIT specific fields */}
          {isTimeDeposit && (
            <>
              {/* Deposit Principal */}
              <div>
                <label className="text-slate-400 text-xs mb-2 block">
                  Deposit Principal
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.depositPrincipal}
                  onChange={(e) =>
                    setFormData({ ...formData, depositPrincipal: e.target.value })
                  }
                  placeholder="0"
                  className="w-full bg-slate-800 p-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                  required
                />
              </div>

              {/* Deposit Term */}
              <div>
                <label className="text-slate-400 text-xs mb-2 block">
                  Deposit Term (months)
                </label>
                <select
                  value={formData.depositTermMonths}
                  onChange={(e) =>
                    setFormData({ ...formData, depositTermMonths: e.target.value })
                  }
                  className="w-full bg-slate-800 p-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                  required
                >
                  <option value="">Select term</option>
                  <option value="1">1 Month</option>
                  <option value="3">3 Months</option>
                  <option value="6">6 Months</option>
                  <option value="12">12 Months</option>
                </select>
              </div>

              {/* Deposit Start Date */}
              <div>
                <label className="text-slate-400 text-xs mb-2 block">
                  Deposit Start Date
                </label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="date"
                    value={formData.depositStartDate}
                    onChange={(e) =>
                      setFormData({ ...formData, depositStartDate: e.target.value })
                    }
                    className="w-full bg-slate-800 p-3 pl-10 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                    required
                  />
                </div>
              </div>
            </>
          )}

          {/* Withholding Tax Rate */}
          <div>
            <label className="text-slate-400 text-xs mb-2 block">
              Withholding Tax Rate (%)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.withholdingTaxRatePct}
                onChange={(e) =>
                  setFormData({ ...formData, withholdingTaxRatePct: e.target.value })
                }
                placeholder="0.0"
                className="w-full bg-slate-800 p-3 pl-3 pr-10 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <Percent size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
            <p className="text-slate-500 text-xs mt-1">
              Tax automatically withheld from interest earnings
            </p>
          </div>

          {/* Accrual Start Date - Only for FLEXI */}
          {!isTimeDeposit && (
            <div>
              <label className="text-slate-400 text-xs mb-2 block">
                Accrual Start Date
              </label>
              <input
                type="date"
                value={formData.accrualStartDate}
                onChange={(e) =>
                  setFormData({ ...formData, accrualStartDate: e.target.value })
                }
                className="w-full bg-slate-800 p-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                required
              />
              <p className="text-slate-500 text-xs mt-1">
                Interest will accrue from this date onwards
              </p>
            </div>
          )}

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
            <div>
              <p className="text-white text-sm font-medium">Active</p>
              <p className="text-slate-500 text-xs">Enable interest accrual</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
              className={`w-12 h-6 rounded-full transition-colors ${
                formData.isActive
                  ? "bg-emerald-500"
                  : "bg-slate-700"
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                  formData.isActive ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 disabled:cursor-not-allowed py-3 rounded-xl font-semibold text-slate-900 transition-colors"
          >
            {isSubmitting ? "Saving..." : "Save Interest Settings"}
          </button>
        </form>
      </div>
    </div>
  );
}
