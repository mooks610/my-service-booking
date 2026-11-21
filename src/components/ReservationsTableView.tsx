import React, { useMemo, useState } from 'react';
import { CalendarPlus, Search } from 'lucide-react';
import { Booking, Resource, UserProfile } from '../types/resource';
import {
  formatCreatedAtKorean,
  formatDateISO,
  formatDateKorean,
  formatDurationKR,
  formatMinutesToHHMM,
  getMinutesFromMidnight,
} from '../utils/schedule';

interface ReservationsTableViewProps {
  bookings: Booking[];
  resources: Resource[];
  now: Date;
  currentUser: UserProfile;
  onInspectBooking: (booking: Booking) => void;
  onCheckInBooking: (bookingId: string) => void;
  onExtendBooking: (bookingId: string, extraMin: number) => void;
  onCompleteBooking: (bookingId: string) => void;
  onCancelBooking: (bookingId: string) => void;
  onOpenQuickReserve: () => void;
}

type BookingScope = 'all' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export const ReservationsTableView: React.FC<ReservationsTableViewProps> = ({
  bookings,
  resources,
  now,
  currentUser,
  onInspectBooking,
  onCheckInBooking,
  onExtendBooking,
  onCompleteBooking,
  onCancelBooking,
  onOpenQuickReserve,
}) => {
  const [scope, setScope] = useState<BookingScope>('all');
  const [search, setSearch] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');

  const todayISO = formatDateISO(now);
  const nowMin = getMinutesFromMidnight(now);

  const resourceMap = useMemo(() => {
    const map = new Map<string, Resource>();
    resources.forEach((r) => map.set(r.id, r));
    return map;
  }, [resources]);

  const getLifecyclePhase = (b: Booking) => {
    if (b.status === 'cancelled' || b.lifecycleStatus === 'cancelled') {
      return 'cancelled';
    }
    if (b.lifecycleStatus === 'completed') return 'completed';
    if (b.date < todayISO) return 'completed';
    if (b.date > todayISO) return 'upcoming';
    if (b.startMin <= nowMin && nowMin < b.endMin) return 'in_progress';
    if (b.endMin <= nowMin) return 'completed';
    if (b.startMin - nowMin <= 10) return 'imminent';
    return 'upcoming';
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings
      .filter((b) => {
        const phase = getLifecyclePhase(b);
        if (scope === 'scheduled' && phase !== 'upcoming' && phase !== 'imminent') {
          return false;
        }
        if (scope === 'in_progress' && phase !== 'in_progress') {
          return false;
        }
        if (scope === 'completed' && phase !== 'completed') {
          return false;
        }
        if (scope === 'cancelled' && phase !== 'cancelled') {
          return false;
        }
        if (dateFilter && b.date !== dateFilter) return false;
        if (q) {
          const resName = resourceMap.get(b.resourceId)?.name || b.resourceName || '';
          const hay = `${b.title} ${b.organizerName} ${b.organizerDepartment} ${resName}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.startMin - a.startMin;
      });
  }, [bookings, scope, search, dateFilter, resourceMap, todayISO, nowMin]);

  const renderPhaseBadge = (b: Booking) => {
    const phase = getLifecyclePhase(b);
    switch (phase) {
      case 'in_progress':
        return (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-[#DBEAFE] text-[#1D4ED8] whitespace-nowrap">
            진행 중
          </span>
        );
      case 'imminent':
        return (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-[#FEF3C7] text-[#B45309] whitespace-nowrap">
            곧 시작
          </span>
        );
      case 'upcoming':
        return (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-[#DCFCE7] text-[#15803D] whitespace-nowrap">
            예약됨
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-[#F3F4F6] text-[#4B5563] whitespace-nowrap">
            완료됨
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-[#FEE2E2] text-[#B91C1C] whitespace-nowrap">
            취소됨
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Filter & Search Bar */}
      <section className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 bg-[#F1F5F9] rounded-lg overflow-x-auto">
          {(
            [
              { id: 'all', label: '전체 예약' },
              { id: 'scheduled', label: '예약됨' },
              { id: 'in_progress', label: '진행 중' },
              { id: 'completed', label: '완료됨' },
              { id: 'cancelled', label: '취소됨' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setScope(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                scope === tab.id
                  ? 'bg-[#FFFFFF] text-[#111827] shadow-xs'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <input
            type="date"
            aria-label="날짜 필터"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-10 px-3 rounded-lg bg-[#FFFFFF] border border-[#E5E7EB] text-xs font-medium text-[#111827] tabular-nums focus:outline-none focus:border-[#2563EB]"
          />
          <div className="relative sm:w-64">
            <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="회의명, 예약자, 리소스 검색..."
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-[#FFFFFF] border border-[#E5E7EB] text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
            />
          </div>
          {dateFilter && (
            <button
              type="button"
              onClick={() => setDateFilter('')}
              className="h-10 px-3 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#6B7280] hover:text-[#111827] whitespace-nowrap cursor-pointer"
            >
              날짜 해제
            </button>
          )}
        </div>
      </section>

      {/* Enterprise SaaS Data Table */}
      <section className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-base font-semibold text-[#111827]">
              표시할 예약 내역이 없습니다
            </p>
            <p className="text-sm text-[#6B7280]">
              필터 조건을 변경하거나 새 회의실 예약을 바로 등록해 보세요.
            </p>
            <button
              type="button"
              onClick={onOpenQuickReserve}
              className="mt-2 h-10 px-4 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-[#FFFFFF] text-sm font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>새 예약 만들기</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[12px] font-semibold text-[#6B7280]">
                  <th className="py-3 px-4 whitespace-nowrap">예약 대상</th>
                  <th className="py-3 px-4 whitespace-nowrap">회의명 / 목적</th>
                  <th className="py-3 px-4 whitespace-nowrap">예약자</th>
                  <th className="py-3 px-4 whitespace-nowrap">예약 일정</th>
                  <th className="py-3 px-4 whitespace-nowrap text-right">소요 시간</th>
                  <th className="py-3 px-4 whitespace-nowrap">상태</th>
                  <th className="py-3 px-4 whitespace-nowrap">예약 생성 시점</th>
                  <th className="py-3 px-4 whitespace-nowrap text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-sm">
                {filtered.map((booking) => {
                  const res = resourceMap.get(booking.resourceId);
                  const phase = getLifecyclePhase(booking);
                  const duration = booking.endMin - booking.startMin;
                  const canManage =
                    phase === 'in_progress' ||
                    phase === 'imminent' ||
                    phase === 'upcoming';

                  return (
                    <tr
                      key={booking.id}
                      className="hover:bg-[#F9FAFB] transition-colors"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-[#111827]">
                          {res?.name || booking.resourceName || '알 수 없는 리소스'}
                        </div>
                        <div className="text-xs text-[#6B7280]">
                          {res ? `${res.floor} · ${res.zone}` : '-'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-[240px]">
                        <button
                          type="button"
                          onClick={() => onInspectBooking(booking)}
                          className="font-medium text-[#111827] hover:text-[#2563EB] truncate block text-left w-full cursor-pointer"
                        >
                          {booking.title}
                        </button>
                        <div className="text-xs text-[#6B7280] tabular-nums">
                          참석 {booking.attendeesCount}명
                          {booking.checkedIn ? ' · 체크인 완료' : ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-[#111827] font-medium">
                          {booking.organizerName}
                          {booking.ownerUid === currentUser.id && (
                            <span className="ml-1.5 text-xs text-[#2563EB] font-semibold">
                              (나)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#6B7280]">
                          {booking.organizerDepartment}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap tabular-nums">
                        <div className="text-[#111827] font-medium">
                          {booking.date === todayISO
                            ? '오늘'
                            : formatDateKorean(booking.date)}
                        </div>
                        <div className="text-xs text-[#6B7280]">
                          {formatMinutesToHHMM(booking.startMin)} –{' '}
                          {formatMinutesToHHMM(booking.endMin)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-right tabular-nums font-medium text-[#111827]">
                        {formatDurationKR(duration)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderPhaseBadge(booking)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-[#6B7280] tabular-nums">
                        {formatCreatedAtKorean(booking.createdAt)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {canManage && !booking.checkedIn && (
                            <button
                              type="button"
                              onClick={() => onCheckInBooking(booking.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#DBEAFE] hover:bg-[#BFDBFE] text-[#1D4ED8] text-xs font-semibold transition-colors cursor-pointer"
                            >
                              체크인
                            </button>
                          )}
                          {phase === 'in_progress' && (
                            <>
                              <button
                                type="button"
                                onClick={() => onExtendBooking(booking.id, 15)}
                                className="px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] hover:bg-[#F9FAFB] text-[#111827] text-xs font-semibold transition-colors cursor-pointer"
                              >
                                +15분
                              </button>
                              <button
                                type="button"
                                onClick={() => onCompleteBooking(booking.id)}
                                className="px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] hover:bg-[#ECFDF5] hover:text-[#047857] text-[#111827] text-xs font-semibold transition-colors cursor-pointer"
                              >
                                완료
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => onInspectBooking(booking)}
                            className="px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] hover:bg-[#F9FAFB] text-[#111827] text-xs font-medium transition-colors cursor-pointer"
                          >
                            상세
                          </button>
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => onCancelBooking(booking.id)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#6B7280] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                            >
                              취소
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
