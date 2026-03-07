// src/features/finance/components/QuickLogDrawer.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "vaul";
import { useForm } from "react-hook-form";
import { Plus, X, Camera, Upload } from "lucide-react";
import { createTransaction } from "../server/actions";
import { parseReceiptImage } from "../server/ai-actions";
import { CategorySearch } from "./CategorySearch";
import { Decimal } from "@prisma/client/runtime/library";

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number | Decimal;
}

interface QuickLogDrawerProps {
  accounts: Account[];
  categories: { id: string; name: string }[];
}

interface FormData {
  amount: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  description?: string;
  date: string; // ISO date format YYYY-MM-DD
}

export function QuickLogDrawer({ accounts, categories }: QuickLogDrawerProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      amount: "",
      type: "EXPENSE",
      accountId: "",
      toAccountId: "",
      date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD
    },
  });

  const transactionType = watch("type");
  const fromAccountId = watch("accountId");

  // Auto-focus amount field when drawer opens
  useEffect(() => {
    if (isOpen && amountInputRef.current) {
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 300);
    }
  }, [isOpen]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      reset();
    }
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;

        // Parse with AI
        const result = await parseReceiptImage(base64);

        if (result.success && result.data) {
          setValue("amount", result.data.amount.toString());
          setValue("description", result.data.merchant);
          // Auto-select category if found
          const matchedCategory = categories.find(
            (c) => c.name === result.data!.category
          );
          if (matchedCategory) {
            setValue("categoryId", matchedCategory.id);
          }
        }

        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Image upload failed:", error);
      setUploadingImage(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsProcessing(true);

    try {
      // Client-side validation
      if (!data.amount || parseFloat(data.amount) <= 0) {
        alert('❌ Please enter a valid amount greater than 0');
        setIsProcessing(false);
        return;
      }

      if (!data.accountId) {
        alert('❌ Please select an account');
        setIsProcessing(false);
        return;
      }

      if (data.type === 'TRANSFER' && !data.toAccountId) {
        alert('❌ Please select destination account for transfer');
        setIsProcessing(false);
        return;
      }

      const result = await createTransaction({
        amount: parseFloat(data.amount),
        type: data.type,
        accountId: data.accountId,
        toAccountId: data.type === "TRANSFER" ? data.toAccountId : undefined,
        categoryId: data.categoryId,
        description: data.description,
        date: data.date,
        userId: "user_123",
      });

      if (result.success) {
        // Show success message
        const messages = {
          INCOME: `✅ Income of Rp ${Number(data.amount).toLocaleString('id-ID')} added!`,
          EXPENSE: `✅ Expense of Rp ${Number(data.amount).toLocaleString('id-ID')} recorded!`,
          TRANSFER: `✅ Transfer of Rp ${Number(data.amount).toLocaleString('id-ID')} completed!`,
        };
        alert(messages[data.type]);

        setIsOpen(false);
        reset();
        // Refresh server data and re-render
        router.refresh();
      } else {
        // Show specific error
        alert('❌ ' + result.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert('❌ Failed: ' + message);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredAccounts = accounts.filter((acc) => {
    if (transactionType === "TRANSFER") {
      // For TRANSFER: All account types can be source OR target
      // You can pull from investments, cash, e-wallets, etc.
      return true;
    }
    return true; // INCOME and EXPENSE can use any account
  });

  // For transfer "To Account" dropdown - exclude currently selected "From" account
  const transferTargetAccounts = transactionType === "TRANSFER"
    ? accounts.filter(acc => acc.id !== fromAccountId)
    : [];

  // Debug: Log available accounts
  useEffect(() => {
    console.log('=== QuickLogDrawer Debug ===');
    console.log('Transaction Type:', transactionType);
    console.log('Available accounts:', accounts.length);
    accounts.forEach(acc => console.log('  -', acc.name, acc.type, '| Balance:', acc.balance));
    console.log('Filtered accounts for', transactionType, ':', filteredAccounts.length);
    if (transactionType === 'TRANSFER') {
      console.log('Transfer target accounts (excluding from):', transferTargetAccounts.length);
      transferTargetAccounts.forEach(acc => console.log('  →', acc.name, acc.type));
    }
  }, [transactionType, accounts, filteredAccounts, fromAccountId, transferTargetAccounts]);

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-16 w-16 bg-indigo-500 rounded-full shadow-[0_8px_32px_rgba(99,102,241,0.4)] flex items-center justify-center text-white hover:bg-indigo-400 active:scale-90 transition-all z-40 hover:shadow-[0_8px_40px_rgba(99,102,241,0.6)] group"
        aria-label="Add Transaction"
      >
        <Plus size={32} className="group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Drawer */}
      <Drawer.Root open={isOpen} onOpenChange={handleOpenChange}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-40" />
          <Drawer.Content className="glass-panel flex flex-col rounded-t-[40px] h-[85vh] fixed bottom-0 left-0 right-0 z-50 outline-none border-t border-white/10 shadow-[0_-10px_50px_rgba(0,0,0,0.5)]">
            {/* Drag handle */}
            <div className="mx-auto w-16 h-1.5 flex-shrink-0 rounded-full bg-zinc-700 mb-8 mt-5" />

            {/* Required DialogTitle for accessibility */}
            <Drawer.Title className="sr-only">Quick Log Transaction</Drawer.Title>

            <div className="flex items-center justify-between px-8 mb-6">
              <h3 className="text-2xl font-bold text-white tracking-tight">Quick Log</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-zinc-800 rounded-full transition-all active:scale-90"
              >
                <X size={24} className="text-zinc-400 hover:text-white" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex-1 overflow-y-auto px-8 pb-8 space-y-8 scrollbar-hide"
            >
              {/* Amount Input - Large Numpad Trigger */}
              <div>
                <label className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-3 block">
                  Amount (IDR)
                </label>
                <input
                  {...register("amount", { required: "Amount is required" })}
                  ref={(e) => {
                    amountInputRef.current = e;
                    register("amount").ref(e);
                  }}
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  className="w-full bg-transparent text-6xl md:text-7xl font-bold tracking-tighter text-white border-b border-white/10 pb-4 outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-800"
                />
                {errors.amount && (
                  <p className="text-rose-400 text-xs mt-2 font-medium">
                    {errors.amount.message}
                  </p>
                )}
              </div>

              {/* Receipt Upload */}
              <div className="flex gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="flex-1 bg-zinc-800/50 hover:bg-zinc-800 border border-white/5 disabled:opacity-50 py-4 px-4 rounded-2xl flex items-center justify-center gap-3 text-zinc-300 transition-all active:scale-[0.98]"
                >
                  {uploadingImage ? (
                    <span className="text-sm font-medium tracking-wide">Scanning AI...</span>
                  ) : (
                    <>
                      <Camera size={20} className="text-indigo-400" />
                      <span className="text-sm font-medium tracking-wide">Scan Receipt</span>
                    </>
                  )}
                </button>
              </div>

              {/* Transaction Type */}
              <div className="grid grid-cols-3 gap-3 p-1 bg-zinc-900/50 border border-white/5 rounded-2xl">
                {(["EXPENSE", "INCOME", "TRANSFER"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setValue("type", type)}
                    className={`py-3 rounded-xl text-xs md:text-sm font-bold tracking-wider transition-all duration-300 ${transactionType === type
                      ? type === "EXPENSE"
                        ? "bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                        : type === "INCOME"
                          ? "bg-emerald-500 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                          : "bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                      : "bg-transparent text-zinc-500 hover:text-zinc-300"
                      }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Account Select */}
              <div>
                <label className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-3 block">
                  {transactionType === "TRANSFER" ? "From Account" : "Account"}
                </label>
                <select
                  {...register("accountId", {
                    required: "Please select an account",
                  })}
                  className="w-full bg-zinc-900/50 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none"
                >
                  <option value="" className="bg-zinc-900 text-zinc-500">Select account</option>
                  {filteredAccounts.length === 0 ? (
                    <option disabled value="" className="bg-zinc-900">No accounts available - add an account first</option>
                  ) : (
                    filteredAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id} className="bg-zinc-900 hover:bg-indigo-500">
                        {acc.name} ({acc.type.replace('_', ' ')}) - Rp {Number(acc.balance).toLocaleString('id-ID')}
                      </option>
                    ))
                  )}
                </select>
                {errors.accountId && (
                  <p className="text-rose-400 text-xs mt-2 font-medium">
                    {errors.accountId.message}
                  </p>
                )}
              </div>

              {/* To Account Select (Transfer only) */}
              {transactionType === "TRANSFER" && (
                <div>
                  <label className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-3 block">
                    To Account
                  </label>
                  <select
                    {...register("toAccountId", {
                      required: "Please select a destination account",
                    })}
                    className="w-full bg-zinc-900/50 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none"
                  >
                    <option value="" className="bg-zinc-900 text-zinc-500">Select destination account</option>
                    {transferTargetAccounts.length === 0 ? (
                      <option disabled value="" className="bg-zinc-900">No destination accounts available</option>
                    ) : (
                      transferTargetAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id} className="bg-zinc-900 hover:bg-indigo-500">
                          {acc.name} ({acc.type.replace('_', ' ')}) - Rp {Number(acc.balance).toLocaleString('id-ID')}
                        </option>
                      ))
                    )}
                  </select>
                  {errors.toAccountId && (
                    <p className="text-rose-400 text-xs mt-2 font-medium">
                      {errors.toAccountId.message}
                    </p>
                  )}
                </div>
              )}

              {/* Transaction Date */}
              <div>
                <label className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-3 block">
                  Date
                </label>
                <input
                  {...register("date", { required: "Date is required" })}
                  type="date"
                  className="w-full bg-zinc-900/50 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                {errors.date && (
                  <p className="text-rose-400 text-xs mt-2 font-medium">
                    {errors.date.message}
                  </p>
                )}
              </div>

              {/* Category Search with Fuse.js */}
              <CategorySearch
                categories={categories}
                onSelect={(id) => setValue("categoryId", id)}
                selectedId={watch("categoryId")}
              />

              {/* Description */}
              <div>
                <label className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-3 block">
                  Description (optional)
                </label>
                <input
                  {...register("description")}
                  type="text"
                  placeholder="What was this for?"
                  className="w-full bg-zinc-900/50 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-zinc-600"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed py-5 rounded-2xl font-bold tracking-wide text-white active:scale-95 transition-all mt-8 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)]"
              >
                {isProcessing ? "Processing Vault Entry..." : "Submit Transaction"}
              </button>
            </form>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
