import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || '알 수 없는 오류가 발생했습니다.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Application ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-[#B91C1C]">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h1 className="text-base font-bold text-[#0F172A]">
                데이터 처리 중 문제가 발생했습니다
              </h1>
            </div>
            <p className="text-sm text-[#475569] leading-relaxed">
              Firebase 데이터베이스 동기화 또는 권한 확인 중 오류가 발생했습니다.
              새로고침하여 다시 연결해 주세요.
            </p>
            <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-mono text-[#64748B] break-all max-h-32 overflow-y-auto">
              {this.state.errorMessage}
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full h-10 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-[#FFFFFF] text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>페이지 새로고침</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
