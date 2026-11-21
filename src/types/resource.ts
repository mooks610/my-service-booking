export type ResourceCategory = 'meeting_room' | 'focus_booth' | 'equipment';

export type ResourceVisualType = 'boardroom' | 'studio' | 'scrum' | 'booth' | 'equipment';

export type OperationalStatus = 'active' | 'maintenance';

export type LiveAvailabilityState =
  | 'available'
  | 'occupied'
  | 'imminent_end'
  | 'imminent_start'
  | 'maintenance';

export type ViewTab =
  | 'overview'
  | 'timeline'
  | 'my_reservations'
  | 'reservations'
  | 'directory';

export interface UserProfile {
  id: string;
  name: string;
  department: string;
  role: string;
  initials: string;
  email: string;
}

export interface Resource {
  id: string;
  name: string;
  category: ResourceCategory;
  visualType: ResourceVisualType;
  floor: string;
  zone: string;
  capacity: number;
  amenities: string[];
  description: string;
  operationalStatus: OperationalStatus;
  createdByUid?: string;
}

export type BookingStatus = 'confirmed' | 'cancelled';

export type BookingLifecycleStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface Booking {
  id: string;
  ownerUid: string;
  resourceId: string;
  resourceName: string;
  title: string;
  organizerId: string;
  organizerName: string;
  organizerDepartment: string;
  date: string; // YYYY-MM-DD
  startMin: number; // minutes from midnight (0 - 1440)
  endMin: number; // minutes from midnight (0 - 1440)
  attendeesCount: number;
  notes?: string;
  checkedIn: boolean;
  status: BookingStatus;
  lifecycleStatus: BookingLifecycleStatus;
  createdAt: string; // ISO string converted from Firestore Timestamp
  updatedAt?: string;
}

export interface ResourceLiveInfo {
  state: LiveAvailabilityState;
  currentBooking: Booking | null;
  nextBooking: Booking | null;
  minutesRemaining: number | null;
  minutesUntilNext: number | null;
}

export interface QuickReserveContext {
  resourceId?: string;
  date?: string;
  startMin?: number;
  durationMin?: number;
}

export interface ToastItem {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
}
