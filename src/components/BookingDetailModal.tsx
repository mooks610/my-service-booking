import React, { useEffect, useMemo, useState } from 'react';
import { Check, CheckCircle2, Clock, Edit3, Trash2, Users, X } from 'lucide-react';
import { Booking, Resource, UserProfile } from '../types/resource';
import {
  findBookingConflict,
  formatCreatedAtKorean,
  formatDateISO,
  formatDateKorean,
  formatDurationKR,
  formatMinutesToHHMM,
  getMinutesFromMidnight,
} from '../utils/schedule';
import { ArchitecturalVisual } from './ArchitecturalVisual';

interface BookingDetailModalProps {
  booking: Booking | null;
  resource: Resource | null;
  bookings: Booking[];
  now: Date;
  currentUser: UserProfile;
  onClose: () => void;
  onCheckIn: (bookingId: string) => void;
  onExtend: (bookingId: string, extraMinutes: number) => void;
  onComplete: (bookingId: string) => void;
  onUpdate: (
    bookingId: string,
    updates: {
      title: string;
      startMin: number;
      endMin: number;
      attendeesCount: number;
      notes: string;
    }
  ) => void;
  onCancelBooking: (bookingId: string) => void;
}

export const BookingDetailModal: React.FC<BookingDetailModalProps> = ({
  booking,
  resource,
  bookings,
  now,
  currentUser,
  onClose,
  onCheckIn,
  onExtend,
  onComplete,
  onUpdate,
  onCancelBooking,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [startMin, setStartMin] = useState(540);
  const [endMin, setEndMin] = useState(600);
  const [attendeesCount, setAttendeesCount] = useState(2);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!booking) return;
    setIsEditing(false);
    setTitle(booking.title);
    setStartMin(booking.startMin);
    setEndMin(booking.endMin);
    setAttendeesCount(booking.attendeesCount);
    setNotes(booking.notes || '');
  }, [booking]);

  const timeOptions = useMemo(() => {
    const arr: number[] = [];
    for (let m = 8 * 60; m <= 22 * 60 + 30; m += 15) {
      arr.push(m);
    }
    return arr;
  }, []);

  if (!booking || !resource) return null;

  const todayISO = formatDateISO(now);
  const nowMin = getMinutesFromMidnight(now);
  const isTerminal =
    booking.status === 'cancelled' ||
    booking.lifecycleStatus === 'cancelled' ||
    booking.lifecycleStatus === 'completed';

  const isActiveOrUpcoming =
    !isTerminal &&
    (booking.date > todayISO ||
      (booking.date === todayISO && booking.endMin > nowMin));
  const isInProgress =
    !isTerminal &&
    booking.date === todayISO &&
    booking.startMin <= nowMin &&
    nowMin < booking.endMin;

  const statusMeta = (() => {
    if (booking.status === 'cancelled' || booking.lifecycleStatus === 'cancelled') {
      return { label: '취소됨', cls: 'bg-[#FEE2E2] text-[#B91C1C]' };
    }
    if (
      booking.lifecycleStatus === 'completed' ||
      booking.date < todayISO ||
      (booking.date === todayISO && booking.endMin <= nowMin)
    ) {
      return { label: '완료됨', cls: 'bg-[#F3F4F6] text-[#4B5563]' };
    }
    if (isInProgress) {
      return { label: '진행 중', cls: 'bg-[#DBEAFE] text-[#1D4ED8]' };
    }
    return { label: '예약됨', cls: 'bg-[#DCFCE7] text-[#15803D]' };
  })();

  const editConflict = isEditing
    ? findBookingConflict(
        bookings,
        booking.resourceId,
        booking.date,
        startMin,
        endMin,
        booking.id
      )
    : null;

  const invalidRange = isEditing && endMin <= startMin;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editConflict || invalidRange) return;
    onUpdate(booking.id, {
      title: title.trim() || booking.title,
      startMin,
      endMin,
      attendeesCount,
      notes: notes.trim(),
    });
    setIsEditing(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-detail-title"
    >
      <div
        className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full sm:max-w-[480px] bg-[#FFFFFF] rounded-t-xl sm:rounded-xl border border-[#E2E8F0] shadow-[0_20px_25px_-5px_rgba(15,23,42,0.1)] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <ArchitecturalVisual
              type={resource.visualType}
              className="w-16 h-12 rounded-lg shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-[#0D9488]">
                  {resource.name} · {resource.floor}
                </p>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusMeta.cls}`}
                >
                  {statusMeta.label}
                </span>
              </div>
              <h2
                id="booking-detail-title"
                className="text-base font-bold text-[#0F172A] truncate mt-0.5"
              >
                {booking.title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0]/60 cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1.5">
                회의명
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-[#FFFFFF] border border-[#CBD5E1] text-sm text-[#0F172A] focus:outline-none focus:border-2 focus:border-[#0D9488]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5">
                  시작 시각
                </label>
                <select
                  value={startMin}
                  onChange={(e) => setStartMin(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg bg-[#FFFFFF] border border-[#CBD5E1] text-sm tabular-nums focus:outline-none focus:border-2 focus:border-[#0D9488]"
                >
                  {timeOptions.slice(0, -1).map((m) => (
                    <option key={m} value={m}>
                      {formatMinutesToHHMM(m)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5">
                  종료 시각
                </label>
                <select
                  value={endMin}
                  onChange={(e) => setEndMin(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg bg-[#FFFFFF] border border-[#CBD5E1] text-sm tabular-nums focus:outline-none focus:border-2 focus:border-[#0D9488]"
                >
                  {timeOptions.slice(1).map((m) => (
                    <option key={m} value={m}>
                      {formatMinutesToHHMM(m)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(editConflict || invalidRange) && (
              <p className="text-xs font-medium text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3 py-2">
                {invalidRange
                  ? '종료 시각은 시작 시각보다 이후여야 합니다.'
                  : `기존 예약('${editConflict?.title}')과 시간이 겹칩니다.`}
              </p>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5">
                  참석 인원
                </label>
                <input
                  type="number"
                  min={1}
                  max={resource.capacity}
                  value={attendeesCount}
                  onChange={(e) => setAttendeesCount(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg bg-[#FFFFFF] border border-[#CBD5E1] text-sm tabular-nums focus:outline-none focus:border-2 focus:border-[#0D9488]"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-[#475569] mb-1.5">
                  메모
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-[#FFFFFF] border border-[#CBD5E1] text-sm focus:outline-none focus:border-2 focus:border-[#0D9488]"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="h-10 px-4 rounded-lg text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={Boolean(editConflict || invalidRange)}
                className="h-10 px-5 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] disabled:bg-[#CBD5E1] text-[#FFFFFF] text-sm font-semibold cursor-pointer"
              >
                변경 저장
              </button>
            </div>
          </form>
        ) : (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-[#64748B]">예약 일시</p>
                <p className="mt-1 font-semibold text-[#0F172A] tabular-nums">
                  {booking.date === todayISO ? '오늘' : formatDateKorean(booking.date)}
                </p>
                <p className="text-xs text-[#475569] tabular-nums inline-flex items-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {formatMinutesToHHMM(booking.startMin)} –{' '}
                    {formatMinutesToHHMM(booking.endMin)} (
                    {formatDurationKR(booking.endMin - booking.startMin)})
                  </span>
                </p>
              </div>

              <div>
                <p className="text-xs text-[#64748B]">예약자 및 참석 인원</p>
                <p className="mt-1 font-semibold text-[#0F172A]">
                  {booking.organizerName}
                  {booking.ownerUid === currentUser.id ? ' (나)' : ''}
                </p>
                <p className="text-xs text-[#475569] inline-flex items-center gap-1 mt-0.5 tabular-nums">
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    {booking.organizerDepartment} · {booking.attendeesCount}명
                  </span>
                </p>
              </div>
            </div>

            <div className="text-xs text-[#64748B] tabular-nums flex items-center justify-between pt-2 border-t border-[#F1F5F9]">
              <span>예약 생성 시점</span>
              <span className="font-medium text-[#0F172A]">
                {formatCreatedAtKorean(booking.createdAt)}
              </span>
            </div>

            {booking.notes && (
              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#475569]">
                {booking.notes}
              </div>
            )}

            {/* Quick Operational Controls */}
            {isActiveOrUpcoming && (
              <div className="pt-3 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {!booking.checkedIn ? (
                    <button
                      type="button"
                      onClick={() => onCheckIn(booking.id)}
                      className="h-9 px-3.5 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-[#FFFFFF] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>입실 체크인</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#047857] bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg px-3 h-9">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>체크인 완료</span>
                    </span>
                  )}

                  {isInProgress && (
                    <>
                      <button
                        type="button"
                        onClick={() => onExtend(booking.id, 15)}
                        className="h-9 px-3 rounded-lg border border-[#CBD5E1] bg-[#FFFFFF] hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] cursor-pointer"
                      >
                        +15분 연장
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onComplete(booking.id);
                          onClose();
                        }}
                        className="h-9 px-3 rounded-lg border border-[#CBD5E1] bg-[#FFFFFF] hover:bg-[#ECFDF5] hover:text-[#047857] text-xs font-semibold text-[#0F172A] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>사용 완료</span>
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="h-9 px-3 rounded-lg border border-[#CBD5E1] bg-[#FFFFFF] hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>수정</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onCancelBooking(booking.id);
                      onClose();
                    }}
                    className="h-9 px-3 rounded-lg border border-[#FECACA] bg-[#FEF2F2] hover:bg-[#FEE2E2] text-xs font-semibold text-[#B91C1C] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>예약 취소</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
