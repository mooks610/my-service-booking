import React from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { ToastItem } from '../types/resource';

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const style =
          t.type === 'success'
            ? 'bg-[#0F172A] text-[#FFFFFF] border-[#1E293B]'
            : t.type === 'warning' || t.type === 'error'
            ? 'bg-[#FFFBEB] text-[#92400E] border-[#FCD34D]'
            : 'bg-[#FFFFFF] text-[#0F172A] border-[#E2E8F0]';

        const Icon =
          t.type === 'success'
            ? CheckCircle2
            : t.type === 'warning' || t.type === 'error'
            ? AlertTriangle
            : Info;

        return (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-xl border px-4 py-3 shadow-lg flex items-center justify-between gap-3 text-sm font-medium ${style}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  t.type === 'success' ? 'text-[#2DD4BF]' : ''
                }`}
              />
              <span className="truncate">{t.message}</span>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="opacity-70 hover:opacity-100 p-0.5 cursor-pointer shrink-0"
              aria-label="알림 닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
