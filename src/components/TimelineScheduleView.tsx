import React, { useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import {
  Booking,
  Resource,
  ResourceCategory,
  UserProfile,
} from '../types/resource';
import {
  DEFAULT_TIMELINE_END_MIN,
  TIMELINE_START_MIN,
  addDaysISO,
  computeResourceLiveInfo,
  formatDateISO,
  formatDateKorean,
  formatMinutesToHHMM,
  getMinutesFromMidnight,
} from '../utils/schedule';
import { StatusBadge } from './StatusBadge';

interface TimelineScheduleViewProps {
  resources: Resource[];
  bookings: Booking[];
  now: Date;
  currentUser: UserProfile;
  highlightedResourceId: string | null;
  onSelectSlotToBook: (resourceId: string, date: string, startMin: number) => void;
  onInspectBooking: (booking: Booking) => void;
}

export const TimelineScheduleView: React.FC<TimelineScheduleViewProps> = ({
  resources,
  bookings,
  now,
  currentUser,
  highlightedResourceId,
  onSelectSlotToBook,
  onInspectBooking,
}) => {
  const todayISO = formatDateISO(now);
  const [selectedDate, setSelectedDate] = useState<string>(todayISO);
  const [stepMin, setStepMin] = useState<15 | 30>(30);
  const [categoryFilter, setCategoryFilter] = useState<'all' | ResourceCategory>('all');
  const [hoveredSlot, setHoveredSlot] = useState<{
    resourceId: string;
    startMin: number;
  } | null>(null);

  const nowMin = getMinutesFromMidnight(now);
  const isToday = selectedDate === todayISO;

  // Dynamically expand timeline end if user opens late evening so current time & slots remain visible
  const timelineEndMin = useMemo(() => {
    if (isToday && nowMin >= 20 * 60) {
      return Math.min(24 * 60, Math.ceil((nowMin + 90) / 60) * 60);
    }
    return DEFAULT_TIMELINE_END_MIN;
  }, [isToday, nowMin]);

  const totalRangeMin = timelineEndMin - TIMELINE_START_MIN;

  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let m = TIMELINE_START_MIN; m < timelineEndMin; m += 60) {
      arr.push(m);
    }
    return arr;
  }, [timelineEndMin]);

  const slots = useMemo(() => {
    const arr: number[] = [];
    for (let m = TIMELINE_START_MIN; m < timelineEndMin; m += stepMin) {
      arr.push(m);
    }
    return arr;
  }, [timelineEndMin, stepMin]);

  const visibleResources = useMemo(() => {
    if (categoryFilter === 'all') return resources;
    return resources.filter((r) => r.category === categoryFilter);
  }, [resources, categoryFilter]);

  const dayBookings = useMemo(() => {
    return bookings.filter(
      (b) => b.date === selectedDate && b.status === 'confirmed'
    );
  }, [bookings, selectedDate]);

  const nowIndicatorPercent = useMemo(() => {
    if (!isToday) return null;
    if (nowMin < TIMELINE_START_MIN || nowMin > timelineEndMin) return null;
    return ((nowMin - TIMELINE_START_MIN) / totalRangeMin) * 100;
  }, [isToday, nowMin, totalRangeMin, timelineEndMin]);

  const slotWidthPx = stepMin === 15 ? 36 : 56;
  const gridWidthPx = slots.length * slotWidthPx;

  return (
    <div className="space-y-5">
      {/* Schedule Control Bar */}
      <section className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Date Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] overflow-hidden">
            <button
              type="button"
              onClick={() => setSelectedDate((d) => addDaysISO(d, -1))}
              className="h-9 px-2.5 text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] border-r border-[#E2E8F0] cursor-pointer"
              aria-label="이전 날짜"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(todayISO)}
              className={`h-9 px-3 text-xs font-semibold border-r border-[#E2E8F0] cursor-pointer whitespace-nowrap ${
                selectedDate === todayISO
                  ? 'bg-[#DBEAFE] text-[#1D4ED8]'
                  : 'text-[#475569] hover:bg-[#F8FAFC]'
              }`}
            >
              오늘
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(addDaysISO(todayISO, 1))}
              className={`h-9 px-3 text-xs font-semibold border-r border-[#E2E8F0] cursor-pointer whitespace-nowrap ${
                selectedDate === addDaysISO(todayISO, 1)
                  ? 'bg-[#DBEAFE] text-[#1D4ED8]'
                  : 'text-[#475569] hover:bg-[#F8FAFC]'
              }`}
            >
              내일
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate((d) => addDaysISO(d, 1))}
              className="h-9 px-2.5 text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] cursor-pointer"
              aria-label="다음 날짜"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <label className="relative inline-flex items-center">
            <Calendar className="w-3.5 h-3.5 text-[#64748B] absolute left-3 pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) setSelectedDate(e.target.value);
              }}
              className="h-9 pl-8 pr-3 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] text-xs font-semibold text-[#0F172A] tabular-nums focus:outline-none focus:border-[#2563EB]"
            />
          </label>

          <span className="text-sm font-semibold text-[#0F172A] ml-1 whitespace-nowrap">
            {formatDateKorean(selectedDate)}
          </span>
        </div>

        {/* Granularity & Category */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center p-1 bg-[#F1F5F9] rounded-lg">
            {(['all', 'meeting_room', 'focus_booth', 'equipment'] as const).map(
              (cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-[#FFFFFF] text-[#0F172A] shadow-xs'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  {cat === 'all'
                    ? '전체'
                    : cat === 'meeting_room'
                    ? '회의실'
                    : cat === 'focus_booth'
                    ? '부스'
                    : '장비'}
                </button>
              )
            )}
          </div>

          <div className="inline-flex items-center p-1 bg-[#F1F5F9] rounded-lg">
            <button
              type="button"
              onClick={() => setStepMin(30)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold tabular-nums whitespace-nowrap shrink-0 cursor-pointer ${
                stepMin === 30
                  ? 'bg-[#FFFFFF] text-[#0F172A] shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              30분 단위
            </button>
            <button
              type="button"
              onClick={() => setStepMin(15)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold tabular-nums whitespace-nowrap shrink-0 cursor-pointer ${
                stepMin === 15
                  ? 'bg-[#FFFFFF] text-[#0F172A] shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              15분 단위
            </button>
          </div>
        </div>
      </section>

      {/* Legend & Hint */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B] px-1">
        <p>빈 시간대 블록을 클릭하면 해당 시작 시각으로 즉시 예약 모달이 열립니다.</p>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#DBEAFE] border border-[#93C5FD]" />
            <span>내 예약</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#F1F5F9] border border-[#CBD5E1]" />
            <span>타 팀 예약</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#FFFBEB] border border-[#FCD34D]" />
            <span>10분 이내 임박</span>
          </span>
        </div>
      </div>

      {/* Horizontal Schedule Matrix */}
      <section className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl overflow-hidden">
        <div className="overflow-x-auto timeline-scroll">
          <div style={{ minWidth: `${220 + gridWidthPx}px` }}>
            {/* Time Axis Header */}
            <div className="flex border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <div className="w-[220px] shrink-0 sticky left-0 z-20 bg-[#F8FAFC] border-r border-[#E2E8F0] px-4 py-3 text-xs font-semibold text-[#64748B]">
                리소스 ({visibleResources.length})
              </div>
              <div
                className="relative flex"
                style={{ width: `${gridWidthPx}px` }}
              >
                {hours.map((hourMin) => {
                  const hourSpanWidth = (60 / stepMin) * slotWidthPx;
                  return (
                    <div
                      key={hourMin}
                      style={{ width: `${hourSpanWidth}px` }}
                      className="shrink-0 border-r border-[#E2E8F0] px-2 py-3 text-xs font-semibold text-[#475569] tabular-nums"
                    >
                      {formatMinutesToHHMM(hourMin)}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Resource Rows */}
            <div className="divide-y divide-[#E2E8F0]">
              {visibleResources.map((resource) => {
                const live = computeResourceLiveInfo(resource, bookings, now);
                const rowBookings = dayBookings.filter(
                  (b) => b.resourceId === resource.id
                );
                const isMaintenance = resource.operationalStatus === 'maintenance';
                const isHighlighted = highlightedResourceId === resource.id;

                return (
                  <div
                    key={resource.id}
                    className={`flex transition-colors ${
                      isHighlighted ? 'bg-[#F0FDFA]/50' : 'bg-[#FFFFFF]'
                    }`}
                  >
                    {/* Sticky Resource Column */}
                    <div className="w-[220px] shrink-0 sticky left-0 z-10 bg-[#FFFFFF] border-r border-[#E2E8F0] px-4 py-3.5 flex flex-col justify-between gap-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-[#0F172A] leading-snug">
                          {resource.name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-[#64748B] tabular-nums">
                          {resource.floor} ·{' '}
                          {resource.category === 'equipment'
                            ? '1세트'
                            : `${resource.capacity}인`}
                        </span>
                        {isToday && <StatusBadge state={live.state} compact />}
                      </div>
                    </div>

                    {/* Timeline Track */}
                    <div
                      className="relative h-[74px] flex"
                      style={{ width: `${gridWidthPx}px` }}
                    >
                      {/* Interactive 15/30-min Slot Cells */}
                      {slots.map((slotMin) => {
                        const isHourBoundary = slotMin % 60 === 0;
                        const isOccupied = rowBookings.some(
                          (b) =>
                            b.lifecycleStatus !== 'completed' &&
                            b.startMin <= slotMin &&
                            slotMin < b.endMin
                        );
                        const isHovered =
                          hoveredSlot?.resourceId === resource.id &&
                          hoveredSlot?.startMin === slotMin;

                        return (
                          <button
                            key={slotMin}
                            type="button"
                            disabled={isMaintenance || isOccupied}
                            onMouseEnter={() => {
                              if (!isMaintenance && !isOccupied) {
                                setHoveredSlot({
                                  resourceId: resource.id,
                                  startMin: slotMin,
                                });
                              }
                            }}
                            onMouseLeave={() => setHoveredSlot(null)}
                            onClick={() => {
                              if (!isMaintenance && !isOccupied) {
                                onSelectSlotToBook(
                                  resource.id,
                                  selectedDate,
                                  slotMin
                                );
                              }
                            }}
                            style={{ width: `${slotWidthPx}px` }}
                            className={`h-full shrink-0 border-r transition-colors relative flex items-center justify-center ${
                              isHourBoundary
                                ? 'border-[#E2E8F0]'
                                : 'border-dashed border-[#E2E8F0]/80'
                            } ${
                              isMaintenance
                                ? 'bg-[#FEF2F2]/40 cursor-not-allowed'
                                : isOccupied
                                ? 'cursor-default'
                                : isHovered
                                ? 'bg-[#CCFBF1] cursor-pointer'
                                : 'hover:bg-[#CCFBF1]/70 cursor-pointer'
                            }`}
                            aria-label={`${resource.name} ${formatMinutesToHHMM(
                              slotMin
                            )} 슬롯 예약`}
                          >
                            {isHovered && !isOccupied && !isMaintenance && (
                              <span className="pointer-events-none inline-flex items-center gap-0.5 text-[10px] font-bold text-[#0F766E] tabular-nums whitespace-nowrap">
                                <Plus className="w-2.5 h-2.5" />
                                {formatMinutesToHHMM(slotMin)}
                              </span>
                            )}
                          </button>
                        );
                      })}

                      {/* Current Time Vertical Indicator */}
                      {nowIndicatorPercent !== null && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-[#0D9488] z-10 pointer-events-none"
                          style={{ left: `${nowIndicatorPercent}%` }}
                        >
                          <div className="w-2 h-2 rounded-full bg-[#0D9488] -ml-[3px] -mt-1" />
                        </div>
                      )}

                      {/* Confirmed Booking Blocks */}
                      {rowBookings.map((booking) => {
                        const clampedStart = Math.max(
                          TIMELINE_START_MIN,
                          booking.startMin
                        );
                        const clampedEnd = Math.min(
                          timelineEndMin,
                          booking.endMin
                        );
                        if (clampedEnd <= clampedStart) return null;

                        const leftPct =
                          ((clampedStart - TIMELINE_START_MIN) / totalRangeMin) *
                          100;
                        const widthPct =
                          ((clampedEnd - clampedStart) / totalRangeMin) * 100;

                        const isCompleted = booking.lifecycleStatus === 'completed';
                        const isMine = booking.organizerId === currentUser.id;
                        const isImminent =
                          !isCompleted &&
                          isToday &&
                          ((booking.startMin > nowMin &&
                            booking.startMin - nowMin <= 10) ||
                            (booking.startMin <= nowMin &&
                              nowMin < booking.endMin &&
                              booking.endMin - nowMin <= 10));

                        const blockStyle = isCompleted
                          ? 'bg-[#F8FAFC] border-[#CBD5E1] text-[#64748B] hover:bg-[#F1F5F9] opacity-80'
                          : isImminent
                          ? 'bg-[#FFFBEB] border-[#F59E0B] text-[#92400E] hover:bg-[#FEF3C7]'
                          : isMine
                          ? 'bg-[#DBEAFE] border-[#3B82F6] text-[#1E3A8A] hover:bg-[#BFDBFE]'
                          : 'bg-[#F1F5F9] border-[#94A3B8] text-[#1E293B] hover:bg-[#E2E8F0]';

                        return (
                          <button
                            key={booking.id}
                            type="button"
                            onClick={() => onInspectBooking(booking)}
                            style={{
                              left: `calc(${leftPct}% + 2px)`,
                              width: `calc(${widthPct}% - 4px)`,
                            }}
                            className={`absolute top-2 bottom-2 rounded-md border px-2.5 py-1 text-left overflow-hidden flex flex-col justify-center transition-colors z-10 cursor-pointer ${blockStyle}`}
                            title={`${booking.title} (${booking.organizerName}, ${formatMinutesToHHMM(
                              booking.startMin
                            )}-${formatMinutesToHHMM(booking.endMin)})`}
                          >
                            <div className="flex items-center justify-between gap-1.5 min-w-0">
                              <span className="text-xs font-semibold truncate">
                                {booking.title}
                              </span>
                            </div>
                            <div className="text-[11px] opacity-85 truncate tabular-nums">
                              {booking.organizerName} ·{' '}
                              {formatMinutesToHHMM(booking.startMin)}–
                              {formatMinutesToHHMM(booking.endMin)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
