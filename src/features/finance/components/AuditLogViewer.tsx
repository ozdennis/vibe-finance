// src/features/finance/components/AuditLogViewer.tsx
"use client";

import { formatIDR } from "../lib/utils";
import { FileText, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface AuditLog {
  id: string;
  action: string;
  model: string;
  recordId: string;
  payload: any;
  reason?: string;
  createdAt: string;
}

interface AuditLogViewerProps {
  logs: AuditLog[];
}

export function AuditLogViewer({ logs }: AuditLogViewerProps) {
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const getActionIcon = (action: string) => {
    switch (action) {
      case "BALANCE_OVERRIDE":
        return "🔄";
      case "TRANSACTION_DELETE":
        return "🗑️";
      case "TRANSACTION_CREATE":
        return "➕";
      case "TRANSACTION_UPDATE":
        return "✏️";
      default:
        return "📝";
    }
  };

  const formatPayload = (payload: any) => {
    if (!payload) return null;

    const before = payload.before;
    const after = payload.after;

    if (!before && !after) return null;

    return (
      <div className="mt-4 p-4 bg-zinc-950/80 border border-white/5 rounded-2xl text-[11px] font-mono shadow-inner overflow-hidden relative">
        {/* subtle code-like scanline effect background */}
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none"></div>
        {before && (
          <div className="mb-4 relative z-10">
            <span className="text-rose-400/80 font-bold uppercase tracking-widest text-[9px] mb-1.5 inline-block">Before:</span>
            <pre className="text-zinc-400 mt-1 overflow-x-auto bg-zinc-900/50 p-3 rounded-xl border border-white/5">
              {JSON.stringify(before, null, 2)}
            </pre>
          </div>
        )}
        {after && (
          <div className="relative z-10">
            <span className="text-emerald-400/80 font-bold uppercase tracking-widest text-[9px] mb-1.5 inline-block">After:</span>
            <pre className="text-zinc-400 mt-1 overflow-x-auto bg-zinc-900/50 p-3 rounded-xl border border-white/5">
              {JSON.stringify(after, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  };

  if (logs.length === 0) {
    return (
      <div className="glass-panel rounded-3xl p-12 text-center border-dashed border-white/10 relative overflow-hidden group">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -z-10 group-hover:bg-indigo-500/10 transition-colors duration-500"></div>
        <FileText size={42} className="mx-auto mb-5 text-zinc-600/50" />
        <p className="text-zinc-400 font-bold tracking-tight">No audit logs yet</p>
        <p className="text-zinc-500 text-xs mt-2 font-medium">
          Audit logs will appear when you modify balances or delete transactions
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-3 tracking-tight">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-inner">
            <FileText size={22} className="text-indigo-400" />
          </div>
          System Audit Trail
        </h2>
        <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-white/5">
          {logs.length} log{logs.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-4">
        {logs.map((log) => (
          <div
            key={log.id}
            className={`rounded-2xl border transition-all duration-300 overflow-hidden ${expandedLog === log.id ? 'bg-zinc-900/80 border-white/10 shadow-lg' : 'bg-zinc-900/40 border-transparent hover:bg-zinc-800/80 hover:border-white/5'}`}
          >
            <button
              onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
              className="w-full p-5 flex items-center justify-between text-left transition-colors active:scale-[0.99]"
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl drop-shadow-sm">{getActionIcon(log.action)}</span>
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="font-bold text-zinc-100 tracking-tight">{log.action.replace(/_/g, " ")}</span>
                    <span className="text-[9px] px-2 py-0.5 bg-zinc-800 border border-white/5 text-zinc-400 font-bold tracking-widest rounded-full uppercase">
                      {log.model}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-500 font-medium tracking-wide flex items-center gap-1.5">
                    {new Date(log.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                    {log.reason && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-zinc-700 mx-1"></span>
                        <span className="text-zinc-400">{log.reason}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className={`p-2 rounded-full transition-colors ${expandedLog === log.id ? 'bg-zinc-800/50 text-white' : 'text-zinc-500'}`}>
                {expandedLog === log.id ? (
                  <ChevronDown size={18} />
                ) : (
                  <ChevronRight size={18} />
                )}
              </div>
            </button>

            {expandedLog === log.id && (
              <div className="px-5 pb-5 border-t border-white/5 pt-5 animate-in slide-in-from-top-2 bg-black/20">
                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                  Record ID: <code className="text-zinc-400 bg-zinc-900 px-2 py-1 rounded-md border border-white/5 font-mono lowercase tracking-normal">{log.recordId}</code>
                </div>
                {formatPayload(log.payload)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
