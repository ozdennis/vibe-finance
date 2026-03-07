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
        <div className="min-h-[200px] flex items-center justify-center bg-slate-900/50 rounded-2xl border border-rose-500/30 p-6">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Something went wrong
            </h3>
            <p className="text-slate-400 text-sm mb-4 max-w-md">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-900 px-4 py-2 rounded-xl font-semibold transition-colors"
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
