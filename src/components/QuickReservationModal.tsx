import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { Booking, Resource, UserProfile } from '../types/resource';
import {
  findBookingConflict,
  findMaxAvailableEndMin,
  formatDateISO,
  formatDurationKR,
  formatMinutesToHHMM,
  getCategoryLabel,
  getSuggestedStartMin,
} from '../utils/schedule';
import { ArchitecturalVisual } from './ArchitecturalVisual';

interface QuickReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  resources: Resource[];
  bookings: Booking[];
  now: Date;
  currentUser: UserProfile;
  initialResourceId?: string;
  initialDate?: string;
  initialStartMin?: number;
  onConfirmBooking: (payload: {
    resourceId: string;
    title: string;
    date: string;
    startMin: number;
    endMin: number;
    attendeesCount: number;
    notes: string;
  }) => Promise<void> | void;
}

const TITLE_PRESETS = [
  '팀 데일리 싱크',
  '1:1 미팅',
  '프로덕트 리뷰',
  '고객 화상 미팅',
];

const DURATION_PRESETS = [
  { label: '15분', minutes: 15 },
  { label: '30분', minutes: 30 },
  { label: '1시간', minutes: 60 },
  { label: '2시간', minutes: 120 },
];

export const QuickReservationModal: React.FC<QuickReservationModalProps> = ({
  isOpen,
  onClose,
  resources,
  bookings,
  now,
  initialResourceId,
  initialDate,
  initialStartMin,
  onConfirmBooking,
}) => {
  const activeResources = useMemo(
    () => resources.filter((r) => r.operationalStatus === 'active'),
    [resources]
  );

  const todayISO = formatDateISO(now);

  const [resourceId, setResourceId] = useState<string>(
    initialResourceId || activeResources[0]?.id || ''
  );
  const [date, setDate] = useState<string>(initialDate || todayISO);
  const [startMin, setStartMin] = useState<number>(initialStartMin ?? 9 * 60);
  const [durationMin, setDurationMin] = useState<number>(30);
  const [title, setTitle] = useState<string>('');
  const [attendeesCount, setAttendeesCount] = useState<number>(4);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    const targetResId =
      initialResourceId &&
      activeResources.some((r) => r.id === initialResourceId)
        ? initialResourceId
        : activeResources[0]?.id || '';
    const targetDate = initialDate || formatDateISO(now);
    const targetStart =
      initialStartMin !== undefined
        ? initialStartMin
        : getSuggestedStartMin(bookings, targetResId, targetDate, now);

    setResourceId(targetResId);
    setDate(targetDate);
    setStartMin(targetStart);

    // Pick smart initial duration based on available gap
    const maxEnd = findMaxAvailableEndMin(
      bookings,
      targetResId,
      targetDate,
      targetStart
    );
    const gap = Math.max(15, maxEnd - targetStart);
    setDurationMin(gap >= 30 ? 30 : 15);
    setTitle('');
    const res = activeResources.find((r) => r.id === targetResId);
    setAttendeesCount(res ? Math.min(4, res.capacity) : 2);
    setNotes('');
  }, [isOpen, initialResourceId, initialDate, initialStartMin]);

  const selectedResource = useMemo(
    () => resources.find((r) => r.id === resourceId) || activeResources[0],
    [resources, activeResources, resourceId]
  );

  const endMin = Math.min(23 * 60, startMin + durationMin);

  const conflict = useMemo(() => {
    if (!selectedResource) return null;
    return findBookingConflict(
      bookings,
      selectedResource.id,
      date,
      startMin,
      endMin
    );
  }, [bookings, selectedResource, date, startMin, endMin]);

  const maxAvailableBeforeConflict = useMemo(() => {
    if (!selectedResource) return 120;
    const maxEnd = findMaxAvailableEndMin(
      bookings,
      selectedResource.id,
      date,
      startMin
    );
    return Math.max(0, maxEnd - startMin);
  }, [bookings, selectedResource, date, startMin]);

  const timeOptions = useMemo(() => {
    const opts: number[] = [];
    for (let m = 8 * 60; m <= 22 * 60; m += 15) {
      opts.push(m);
    }
    return opts;
  }, []);

  if (!isOpen || !selectedResource) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (conflict || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirmBooking({
        resourceId: selectedResource.id,
        title: title.trim() || `${selectedResource.name} 빠른 미팅`,
        date,
        startMin,
        endMin,
        attendeesCount: Math.max(1, Math.min(selectedResource.capacity, attendeesCount)),
        notes: notes.trim(),
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetNow = () => {
    const freshDate = formatDateISO(now);
    const suggested = getSuggestedStartMin(
      bookings,
      selectedResource.id,
      freshDate,
      now
    );
    setDate(freshDate);
    setStartMin(suggested);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-reserve-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Sheet (480px centered desktop / bottom sheet mobile) */}
      <div className="relative z-10 w-full sm:max-w-[480px] bg-[#FFFFFF] rounded-t-xl sm:rounded-xl border border-[#E2E8F0] shadow-[0_20px_25px_-5px_rgba(15,23,42,0.1),0_8px_10px_-6px_rgba(15,23,42,0.05)] overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header: Resource visual, specs & amenities */}
        <div className="p-5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <ArchitecturalVisual
              type={selectedResource.visualType}
              className="w-20 h-14 rounded-lg shrink-0"
            />
            <div className="min-w-0">
              <h2
                id="quick-reserve-title"
                className="text-base font-bold text-[#0F172A] truncate"
              >
                {selectedResource.name}
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5 tabular-nums">
                {getCategoryLabel(selectedResource.category)} · {selectedResource.floor}{' '}
                {selectedResource.zone} ·{' '}
                {selectedResource.category === 'equipment'
                  ? '1세트'
                  : `최대 ${selectedResource.capacity}인`}
              </p>
              <p className="text-xs text-[#0D9488] font-medium mt-1 truncate">
                {selectedResource.amenities.join(' · ')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0]/60 transition-colors cursor-pointer shrink-0"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Resource Switcher */}
          <div>
            <label
              htmlFor="qr-resource"
              className="block text-xs font-semibold text-[#475569] mb-1.5"
            >
              예약 리소스
            </label>
            <select
              id="qr-resource"
              value={selectedResource.id}
              onChange={(e) => {
                const nextId = e.target.value;
                setResourceId(nextId);
                const res = activeResources.find((r) => r.id === nextId);
                if (res && attendeesCount > res.capacity) {
                  setAttendeesCount(res.capacity);
                }
              }}
              className="w-full h-10 px-3 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-sm font-medium text-[#0F172A] focus:bg-[#FFFFFF] focus:outline-none focus:border-2 focus:border-[#0D9488]"
            >
              {activeResources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.floor} ·{' '}
                  {r.category === 'equipment' ? '공용 장비' : `${r.capacity}인`})
                </option>
              ))}
            </select>
          </div>

          {/* Meeting Title + Presets */}
          <div>
            <label
              htmlFor="qr-title"
              className="block text-xs font-semibold text-[#475569] mb-1.5"
            >
              회의명 또는 사용 목적
            </label>
            <input
              id="qr-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 스프린트 리뷰, 1:1 미팅"
              className="w-full h-10 px-3 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-[#FFFFFF] focus:outline-none focus:border-2 focus:border-[#0D9488]"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TITLE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTitle(preset)}
                  className="px-2.5 py-1 rounded-md border border-[#E2E8F0] bg-[#FFFFFF] hover:border-[#0D9488] hover:text-[#0D9488] text-xs font-medium text-[#475569] transition-colors cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Start Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="qr-date"
                className="block text-xs font-semibold text-[#475569] mb-1.5"
              >
                날짜
              </label>
              <input
                id="qr-date"
                type="date"
                value={date}
                onChange={(e) => {
                  if (e.target.value) setDate(e.target.value);
                }}
                className="w-full h-10 px-3 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-sm text-[#0F172A] tabular-nums focus:bg-[#FFFFFF] focus:outline-none focus:border-2 focus:border-[#0D9488]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="qr-start"
                  className="text-xs font-semibold text-[#475569]"
                >
                  시작 시각
                </label>
                <button
                  type="button"
                  onClick={handleSetNow}
                  className="text-[11px] font-semibold text-[#0D9488] hover:text-[#0F766E] cursor-pointer"
                >
                  가능한 가장 빠른 시각
                </button>
              </div>
              <select
                id="qr-start"
                value={startMin}
                onChange={(e) => setStartMin(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-sm font-medium text-[#0F172A] tabular-nums focus:bg-[#FFFFFF] focus:outline-none focus:border-2 focus:border-[#0D9488]"
              >
                {timeOptions.map((m) => (
                  <option key={m} value={m}>
                    {formatMinutesToHHMM(m)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Instant Duration Slider + End-Time Preview (Image_11 Core Spec) */}
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#475569] inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#0D9488]" />
                <span>이용 시간 선택</span>
              </span>
              <span className="text-base font-bold text-[#0F172A] tabular-nums">
                {formatMinutesToHHMM(startMin)} → {formatMinutesToHHMM(endMin)}
                <span className="ml-1.5 text-xs font-semibold text-[#0D9488]">
                  ({formatDurationKR(endMin - startMin)})
                </span>
              </span>
            </div>

            <input
              type="range"
              aria-label="이용 시간 슬라이더"
              min={15}
              max={120}
              step={15}
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value))}
              className="w-full rh-slider"
            />

            <div className="grid grid-cols-4 gap-2">
              {DURATION_PRESETS.map((preset) => {
                const active = durationMin === preset.minutes;
                return (
                  <button
                    key={preset.minutes}
                    type="button"
                    onClick={() => setDurationMin(preset.minutes)}
                    className={`h-8 rounded-lg border text-xs font-semibold tabular-nums transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#0D9488] border-[#0D9488] text-[#FFFFFF]'
                        : 'bg-[#FFFFFF] border-[#CBD5E1] text-[#475569] hover:border-[#0D9488] hover:text-[#0D9488]'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conflict Warning */}
          {conflict && (
            <div className="p-3.5 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] flex flex-col gap-2">
              <div className="flex items-start gap-2 text-xs text-[#B45309]">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold">선택한 시간대에 기존 예약이 있습니다.</p>
                  <p className="tabular-nums">
                    충돌 일정: {conflict.title} ({conflict.organizerName} ·{' '}
                    {formatMinutesToHHMM(conflict.startMin)}–
                    {formatMinutesToHHMM(conflict.endMin)})
                  </p>
                </div>
              </div>
              {maxAvailableBeforeConflict >= 15 && (
                <button
                  type="button"
                  onClick={() =>
                    setDurationMin(
                      Math.floor(maxAvailableBeforeConflict / 15) * 15
                    )
                  }
                  className="self-start px-2.5 py-1 rounded-md bg-[#FFFFFF] border border-[#FCD34D] text-xs font-semibold text-[#B45309] hover:bg-[#FEF3C7] cursor-pointer tabular-nums"
                >
                  충돌 전까지({formatDurationKR(Math.floor(maxAvailableBeforeConflict / 15) * 15)})로 자동 조정
                </button>
              )}
            </div>
          )}

          {/* Attendees & Notes */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="qr-attendees"
                className="block text-xs font-semibold text-[#475569] mb-1.5"
              >
                예상 인원
              </label>
              <input
                id="qr-attendees"
                type="number"
                min={1}
                max={selectedResource.capacity}
                value={attendeesCount}
                onChange={(e) => setAttendeesCount(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-sm text-[#0F172A] tabular-nums focus:bg-[#FFFFFF] focus:outline-none focus:border-2 focus:border-[#0D9488]"
              />
            </div>

            <div className="col-span-2">
              <label
                htmlFor="qr-notes"
                className="block text-xs font-semibold text-[#475569] mb-1.5"
              >
                메모 (선택)
              </label>
              <input
                id="qr-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="안건 또는 장비 요청 사항"
                className="w-full h-10 px-3 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-[#FFFFFF] focus:outline-none focus:border-2 focus:border-[#0D9488]"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-lg text-sm font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={Boolean(conflict) || isSubmitting}
              className="h-10 px-5 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] disabled:bg-[#CBD5E1] disabled:cursor-not-allowed text-[#FFFFFF] text-sm font-semibold transition-colors cursor-pointer"
            >
              {isSubmitting ? '저장 중...' : '예약 확정하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
