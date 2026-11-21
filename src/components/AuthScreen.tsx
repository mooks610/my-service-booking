import React, { useState } from 'react';
import { CalendarCheck, Clock, ShieldCheck } from 'lucide-react';

interface AuthScreenProps {
  onSignInWithGoogle: () => Promise<void>;
  errorMessage: string | null;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onSignInWithGoogle,
  errorMessage,
}) => {
  const [signingIn, setSigningIn] = useState(false);

  const handleClick = async () => {
    setSigningIn(true);
    try {
      await onSignInWithGoogle();
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-8 space-y-6 shadow-[0_10px_15px_-3px_rgba(15,23,42,0.06)]">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#0D9488] tracking-[0.02em]">
            오피스 허브
          </p>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-[#0F172A]">
            회의실 및 공용 자산 예약
          </h1>
          <p className="text-sm text-[#64748B] leading-relaxed">
            Google 계정으로 로그인하면 예약 내역, 진행 상태, 생성 시점이
            Firebase 데이터베이스에 안전하게 저장되어 언제든 다시 확인할 수 있습니다.
          </p>
        </div>

        <div className="space-y-3 pt-2 border-t border-[#F1F5F9] text-xs text-[#475569]">
          <div className="flex items-center gap-2.5">
            <CalendarCheck className="w-4 h-4 text-[#0D9488] shrink-0" />
            <span>예약 대상, 일정, 회의 목적 실시간 저장 및 조회</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-[#2563EB] shrink-0" />
            <span>예약됨 · 진행 중 · 완료됨 · 취소됨 상태 및 생성 시각 기록</span>
          </div>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#0F172A] shrink-0" />
            <span>Firebase Firestore 보안 규칙 기반 데이터 보호</span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs font-medium text-[#B91C1C]">
            {errorMessage}
          </div>
        )}

        <button
          type="button"
          disabled={signingIn}
          onClick={handleClick}
          className="w-full h-11 px-4 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] disabled:opacity-60 text-[#FFFFFF] text-sm font-semibold inline-flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M12 5c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.31 0 3.26 2.69 1.29 6.61l3.66 2.84C5.82 6.86 8.66 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.51-1.14 2.79-2.4 3.65l3.72 2.89c2.17-2 3.7-4.95 3.7-8.78z"
            />
            <path
              fill="#FBBC05"
              d="M4.95 14.55c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09L1.29 7.53C.47 9.17 0 11.03 0 12.46s.47 3.29 1.29 4.93l3.66-2.84z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.72-2.89c-1.08.72-2.45 1.16-4.21 1.16-3.34 0-6.18-1.86-7.05-4.45l-3.66 2.84C3.26 21.31 7.31 24 12 24z"
            />
          </svg>
          <span>{signingIn ? '로그인 중...' : 'Google 계정으로 로그인'}</span>
        </button>
      </div>
    </div>
  );
};
