// src/features/finance/components/ErrorBoundary.tsx
"use client";

import { Component, ErrorInfo, ReactNode, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.name || "Unknown"}]`, error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[200px] flex items-center justify-center p-6 bg-zinc-950/80 rounded-3xl border border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.05)] relative overflow-hidden group">
          {/* Subtle error glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

          <div className="text-center relative z-10">
            <div className="inline-flex p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 shadow-inner mb-5">
              <AlertTriangle className="w-10 h-10 text-rose-500 drop-shadow-sm" />
            </div>
            <h3 className="text-xl font-bold text-zinc-100 tracking-tight mb-2">
              Something went wrong
            </h3>
            <p className="text-zinc-500 text-sm font-medium mb-6 max-w-sm mx-auto leading-relaxed">
              {this.state.error?.message || "An unexpected error occurred while rendering this component."}
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2.5 bg-zinc-100 hover:bg-white text-zinc-900 px-6 py-2.5 rounded-2xl font-bold tracking-wide transition-all active:scale-95 shadow-md"
            >
              <RefreshCw size={18} />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Simple error boundary hook for functional components
export function useErrorBoundary() {
  const [error, setError] = useState<Error | null>(null);

  const handleError = (err: Error) => {
    setError(err);
  };

  const reset = () => {
    setError(null);
  };

  return { error, handleError, reset };
}
