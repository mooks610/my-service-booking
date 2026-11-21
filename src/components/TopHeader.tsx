import React from 'react';
import { Menu, Plus } from 'lucide-react';
import { ViewTab } from '../types/resource';
import { formatDateISO, formatDateKorean } from '../utils/schedule';

interface TopHeaderProps {
  activeTab: ViewTab;
  now: Date;
  onOpenQuickReserve: () => void;
  onOpenMobileMenu: () => void;
}

const TAB_TITLES: Record<ViewTab, string> = {
  overview: '실시간 현황',
  timeline: '타임라인 스케줄',
  my_reservations: '내 예약 내역',
  reservations: '예약 관리',
  directory: '자산 디렉토리',
};

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  now,
  onOpenQuickReserve,
  onOpenMobileMenu,
}) => {
  const todayFormatted = formatDateKorean(formatDateISO(now));
  const timeFormatted = now.toLocaleTimeString('ko-KR', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <header className="h-16 bg-[#FFFFFF] border-b border-[#E5E7EB] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
      {/* Zone 1: Breadcrumb & Mobile Trigger */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 -ml-2 rounded-lg text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] shrink-0"
          aria-label="메뉴 열기"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="text-[#6B7280] hidden sm:inline whitespace-nowrap shrink-0">
            오피스 허브
          </span>
          <span className="text-[#CBD5E1] hidden sm:inline shrink-0" aria-hidden="true">
            /
          </span>
          <h1 className="text-base sm:text-[17px] font-bold tracking-[-0.01em] text-[#0F172A] whitespace-nowrap">
            {TAB_TITLES[activeTab]}
          </h1>
        </div>
      </div>

      {/* Zone 2: Live Date & Clock (tabular-nums) + Zone 3: Single Primary Action */}
      <div className="flex items-center gap-4 sm:gap-6 shrink-0">
        <div className="hidden md:flex items-center gap-2 text-xs text-[#64748B] tabular-nums whitespace-nowrap">
          <span>{todayFormatted}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular font-semibold text-[#0F172A] text-sm">
            {timeFormatted}
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenQuickReserve}
          className="h-10 px-4 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] active:bg-[#115E59] text-[#FFFFFF] text-sm font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span className="text-[20px]">빠른 예약</span>
        </button>
      </div>
    </header>
  );
};
