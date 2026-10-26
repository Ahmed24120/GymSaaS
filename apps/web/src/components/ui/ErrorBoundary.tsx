'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div
          className="p-8 my-4 rounded-3xl bg-surface-card border border-rose-500/30 text-center space-y-4"
          dir="rtl"
        >
          <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {this.props.fallbackTitle || 'حدث خطأ أثناء تحميل هذا القسم'}
            </h3>
            <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
              {this.props.fallbackMessage ||
                this.state.error?.message ||
                'يرجى إعادة المحاولة أو التواصل مع الدعم الفني.'}
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-surface-dark border border-surface-border text-xs font-bold text-gray-300 hover:text-white hover:border-gray-500 inline-flex items-center gap-2 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
