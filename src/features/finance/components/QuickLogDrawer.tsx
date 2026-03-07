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
        className="fixed bottom-6 right-6 h-16 w-16 bg-emerald-500 rounded-full shadow-2xl flex items-center justify-center text-white hover:bg-emerald-600 active:scale-95 transition-all z-40"
        aria-label="Add Transaction"
      >
        <Plus size={32} />
      </button>

      {/* Drawer */}
      <Drawer.Root open={isOpen} onOpenChange={handleOpenChange}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
          <Drawer.Content className="bg-slate-900 flex flex-col rounded-t-[32px] h-[85vh] fixed bottom-0 left-0 right-0 z-50 outline-none border-t border-slate-800">
            {/* Drag handle */}
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-slate-700 mb-6 mt-4" />

            {/* Required DialogTitle for accessibility */}
            <Drawer.Title className="sr-only">Quick Log Transaction</Drawer.Title>

            <div className="flex items-center justify-between px-6 mb-6">
              <h3 className="text-xl font-bold text-white">Quick Log</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex-1 overflow-y-auto px-6 pb-6 space-y-6"
            >
              {/* Amount Input - Large Numpad Trigger */}
              <div>
                <label className="text-slate-400 text-xs mb-2 block">
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
                  className="w-full bg-transparent text-5xl font-bold text-white border-b border-slate-700 pb-4 outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-700"
                />
                {errors.amount && (
                  <p className="text-rose-400 text-xs mt-2">
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
                  className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-slate-300 transition-colors"
                >
                  {uploadingImage ? (
                    <span className="text-sm">Scanning...</span>
                  ) : (
                    <>
                      <Camera size={18} />
                      <span className="text-sm">Scan Receipt</span>
                    </>
                  )}
                </button>
              </div>

              {/* Transaction Type */}
              <div className="grid grid-cols-3 gap-2">
                {(["EXPENSE", "INCOME", "TRANSFER"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setValue("type", type)}
                    className={`py-3 rounded-xl text-sm font-semibold transition-all ${
                      transactionType === type
                        ? type === "EXPENSE"
                          ? "bg-rose-500 text-white"
                          : type === "INCOME"
                          ? "bg-emerald-500 text-white"
                          : "bg-blue-500 text-white"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Account Select */}
              <div>
                <label className="text-slate-400 text-xs mb-2 block">
                  {transactionType === "TRANSFER" ? "From Account" : "Account"}
                </label>
                <select
                  {...register("accountId", {
                    required: "Please select an account",
                  })}
                  className="w-full bg-slate-800 p-4 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="">Select account</option>
                  {filteredAccounts.length === 0 ? (
                    <option disabled value="">No accounts available - add an account first</option>
                  ) : (
                    filteredAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type}) - Rp {Number(acc.balance).toLocaleString('id-ID')}
                      </option>
                    ))
                  )}
                </select>
                {errors.accountId && (
                  <p className="text-rose-400 text-xs mt-2">
                    {errors.accountId.message}
                  </p>
                )}
              </div>

              {/* To Account Select (Transfer only) */}
              {transactionType === "TRANSFER" && (
                <div>
                  <label className="text-slate-400 text-xs mb-2 block">
                    To Account
                  </label>
                  <select
                    {...register("toAccountId", {
                      required: "Please select a destination account",
                    })}
                    className="w-full bg-slate-800 p-4 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <option value="">Select destination account</option>
                    {transferTargetAccounts.length === 0 ? (
                      <option disabled value="">No destination accounts available</option>
                    ) : (
                      transferTargetAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.type}) - Rp {Number(acc.balance).toLocaleString('id-ID')}
                        </option>
                      ))
                    )}
                  </select>
                  {errors.toAccountId && (
                    <p className="text-rose-400 text-xs mt-2">
                      {errors.toAccountId.message}
                    </p>
                  )}
                </div>
              )}

              {/* Transaction Date */}
              <div>
                <label className="text-slate-400 text-xs mb-2 block">
                  Date
                </label>
                <input
                  {...register("date", { required: "Date is required" })}
                  type="date"
                  className="w-full bg-slate-800 p-4 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                {errors.date && (
                  <p className="text-rose-400 text-xs mt-2">
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
                <label className="text-slate-400 text-xs mb-2 block">
                  Description (optional)
                </label>
                <input
                  {...register("description")}
                  type="text"
                  placeholder="What was this for?"
                  className="w-full bg-slate-800 p-4 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-2xl font-bold text-slate-900 active:scale-95 transition-all mt-4"
              >
                {isProcessing ? "Processing..." : "Record Transaction"}
              </button>
            </form>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
