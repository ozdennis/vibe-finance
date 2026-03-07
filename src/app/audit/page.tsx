// src/app/audit/page.tsx
import { Suspense } from "react";
import { getAuditLogs } from "@/features/finance/server/queries";
import { AuditLogViewer } from "@/features/finance/components/AuditLogViewer";
import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";

const MOCK_USER_ID = "user_123";

export default async function AuditPage() {
  let logs: any[] = [];

  try {
    logs = await getAuditLogs(MOCK_USER_ID);
  } catch (error) {
    console.error("Failed to load audit logs:", error);
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
          <FileText size={24} className="text-blue-400" />
          Audit Trail
        </h1>
      </div>

      {/* Audit Log Viewer */}
      <Suspense fallback={
        <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-8 animate-pulse">
          <div className="w-40 h-6 bg-slate-800 rounded mb-4" />
          <div className="w-full h-32 bg-slate-800 rounded" />
        </div>
      }>
        <AuditLogViewer logs={logs} />
      </Suspense>
    </div>
  );
}
