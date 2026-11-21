import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock,
  Info,
  Search,
  Trash2,
} from 'lucide-react';
import { Booking, Resource, UserProfile } from '../types/resource';
import {
  findBookingConflict,
  formatCreatedAtKorean,
  formatDateISO,
  formatDateKorean,
  formatDurationKR,
  formatMinutesToHHMM,
  formatMinutesToKoreanClock,
  getMinutesFromMidnight,
} from '../utils/schedule';
import { ArchitecturalVisual } from './ArchitecturalVisual';

interface MyReservationsViewProps {
  bookings: Booking[];
  resources: Resource[];
  now: Date;
  currentUser: UserProfile;
  onOpenQuickReserve: (resourceId?: string) => void;
  onCheckInBooking: (bookingId: string) => void;
  onCompleteBooking: (bookingId: string) => void;
  onCancelBooking: (bookingId: string) => void;
  onUpdateBooking: (
    bookingId: string,
    updates: {
      title: string;
      date?: string;
      startMin: number;
      endMin: number;
      attendeesCount: number;
      notes: string;
    }
  ) => Promise<void> | void;
}

type MyScope = 'all' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

function formatShortDateKorean(dateISO: string): string {
  const [, m, d] = dateISO.split('-').map(Number);
  const parts = dateISO.split('-').map(Number);
  const dt = new Date(parts[0], parts[1] - 1, parts[2]);
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return `${m}월 ${d}일 (${weekdays[dt.getDay()]})`;
}

export const MyReservationsView: React.FC<MyReservationsViewProps> = ({
  bookings,
  resources,
  now,
  currentUser,
  onOpenQuickReserve,
  onCheckInBooking,
  onCompleteBooking,
  onCancelBooking,
  onUpdateBooking,
}) => {
  const [scope, setScope] = useState<MyScope>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Reschedule / edit form state for selected booking
  const [editDate, setEditDate] = useState('');
  const [editStartMin, setEditStartMin] = useState(600);
  const [editEndMin, setEditEndMin] = useState(720);
  const [editTitle, setEditTitle] = useState('');
  const [editAttendees, setEditAttendees] = useState(2);
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const todayISO = formatDateISO(now);
  const nowMin = getMinutesFromMidnight(now);

  const resourceMap = useMemo(() => {
    const map = new Map<string, Resource>();
    resources.forEach((r) => map.set(r.id, r));
    return map;
  }, [resources]);

  const getPhase = (b: Booking) => {
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

  const myBookings = useMemo(() => {
    return bookings
      .filter((b) => b.ownerUid === currentUser.id)
      .sort((a, b) => {
        const phaseA = getPhase(a);
        const phaseB = getPhase(b);
        const rank = (p: string) =>
          p === 'in_progress'
            ? 0
            : p === 'imminent'
            ? 1
            : p === 'upcoming'
            ? 2
            : p === 'completed'
            ? 3
            : 4;
        if (rank(phaseA) !== rank(phaseB)) return rank(phaseA) - rank(phaseB);
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return a.startMin - b.startMin;
      });
  }, [bookings, currentUser.id, todayISO, nowMin]);

  const counts = useMemo(() => {
    let scheduled = 0;
    let inProgress = 0;
    let completed = 0;
    let cancelled = 0;
    for (const b of myBookings) {
      const p = getPhase(b);
      if (p === 'upcoming' || p === 'imminent') scheduled += 1;
      else if (p === 'in_progress') inProgress += 1;
      else if (p === 'completed') completed += 1;
      else if (p === 'cancelled') cancelled += 1;
    }
    return {
      all: myBookings.length,
      scheduled,
      in_progress: inProgress,
      completed,
      cancelled,
    };
  }, [myBookings, todayISO, nowMin]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return myBookings.filter((b) => {
      const p = getPhase(b);
      if (scope === 'scheduled' && p !== 'upcoming' && p !== 'imminent') {
        return false;
      }
      if (scope === 'in_progress' && p !== 'in_progress') return false;
      if (scope === 'completed' && p !== 'completed') return false;
      if (scope === 'cancelled' && p !== 'cancelled') return false;
      if (q) {
        const resName = resourceMap.get(b.resourceId)?.name || b.resourceName || '';
        const hay = `${b.title} ${b.notes || ''} ${resName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [myBookings, scope, search, resourceMap, todayISO, nowMin]);

  // Keep a booking selected automatically when list changes
  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((b) => b.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selectedBooking = useMemo(
    () => myBookings.find((b) => b.id === selectedId) || null,
    [myBookings, selectedId]
  );

  const selectedResource = useMemo(
    () =>
      selectedBooking
        ? resourceMap.get(selectedBooking.resourceId) || null
        : null,
    [selectedBooking, resourceMap]
  );

  // Sync editor inputs whenever selected booking changes
  useEffect(() => {
    if (!selectedBooking) return;
    setEditDate(selectedBooking.date);
    setEditStartMin(selectedBooking.startMin);
    setEditEndMin(selectedBooking.endMin);
    setEditTitle(selectedBooking.title);
    setEditAttendees(selectedBooking.attendeesCount);
    setEditNotes(selectedBooking.notes || '');
  }, [selectedBooking]);

  const timeOptions = useMemo(() => {
    const opts: number[] = [];
    for (let m = 8 * 60; m <= 22 * 60 + 30; m += 15) {
      opts.push(m);
    }
    return opts;
  }, []);

  const selectedPhase = selectedBooking ? getPhase(selectedBooking) : null;
  const isSelectedTerminal =
    selectedPhase === 'completed' || selectedPhase === 'cancelled';

  const editConflict = useMemo(() => {
    if (!selectedBooking || isSelectedTerminal || !editDate) return null;
    return findBookingConflict(
      bookings,
      selectedBooking.resourceId,
      editDate,
      editStartMin,
      editEndMin,
      selectedBooking.id
    );
  }, [
    bookings,
    selectedBooking,
    isSelectedTerminal,
    editDate,
    editStartMin,
    editEndMin,
  ]);

  const invalidRange = Boolean(selectedBooking && editEndMin <= editStartMin);

  const renderPhaseBadge = (phase: ReturnType<typeof getPhase>) => {
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

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !selectedBooking ||
      isSelectedTerminal ||
      editConflict ||
      invalidRange ||
      isSaving
    ) {
      return;
    }
    setIsSaving(true);
    try {
      await onUpdateBooking(selectedBooking.id, {
        title: editTitle.trim() || selectedBooking.title,
        date: editDate || selectedBooking.date,
        startMin: editStartMin,
        endMin: editEndMin,
        attendeesCount: Math.max(
          1,
          Math.min(selectedResource?.capacity || 200, editAttendees)
        ),
        notes: editNotes.trim(),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Toolbar: Status Scope Tabs + Search + Primary New Booking CTA */}
      <section className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 bg-[#F1F5F9] rounded-lg overflow-x-auto">
          {(
            [
              { id: 'all', label: '전체 내역', count: counts.all },
              { id: 'scheduled', label: '예약됨', count: counts.scheduled },
              { id: 'in_progress', label: '진행 중', count: counts.in_progress },
              { id: 'completed', label: '완료됨', count: counts.completed },
              { id: 'cancelled', label: '취소됨', count: counts.cancelled },
            ] as const
          ).map((tab) => {
            const active = scope === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setScope(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5 ${
                  active
                    ? 'bg-[#FFFFFF] text-[#0F172A] shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`tabular-nums text-[11px] ${
                    active ? 'text-[#2563EB]' : 'text-[#94A3B8]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative sm:w-64">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="회의실 또는 목적 검색..."
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-[#FFFFFF] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <button
            type="button"
            onClick={() => onOpenQuickReserve()}
            className="h-10 px-4 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-[#FFFFFF] text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>새 예약하기</span>
          </button>
        </div>
      </section>

      {/* Main Split Workspace */}
      {filtered.length === 0 ? (
        <section className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-12 text-center space-y-3">
          <p className="text-base font-semibold text-[#0F172A]">
            표시할 내 예약 내역이 없습니다
          </p>
          <p className="text-sm text-[#64748B]">
            새 회의실이나 공용 장비를 예약하면 이곳에서 일정 변경, 체크인, 상태 관리를 바로 진행할 수 있습니다.
          </p>
          <button
            type="button"
            onClick={() => onOpenQuickReserve()}
            className="mt-2 h-10 px-4 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-[#FFFFFF] text-sm font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>새 예약하기</span>
          </button>
        </section>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: My Reservations Card List (7 cols) */}
          <section className="lg:col-span-7 space-y-3" aria-label="내 예약 목록">
            {filtered.map((booking) => {
              const res = resourceMap.get(booking.resourceId);
              const phase = getPhase(booking);
              const isSelected = booking.id === selectedBooking?.id;

              return (
                <article
                  key={booking.id}
                  onClick={() => setSelectedId(booking.id)}
                  className={`bg-[#FFFFFF] rounded-xl border p-4 sm:p-5 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#2563EB] ring-2 ring-[#2563EB]/12 shadow-xs'
                      : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <ArchitecturalVisual
                        type={res?.visualType || 'studio'}
                        className="w-12 h-10 rounded-lg shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-sm font-bold text-[#0F172A] truncate">
                            {res?.name || booking.resourceName}
                          </h2>
                          <span className="text-xs text-[#64748B] whitespace-nowrap">
                            {res ? `${res.floor} · ${res.zone}` : ''}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-[#1E293B] truncate mt-0.5">
                          {booking.title}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {renderPhaseBadge(phase)}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B] tabular-nums">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-1 font-medium text-[#0F172A]">
                        <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
                        <span>
                          {booking.date === todayISO
                            ? '오늘'
                            : formatDateKorean(booking.date)}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#64748B]" />
                        <span>
                          {formatMinutesToKoreanClock(booking.startMin)} –{' '}
                          {formatMinutesToKoreanClock(booking.endMin)} (
                          {formatDurationKR(booking.endMin - booking.startMin)})
                        </span>
                      </span>
                    </div>

                    <span className="text-[11px] text-[#94A3B8]">
                      생성: {formatCreatedAtKorean(booking.createdAt)}
                    </span>
                  </div>
                </article>
              );
            })}
          </section>

          {/* Right: Screenshot-Inspired Reschedule & Management Panel (5 cols) */}
          {selectedBooking && selectedPhase && (
            <section
              className="lg:col-span-5 lg:sticky lg:top-24 space-y-4"
              aria-label="선택된 예약 일정 변경 및 관리"
            >
              {/* Blue Selected Booking Banner (Screenshot Design) */}
              <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8]">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>
                      {isSelectedTerminal
                        ? '선택된 예약 정보'
                        : '변경 신청 중인 예약'}
                    </span>
                  </div>
                  {renderPhaseBadge(selectedPhase)}
                </div>

                <h3 className="text-base font-bold text-[#0F172A]">
                  {selectedResource?.name || selectedBooking.resourceName}
                </h3>

                <p className="text-xs font-medium text-[#475569] tabular-nums">
                  기접수 일정: {formatShortDateKorean(selectedBooking.date)}{' '}
                  {formatMinutesToHHMM(selectedBooking.startMin)} -{' '}
                  {formatMinutesToHHMM(selectedBooking.endMin)}
                </p>

                <p className="text-[11px] text-[#64748B] tabular-nums pt-1">
                  예약 생성 시점: {formatCreatedAtKorean(selectedBooking.createdAt)}
                  {selectedBooking.checkedIn ? ' · 입실 체크인 완료' : ''}
                </p>
              </div>

              {/* Reschedule & Purpose Form Card */}
              <form
                onSubmit={handleSaveChanges}
                className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 space-y-4"
              >
                {/* Date Picker Field */}
                <div>
                  <label
                    htmlFor="my-res-date"
                    className="block text-xs font-semibold text-[#475569] mb-2"
                  >
                    변경 시작 날짜 선택
                  </label>
                  <div className="relative flex items-center h-12 px-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] focus-within:bg-[#FFFFFF] focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-[#2563EB]/15">
                    <Calendar className="w-4 h-4 text-[#64748B] shrink-0 mr-3 pointer-events-none" />
                    <input
                      id="my-res-date"
                      type="date"
                      disabled={isSelectedTerminal}
                      value={editDate}
                      onChange={(e) => {
                        if (e.target.value) setEditDate(e.target.value);
                      }}
                      className="w-full bg-transparent text-sm font-semibold text-[#0F172A] tabular-nums focus:outline-none disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* New Start / End Time Two-Column Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="my-res-start"
                      className="block text-xs font-semibold text-[#475569] mb-2"
                    >
                      새로운 시작 시간
                    </label>
                    <div className="relative flex items-center h-12 px-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] focus-within:bg-[#FFFFFF] focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-[#2563EB]/15">
                      <Clock className="w-4 h-4 text-[#64748B] shrink-0 mr-2.5 pointer-events-none" />
                      <select
                        id="my-res-start"
                        disabled={isSelectedTerminal}
                        value={editStartMin}
                        onChange={(e) => setEditStartMin(Number(e.target.value))}
                        className="w-full bg-transparent text-sm font-semibold text-[#0F172A] tabular-nums focus:outline-none disabled:opacity-60 cursor-pointer"
                      >
                        {timeOptions.slice(0, -1).map((m) => (
                          <option key={m} value={m}>
                            {formatMinutesToKoreanClock(m)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="my-res-end"
                      className="block text-xs font-semibold text-[#475569] mb-2"
                    >
                      새로운 종료 시간
                    </label>
                    <div className="relative flex items-center h-12 px-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] focus-within:bg-[#FFFFFF] focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-[#2563EB]/15">
                      <Clock className="w-4 h-4 text-[#64748B] shrink-0 mr-2.5 pointer-events-none" />
                      <select
                        id="my-res-end"
                        disabled={isSelectedTerminal}
                        value={editEndMin}
                        onChange={(e) => setEditEndMin(Number(e.target.value))}
                        className="w-full bg-transparent text-sm font-semibold text-[#0F172A] tabular-nums focus:outline-none disabled:opacity-60 cursor-pointer"
                      >
                        {timeOptions.slice(1).map((m) => (
                          <option key={m} value={m}>
                            {formatMinutesToKoreanClock(m)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Purpose & Attendees */}
                <div className="space-y-3 pt-1">
                  <div>
                    <label
                      htmlFor="my-res-title"
                      className="block text-xs font-semibold text-[#475569] mb-1.5"
                    >
                      회의명 / 사용 목적
                    </label>
                    <input
                      id="my-res-title"
                      type="text"
                      disabled={isSelectedTerminal}
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-sm text-[#0F172A] focus:bg-[#FFFFFF] focus:outline-none focus:border-[#2563EB] disabled:opacity-60"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label
                        htmlFor="my-res-attendees"
                        className="block text-xs font-semibold text-[#475569] mb-1.5"
                      >
                        참석 인원
                      </label>
                      <input
                        id="my-res-attendees"
                        type="number"
                        min={1}
                        max={selectedResource?.capacity || 200}
                        disabled={isSelectedTerminal}
                        value={editAttendees}
                        onChange={(e) => setEditAttendees(Number(e.target.value))}
                        className="w-full h-10 px-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-sm text-[#0F172A] tabular-nums focus:bg-[#FFFFFF] focus:outline-none focus:border-[#2563EB] disabled:opacity-60"
                      />
                    </div>
                    <div className="col-span-2">
                      <label
                        htmlFor="my-res-notes"
                        className="block text-xs font-semibold text-[#475569] mb-1.5"
                      >
                        메모
                      </label>
                      <input
                        id="my-res-notes"
                        type="text"
                        disabled={isSelectedTerminal}
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="안건 또는 요청 사항"
                        className="w-full h-10 px-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-sm text-[#0F172A] focus:bg-[#FFFFFF] focus:outline-none focus:border-[#2563EB] disabled:opacity-60"
                      />
                    </div>
                  </div>
                </div>

                {/* Validation / Conflict Alert */}
                {(invalidRange || editConflict) && !isSelectedTerminal && (
                  <div className="p-3 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] flex items-start gap-2 text-xs text-[#B45309]">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      {invalidRange
                        ? '종료 시간은 시작 시간보다 이후여야 합니다.'
                        : `선택한 일정에 기존 예약('${editConflict?.title}')과 겹치는 시간이 있습니다.`}
                    </span>
                  </div>
                )}

                {/* Actions */}
                {isSelectedTerminal ? (
                  <div className="pt-2 border-t border-[#E2E8F0] space-y-3">
                    <p className="text-xs text-[#64748B]">
                      {selectedPhase === 'cancelled'
                        ? '취소된 예약입니다. 동일 리소스를 다시 이용하려면 새 예약을 등록해 주세요.'
                        : '완료된 예약입니다. 동일 리소스로 새 예약을 바로 만들 수 있습니다.'}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        onOpenQuickReserve(selectedBooking.resourceId)
                      }
                      className="w-full h-11 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-[#FFFFFF] text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <CalendarPlus className="w-4 h-4" />
                      <span>이 리소스로 다시 예약하기</span>
                    </button>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-[#E2E8F0] space-y-2.5">
                    <button
                      type="submit"
                      disabled={Boolean(invalidRange || editConflict || isSaving)}
                      className="w-full h-11 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-[#CBD5E1] disabled:cursor-not-allowed text-[#FFFFFF] text-sm font-semibold transition-colors cursor-pointer"
                    >
                      {isSaving ? '변경 저장 중...' : '일정 변경 저장'}
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                      {!selectedBooking.checkedIn && (
                        <button
                          type="button"
                          onClick={() => onCheckInBooking(selectedBooking.id)}
                          className="flex-1 h-9 px-3 rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#047857] text-xs font-semibold inline-flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>입실 체크인</span>
                        </button>
                      )}
                      {selectedPhase === 'in_progress' && (
                        <button
                          type="button"
                          onClick={() => onCompleteBooking(selectedBooking.id)}
                          className="flex-1 h-9 px-3 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] hover:bg-[#ECFDF5] hover:text-[#047857] text-[#0F172A] text-xs font-semibold inline-flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>사용 완료</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onCancelBooking(selectedBooking.id)}
                        className="flex-1 h-9 px-3 rounded-lg border border-[#FECACA] bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#B91C1C] text-xs font-semibold inline-flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>예약 취소</span>
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
