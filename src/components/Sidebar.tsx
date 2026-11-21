import React from 'react';
import {
  Building2,
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  LayoutGrid,
  LogOut,
  Sparkles,
  X,
} from 'lucide-react';
import { UserProfile, ViewTab } from '../types/resource';

interface SidebarProps {
  activeTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  currentUser: UserProfile;
  availableCount: number;
  myActiveBookingsCount: number;
  onSeedSampleBookings: () => void;
  onSignOut: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: {
  id: ViewTab;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'overview', label: '실시간 현황', Icon: LayoutGrid },
  { id: 'timeline', label: '타임라인 스케줄', Icon: CalendarClock },
  { id: 'my_reservations', label: '내 예약 내역', Icon: CalendarCheck },
  { id: 'reservations', label: '예약 관리', Icon: ClipboardList },
  { id: 'directory', label: '자산 디렉토리', Icon: Building2 },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  availableCount,
  myActiveBookingsCount,
  onSeedSampleBookings,
  onSignOut,
  mobileOpen,
  onCloseMobile,
}) => {
  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#FFFFFF] border-r border-[#E5E7EB]">
      {/* Brand Wordmark Zone */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-[#E5E7EB] shrink-0">
        <button
          type="button"
          onClick={() => {
            onSelectTab('overview');
            onCloseMobile();
          }}
          className="text-lg font-bold tracking-[-0.02em] text-[#0F172A] whitespace-nowrap shrink-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
        >
          오피스 허브
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]"
          aria-label="메뉴 닫기"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto" aria-label="주 메뉴">
        <p className="px-3 pb-2 text-[11px] font-semibold text-[#6B7280] tracking-[0.02em]">
          워크플레이스 운영
        </p>
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                onSelectTab(id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                isActive
                  ? 'bg-[#DBEAFE] text-[#1D4ED8] font-semibold'
                  : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-[#2563EB]' : 'text-[#64748B]'
                  }`}
                />
                <span>{label}</span>
              </span>
              {id === 'overview' && (
                <span className="text-xs tabular-nums text-[#047857] font-semibold">
                  {availableCount}
                </span>
              )}
              {id === 'my_reservations' && myActiveBookingsCount > 0 && (
                <span className="text-xs tabular-nums text-[#1D4ED8] font-semibold">
                  {myActiveBookingsCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Authenticated User Profile & Actions */}
      <div className="p-4 border-t border-[#E5E7EB] space-y-2.5 bg-[#F9FAFB]">
        <div className="px-2.5 py-2 rounded-lg bg-[#FFFFFF] border border-[#E5E7EB]">
          <p className="text-sm font-semibold text-[#111827] truncate">
            {currentUser.name}
          </p>
          <p className="text-xs text-[#6B7280] truncate mt-0.5">
            {currentUser.role}
          </p>
          <p className="text-[11px] text-[#94A3B8] truncate">
            {currentUser.email}
          </p>
        </div>

        <button
          type="button"
          onClick={onSeedSampleBookings}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] text-xs font-medium text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0 text-[#0D9488]" />
          <span>샘플 예약 추가</span>
        </button>

        <button
          type="button"
          onClick={onSignOut}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] text-xs font-medium text-[#64748B] hover:text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          <span>로그아웃</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <aside className="relative w-72 max-w-[85vw] h-full z-10 shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
