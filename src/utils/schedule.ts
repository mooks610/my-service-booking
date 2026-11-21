import { Booking, Resource, ResourceLiveInfo } from '../types/resource';

export const TIMELINE_START_MIN = 8 * 60; // 08:00
export const DEFAULT_TIMELINE_END_MIN = 21 * 60; // 21:00

export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysISO(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return formatDateISO(dt);
}

export function formatDateKorean(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return `${y}년 ${m}월 ${d}일 (${weekdays[dt.getDay()]})`;
}

export function getMinutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function formatMinutesToHHMM(totalMin: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, totalMin));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatMinutesToKoreanClock(totalMin: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, totalMin));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  const period = h < 12 ? '오전' : '오후';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${period} ${displayH}:${String(m).padStart(2, '0')}`;
}

export function formatDurationKR(durationMin: number): string {
  if (durationMin < 60) return `${durationMin}분`;
  const h = Math.floor(durationMin / 60);
  const m = durationMin % 60;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

export function ceilToStep(minutes: number, step: number): number {
  return Math.ceil(minutes / step) * step;
}

export function floorToStep(minutes: number, step: number): number {
  return Math.floor(minutes / step) * step;
}

export function computeResourceLiveInfo(
  resource: Resource,
  bookings: Booking[],
  now: Date
): ResourceLiveInfo {
  if (resource.operationalStatus === 'maintenance') {
    return {
      state: 'maintenance',
      currentBooking: null,
      nextBooking: null,
      minutesRemaining: null,
      minutesUntilNext: null,
    };
  }

  const todayISO = formatDateISO(now);
  const nowMin = getMinutesFromMidnight(now);

  const todayBookings = bookings
    .filter(
      (b) =>
        b.resourceId === resource.id &&
        b.date === todayISO &&
        b.status === 'confirmed' &&
        b.lifecycleStatus !== 'completed'
    )
    .sort((a, b) => a.startMin - b.startMin);

  const currentBooking =
    todayBookings.find((b) => b.startMin <= nowMin && nowMin < b.endMin) || null;

  const nextBooking =
    todayBookings.find((b) => b.startMin > nowMin) || null;

  if (currentBooking) {
    const minutesRemaining = currentBooking.endMin - nowMin;
    return {
      state: minutesRemaining <= 10 ? 'imminent_end' : 'occupied',
      currentBooking,
      nextBooking,
      minutesRemaining,
      minutesUntilNext: nextBooking ? nextBooking.startMin - nowMin : null,
    };
  }

  if (nextBooking) {
    const minutesUntilNext = nextBooking.startMin - nowMin;
    return {
      state: minutesUntilNext <= 10 ? 'imminent_start' : 'available',
      currentBooking: null,
      nextBooking,
      minutesRemaining: null,
      minutesUntilNext,
    };
  }

  return {
    state: 'available',
    currentBooking: null,
    nextBooking: null,
    minutesRemaining: null,
    minutesUntilNext: null,
  };
}

export function findBookingConflict(
  bookings: Booking[],
  resourceId: string,
  date: string,
  startMin: number,
  endMin: number,
  excludeBookingId?: string
): Booking | null {
  return (
    bookings.find(
      (b) =>
        b.id !== excludeBookingId &&
        b.resourceId === resourceId &&
        b.date === date &&
        b.status === 'confirmed' &&
        b.lifecycleStatus !== 'completed' &&
        b.startMin < endMin &&
        b.endMin > startMin
    ) || null
  );
}

export function findMaxAvailableEndMin(
  bookings: Booking[],
  resourceId: string,
  date: string,
  startMin: number,
  dayEndLimitMin: number = 22 * 60,
  excludeBookingId?: string
): number {
  const next = bookings
    .filter(
      (b) =>
        b.id !== excludeBookingId &&
        b.resourceId === resourceId &&
        b.date === date &&
        b.status === 'confirmed' &&
        b.lifecycleStatus !== 'completed' &&
        b.startMin >= startMin
    )
    .sort((a, b) => a.startMin - b.startMin)[0];

  if (!next) return dayEndLimitMin;
  return Math.min(next.startMin, dayEndLimitMin);
}

export function getSuggestedStartMin(
  bookings: Booking[],
  resourceId: string,
  dateISO: string,
  now: Date
): number {
  const todayISO = formatDateISO(now);
  const nowMin = getMinutesFromMidnight(now);

  // If booking for a future date, default to 09:00 or first available slot
  let candidate =
    dateISO === todayISO
      ? Math.max(TIMELINE_START_MIN, floorToStep(nowMin, 15))
      : 9 * 60;

  if (candidate > 21 * 60) {
    candidate = 21 * 60;
  }

  // If current candidate is occupied, jump to the end of the blocking booking
  const sorted = bookings
    .filter(
      (b) =>
        b.resourceId === resourceId &&
        b.date === dateISO &&
        b.status === 'confirmed' &&
        b.lifecycleStatus !== 'completed'
    )
    .sort((a, b) => a.startMin - b.startMin);

  for (const b of sorted) {
    if (b.startMin <= candidate && candidate < b.endMin) {
      candidate = b.endMin;
    }
  }

  return Math.min(candidate, 21 * 60 + 30);
}

export function computeDailyUtilizationPercent(
  bookings: Booking[],
  resourceId: string,
  dateISO: string,
  operatingHoursMin: number = 12 * 60
): number {
  const totalBookedMin = bookings
    .filter(
      (b) =>
        b.resourceId === resourceId &&
        b.date === dateISO &&
        b.status === 'confirmed'
    )
    .reduce((acc, b) => acc + Math.max(0, b.endMin - b.startMin), 0);

  return Math.min(100, Math.round((totalBookedMin / operatingHoursMin) * 100));
}

export function getCategoryLabel(category: Resource['category']): string {
  switch (category) {
    case 'meeting_room':
      return '회의실';
    case 'focus_booth':
      return '포커스 부스';
    case 'equipment':
      return '공용 장비';
  }
}

export function formatCreatedAtKorean(iso: string): string {
  if (!iso) return '-';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}
