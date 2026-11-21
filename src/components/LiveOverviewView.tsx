import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarPlus,
  Check,
  Clock,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import {
  Booking,
  Resource,
  ResourceCategory,
  ResourceLiveInfo,
  UserProfile,
} from '../types/resource';
import {
  computeResourceLiveInfo,
  formatDateISO,
  formatDurationKR,
  formatMinutesToHHMM,
  getCategoryLabel,
  getSuggestedStartMin,
} from '../utils/schedule';
import { ArchitecturalVisual } from './ArchitecturalVisual';
import { StatusBadge } from './StatusBadge';

interface LiveOverviewViewProps {
  resources: Resource[];
  bookings: Booking[];
  now: Date;
  currentUser: UserProfile;
  onQuickReserve: (resourceId: string, startMin?: number) => void;
  onInspectBooking: (booking: Booking) => void;
  onCheckInBooking: (bookingId: string) => void;
  onExtendBooking: (bookingId: string, extraMinutes: number) => void;
  onJumpToTimeline: (resourceId: string) => void;
}

const CATEGORY_TABS: { id: 'all' | ResourceCategory; label: string }[] = [
  { id: 'all', label: '전체 리소스' },
  { id: 'meeting_room', label: '회의실' },
  { id: 'focus_booth', label: '포커스 부스' },
  { id: 'equipment', label: '공용 장비' },
];

export const LiveOverviewView: React.FC<LiveOverviewViewProps> = ({
  resources,
  bookings,
  now,
  currentUser,
  onQuickReserve,
  onInspectBooking,
  onCheckInBooking,
  onExtendBooking,
  onJumpToTimeline,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'all' | ResourceCategory>('all');
  const [floorFilter, setFloorFilter] = useState<string>('all');
  const [minCapacity, setMinCapacity] = useState<number>(0);
  const [selectedAmenity, setSelectedAmenity] = useState<string>('all');
  const [onlyAvailableNow, setOnlyAvailableNow] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const todayISO = formatDateISO(now);

  const enrichedResources = useMemo(() => {
    return resources.map((res) => ({
      resource: res,
      live: computeResourceLiveInfo(res, bookings, now),
    }));
  }, [resources, bookings, now]);

  const summary = useMemo(() => {
    let available = 0;
    let occupied = 0;
    let imminent = 0;
    let maintenance = 0;

    for (const item of enrichedResources) {
      if (item.live.state === 'available') available += 1;
      else if (item.live.state === 'occupied') occupied += 1;
      else if (
        item.live.state === 'imminent_end' ||
        item.live.state === 'imminent_start'
      ) {
        imminent += 1;
      } else if (item.live.state === 'maintenance') {
        maintenance += 1;
      }
    }

    return {
      total: enrichedResources.length,
      available,
      occupied,
      imminent,
      maintenance,
    };
  }, [enrichedResources]);

  const floors = useMemo(() => {
    const set = new Set(resources.map((r) => r.floor));
    return Array.from(set).sort();
  }, [resources]);

  const allAmenities = useMemo(() => {
    const set = new Set<string>();
    resources.forEach((r) => r.amenities.forEach((a) => set.add(a)));
    return Array.from(set);
  }, [resources]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const statePriority: Record<ResourceLiveInfo['state'], number> = {
      available: 0,
      imminent_start: 1,
      imminent_end: 2,
      occupied: 3,
      maintenance: 4,
    };
    return enrichedResources
      .filter(({ resource, live }) => {
        if (categoryFilter !== 'all' && resource.category !== categoryFilter) {
          return false;
        }
        if (floorFilter !== 'all' && resource.floor !== floorFilter) {
          return false;
        }
        if (minCapacity > 0 && resource.capacity < minCapacity) {
          return false;
        }
        if (
          selectedAmenity !== 'all' &&
          !resource.amenities.includes(selectedAmenity)
        ) {
          return false;
        }
        if (
          onlyAvailableNow &&
          live.state !== 'available' &&
          live.state !== 'imminent_start'
        ) {
          return false;
        }
        if (q) {
          const hay = `${resource.name} ${resource.zone} ${resource.floor} ${resource.amenities.join(' ')}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => statePriority[a.live.state] - statePriority[b.live.state]);
  }, [
    enrichedResources,
    categoryFilter,
    floorFilter,
    minCapacity,
    selectedAmenity,
    onlyAvailableNow,
    searchQuery,
  ]);

  // Actionable imminent alerts for current user or workspace
  const imminentItems = useMemo(() => {
    return enrichedResources.filter(
      ({ live }) =>
        live.state === 'imminent_end' || live.state === 'imminent_start'
    );
  }, [enrichedResources]);

  const renderStatusDetail = (
    resource: Resource,
    live: ResourceLiveInfo
  ): React.ReactNode => {
    if (live.state === 'maintenance') {
      return (
        <p className="text-sm text-[#B91C1C]">
          시설 점검으로 인해 일시적으로 예약이 중단되었습니다.
        </p>
      );
    }

    if (live.currentBooking) {
      const b = live.currentBooking;
      const isMine = b.organizerId === currentUser.id;
      return (
        <div className="space-y-1">
          <p className="text-sm font-medium text-[#0F172A] truncate">
            {b.title}
          </p>
          <p className="text-xs text-[#64748B] tabular-nums flex items-center gap-1.5 flex-wrap">
            <span>
              {b.organizerName}
              {isMine ? ' (내 예약)' : ` · ${b.organizerDepartment}`}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-[#0F172A]">
              {formatMinutesToHHMM(b.startMin)}–{formatMinutesToHHMM(b.endMin)}
            </span>
            {live.minutesRemaining !== null && (
              <>
                <span aria-hidden="true">·</span>
                <span
                  className={
                    live.state === 'imminent_end'
                      ? 'text-[#B45309] font-semibold'
                      : 'text-[#64748B]'
                  }
                >
                  {live.minutesRemaining}분 후 종료
                </span>
              </>
            )}
          </p>
        </div>
      );
    }

    if (live.nextBooking && live.minutesUntilNext !== null) {
      const nb = live.nextBooking;
      if (live.state === 'imminent_start') {
        return (
          <div className="space-y-1">
            <p className="text-sm font-medium text-[#B45309]">
              {live.minutesUntilNext}분 후 &apos;{nb.title}&apos; 시작 예정
            </p>
            <p className="text-xs text-[#64748B] tabular-nums">
              예약자: {nb.organizerName} · {formatMinutesToHHMM(nb.startMin)}–
              {formatMinutesToHHMM(nb.endMin)}
            </p>
          </div>
        );
      }

      return (
        <div className="space-y-1">
          <p className="text-sm font-medium text-[#047857] tabular-nums">
            {formatMinutesToHHMM(nb.startMin)}까지 바로 사용 가능 (
            {formatDurationKR(live.minutesUntilNext)})
          </p>
          <p className="text-xs text-[#64748B] tabular-nums truncate">
            다음 예약: {formatMinutesToHHMM(nb.startMin)} · {nb.title} ({nb.organizerName})
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <p className="text-sm font-medium text-[#047857]">
          오늘 남은 시간 전체 예약 가능
        </p>
        <p className="text-xs text-[#64748B]">
          대기 중인 다음 일정이 없어 즉시 입실할 수 있습니다.
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 4-Column Summary Metric Strip (Single-Elevation, Hairline Dividers) */}
      <section
        aria-label="리소스 실시간 요약"
        className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#E2E8F0]"
      >
        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-[#64748B]">전체 운영 리소스</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0F172A] tabular-nums">
              {summary.total}
            </span>
            <span className="text-xs text-[#64748B]">
              {summary.maintenance > 0 ? `점검 ${summary.maintenance}개` : '정상 가동'}
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-[#64748B]">즉시 예약 가능</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#059669] tabular-nums">
              {summary.available}
            </span>
            <span className="text-xs text-[#047857]">원클릭 입실 가능</span>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-[#64748B]">현재 사용 중</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0F172A] tabular-nums">
              {summary.occupied}
            </span>
            <span className="text-xs text-[#64748B]">회의 진행 중</span>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-[#64748B]">10분 이내 임박 · 전환</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#D97706] tabular-nums">
              {summary.imminent}
            </span>
            <span className="text-xs text-[#B45309]">체크인 또는 연장 확인</span>
          </div>
        </div>
      </section>

      {/* Imminent Alerts Bar (only rendered when imminent bookings exist) */}
      {imminentItems.length > 0 && (
        <section
          aria-label="임박한 예약 알림"
          className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-4 flex flex-col gap-3"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-[#B45309]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>10분 이내 시작 또는 종료 예정 리소스</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {imminentItems.map(({ resource, live }) => {
              const targetBooking =
                live.state === 'imminent_end'
                  ? live.currentBooking
                  : live.nextBooking;
              if (!targetBooking) return null;
              const isMine = targetBooking.organizerId === currentUser.id;
              return (
                <div
                  key={resource.id}
                  className="bg-[#FFFFFF] border border-[#FDE68A] rounded-lg px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-[#B45309] font-semibold tabular-nums">
                      <span>{resource.name}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {live.state === 'imminent_end'
                          ? `${live.minutesRemaining}분 후 종료`
                          : `${live.minutesUntilNext}분 후 시작`}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-[#0F172A] truncate mt-0.5">
                      {targetBooking.title} ({targetBooking.organizerName})
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {live.state === 'imminent_end' && isMine && (
                      <button
                        type="button"
                        onClick={() => onExtendBooking(targetBooking.id, 15)}
                        className="px-3 py-1.5 rounded-lg bg-[#D97706] hover:bg-[#B45309] text-[#FFFFFF] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        +15분 연장
                      </button>
                    )}
                    {live.state === 'imminent_start' && !targetBooking.checkedIn && (
                      <button
                        type="button"
                        onClick={() => onCheckInBooking(targetBooking.id)}
                        className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#0F172A] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        체크인
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onInspectBooking(targetBooking)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      상세
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Filter & Search Toolbar */}
      <section className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Category Segmented Tabs */}
          <div className="inline-flex items-center gap-1 p-1 bg-[#F1F5F9] rounded-lg overflow-x-auto">
            {CATEGORY_TABS.map((tab) => {
              const active = categoryFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategoryFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#FFFFFF] text-[#0F172A] shadow-xs'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search + Available Toggle */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="회의실명, 구역, 장비 검색..."
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-[#FFFFFF] focus:outline-none focus:border-2 focus:border-[#0D9488]"
              />
            </div>

            <button
              type="button"
              onClick={() => setOnlyAvailableNow((v) => !v)}
              className={`h-10 px-3.5 rounded-lg border text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                onlyAvailableNow
                  ? 'bg-[#ECFDF5] border-[#059669] text-[#047857]'
                  : 'bg-[#FFFFFF] border-[#CBD5E1] text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <Check
                className={`w-3.5 h-3.5 ${
                  onlyAvailableNow ? 'opacity-100' : 'opacity-40'
                }`}
              />
              <span>지금 예약 가능만 보기</span>
            </button>
          </div>
        </div>

        {/* Secondary Attribute Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#F1F5F9]">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-[#64748B] mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>세부 필터</span>
          </span>

          <select
            aria-label="층수 필터"
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value)}
            className="h-8 px-2.5 rounded-lg bg-[#FFFFFF] border border-[#E5E7EB] text-xs font-medium text-[#111827] focus:outline-none focus:border-[#2563EB] cursor-pointer"
          >
            <option value="all">전체 층</option>
            {floors.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          <select
            aria-label="수용 인원 필터"
            value={minCapacity}
            onChange={(e) => setMinCapacity(Number(e.target.value))}
            className="h-8 px-2.5 rounded-lg bg-[#FFFFFF] border border-[#E5E7EB] text-xs font-medium text-[#111827] focus:outline-none focus:border-[#2563EB] cursor-pointer"
          >
            <option value={0}>전체 인원</option>
            <option value={2}>2인 이상</option>
            <option value={6}>6인 이상</option>
            <option value={8}>8인 이상</option>
            <option value={12}>12인 이상</option>
          </select>

          <select
            aria-label="지원 장비 필터"
            value={selectedAmenity}
            onChange={(e) => setSelectedAmenity(e.target.value)}
            className="h-8 px-2.5 rounded-lg bg-[#FFFFFF] border border-[#E5E7EB] text-xs font-medium text-[#111827] focus:outline-none focus:border-[#2563EB] cursor-pointer"
          >
            <option value="all">모든 장비 · 옵션</option>
            {allAmenities.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          {(categoryFilter !== 'all' ||
            floorFilter !== 'all' ||
            minCapacity > 0 ||
            selectedAmenity !== 'all' ||
            onlyAvailableNow ||
            searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setCategoryFilter('all');
                setFloorFilter('all');
                setMinCapacity(0);
                setSelectedAmenity('all');
                setOnlyAvailableNow(false);
                setSearchQuery('');
              }}
              className="h-8 px-2.5 rounded-lg text-xs font-medium text-[#2563EB] hover:bg-[#DBEAFE]/50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              필터 초기화
            </button>
          )}
        </div>
      </section>

      {/* Resource Action Cards Grid */}
      {filtered.length === 0 ? (
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-12 text-center space-y-3">
          <p className="text-base font-semibold text-[#0F172A]">
            조건에 일치하는 리소스가 없습니다
          </p>
          <p className="text-sm text-[#64748B]">
            층수, 최소 수용 인원 또는 장비 필터 조건을 완화하여 다시 확인해 보세요.
          </p>
          <button
            type="button"
            onClick={() => {
              setCategoryFilter('all');
              setFloorFilter('all');
              setMinCapacity(0);
              setSelectedAmenity('all');
              setOnlyAvailableNow(false);
              setSearchQuery('');
            }}
            className="mt-2 h-10 px-4 rounded-lg bg-[#0F172A] text-[#FFFFFF] text-sm font-semibold hover:bg-[#1E293B] transition-colors cursor-pointer"
          >
            전체 리소스 보기
          </button>
        </div>
      ) : (
        <section
          aria-label="리소스 목록"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {filtered.map(({ resource, live }, index) => {
            const isAvailable = live.state === 'available';
            const isMaintenance = live.state === 'maintenance';
            const myActiveBooking =
              live.currentBooking &&
              live.currentBooking.organizerId === currentUser.id
                ? live.currentBooking
                : null;

            const suggestedNextStart = getSuggestedStartMin(
              bookings,
              resource.id,
              todayISO,
              now
            );

            return (
              <article
                key={resource.id}
                className="group bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#0D9488] rounded-xl p-5 flex flex-col justify-between gap-4 transition-all duration-150 hover:shadow-[0_4px_12px_-2px_rgba(15,23,42,0.06),0_2px_6px_-1px_rgba(15,23,42,0.04)]"
              >
                {/* Zone 1: Visual + Title + Unboxed Metadata + Status */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-3 min-w-0">
                      <ArchitecturalVisual
                        type={resource.visualType}
                        className="w-14 h-11 rounded-lg shrink-0"
                      />
                      <div className="min-w-0">
                        <h2
                          className={`text-base font-semibold text-[#0F172A] truncate group-hover:text-[#0D9488] transition-colors ${
                            index === 6 ? 'h-[26px]' : ''
                          }`}
                        >
                          {resource.name}
                        </h2>
                        <div className="mt-1 flex items-center gap-1 text-xs text-[#64748B] tabular-nums whitespace-nowrap">
                          <span>{getCategoryLabel(resource.category)}</span>
                          <span aria-hidden="true">·</span>
                          <span>{resource.floor}</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {resource.category === 'equipment'
                              ? '공용 1세트'
                              : `최대 ${resource.capacity}인`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <StatusBadge state={live.state} />
                  </div>

                  {/* Zone 2: Current Status + Clean Inline Amenities */}
                  <div className="pt-3 border-t border-[#F1F5F9] space-y-2.5">
                    {renderStatusDetail(resource, live)}

                    <p className="text-xs text-[#64748B] leading-relaxed">
                      {resource.zone} · {resource.amenities.join(' · ')}
                    </p>
                  </div>
                </div>

                {/* Zone 3: Quick Actions */}
                <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onJumpToTimeline(resource.id)}
                    className="text-xs font-medium text-[#64748B] hover:text-[#0F172A] transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer py-1.5"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>타임라인 보기</span>
                  </button>

                  {isMaintenance ? (
                    <span className="text-xs font-medium text-[#94A3B8] whitespace-nowrap">
                      예약 불가
                    </span>
                  ) : myActiveBooking ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onInspectBooking(myActiveBooking)}
                        className="h-9 px-3 rounded-lg border border-[#CBD5E1] bg-[#FFFFFF] hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        상세 · 수정
                      </button>
                      <button
                        type="button"
                        onClick={() => onExtendBooking(myActiveBooking.id, 15)}
                        className="h-9 px-3 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-xs font-semibold text-[#FFFFFF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        +15분 연장
                      </button>
                    </div>
                  ) : isAvailable || live.state === 'imminent_start' ? (
                    <button
                      type="button"
                      onClick={() => onQuickReserve(resource.id)}
                      className="h-10 px-4 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-[#FFFFFF] text-sm font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <CalendarPlus className="w-4 h-4 shrink-0" />
                      <span>즉시 예약</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        onQuickReserve(resource.id, suggestedNextStart)
                      }
                      className="h-10 px-3.5 rounded-lg border border-[#CBD5E1] bg-[#FFFFFF] hover:border-[#0D9488] hover:text-[#0D9488] text-[#0F172A] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
                    >
                      <span>
                        {formatMinutesToHHMM(suggestedNextStart)} 이후 예약
                      </span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
};
