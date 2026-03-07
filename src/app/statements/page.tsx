// src/app/statements/page.tsx
import { Suspense } from "react";
import { getCreditCardStatements } from "@/features/finance/server/queries";
import { CreditCardStatementManager } from "@/features/finance/components/CreditCardStatementManager";
import { ArrowLeft, CreditCard } from "lucide-react";
import Link from "next/link";

const MOCK_USER_ID = "user_123";

export default async function StatementsPage() {
  let statements: any[] = [];

  try {
    statements = await getCreditCardStatements(MOCK_USER_ID);
  } catch (error) {
    console.error("Failed to load statements:", error);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/"
          className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
          aria-label="Back to Dashboard"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CreditCard size={24} className="text-rose-400" />
          Credit Card Statements
        </h1>
      </div>

      {/* Statement Manager */}
      <Suspense fallback={
        <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-8 animate-pulse">
          <div className="w-40 h-6 bg-slate-800 rounded mb-4" />
          <div className="w-full h-32 bg-slate-800 rounded" />
        </div>
      }>
        <CreditCardStatementManager statements={statements} userId={MOCK_USER_ID} />
      </Suspense>
    </div>
  );
}
