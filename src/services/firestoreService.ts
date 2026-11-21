import { User } from 'firebase/auth';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { INITIAL_RESOURCES, createInitialBookings } from '../data/initialData';
import { OperationType, db, handleFirestoreError } from '../firebase';
import {
  Booking,
  BookingLifecycleStatus,
  Resource,
} from '../types/resource';
import { formatDateISO, getMinutesFromMidnight } from '../utils/schedule';

export const ADMIN_EMAIL = 'mooks610@gmail.com';

export function isUserAdmin(user: User | null): boolean {
  return Boolean(
    user && user.email === ADMIN_EMAIL && user.emailVerified === true
  );
}

function clampString(value: string, maxLen: number, fallback = ''): string {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLen);
}

function timestampToISO(ts: unknown): string {
  if (ts instanceof Timestamp) {
    return ts.toDate().toISOString();
  }
  if (typeof ts === 'string' && ts.length > 0) {
    return ts;
  }
  return new Date().toISOString();
}

export function deriveInitialLifecycleStatus(
  date: string,
  startMin: number,
  endMin: number,
  now: Date
): BookingLifecycleStatus {
  const todayISO = formatDateISO(now);
  const nowMin = getMinutesFromMidnight(now);
  if (date < todayISO) return 'completed';
  if (date > todayISO) return 'scheduled';
  if (nowMin >= endMin) return 'completed';
  if (nowMin >= startMin && nowMin < endMin) return 'in_progress';
  return 'scheduled';
}

export async function ensureUserAccount(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    const displayName = clampString(
      user.displayName || user.email?.split('@')[0] || '사용자',
      80,
      '사용자'
    );
    const email = clampString(user.email || 'user@example.com', 120, 'user@example.com');
    const role = isUserAdmin(user) ? '워크스페이스 관리자' : '워크스페이스 멤버';

    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        displayName,
        department: '프로덕트 본부',
        role,
        email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, {
        displayName,
        department: snap.data().department || '프로덕트 본부',
        role,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function seedInitialResourcesIfMissing(
  user: User,
  existingIds: Set<string>
): Promise<void> {
  for (const res of INITIAL_RESOURCES) {
    if (existingIds.has(res.id)) continue;
    const path = `resources/${res.id}`;
    const ref = doc(db, 'resources', res.id);

    let exists = false;
    try {
      const snap = await getDoc(ref);
      exists = snap.exists();
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }

    if (!exists) {
      try {
        await setDoc(ref, {
          name: clampString(res.name, 80),
          category: res.category,
          visualType: res.visualType,
          floor: clampString(res.floor, 32),
          zone: clampString(res.zone, 64),
          capacity: Math.max(1, Math.min(200, res.capacity)),
          amenities: res.amenities.slice(0, 10).map((a) => clampString(a, 40)),
          description: clampString(res.description, 300),
          operationalStatus: res.operationalStatus,
          visibility: 'workspace',
          createdByUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    }
  }
}

export function findOverlappingDuplicateBookingIds(
  bookings: Booking[],
  user: User
): string[] {
  const admin = isUserAdmin(user);
  const canDelete = (b: Booking) => admin || b.ownerUid === user.uid;
  const isActiveSchedule = (b: Booking) =>
    b.status === 'confirmed' &&
    b.lifecycleStatus !== 'completed' &&
    b.lifecycleStatus !== 'cancelled';

  const sorted = [...bookings].sort((a, b) => {
    // Prefer keeping checked-in, then active, then earliest createdAt
    if (a.checkedIn !== b.checkedIn) return a.checkedIn ? -1 : 1;
    const activeDiff = Number(isActiveSchedule(b)) - Number(isActiveSchedule(a));
    if (activeDiff !== 0) return activeDiff;
    const timeDiff = a.createdAt.localeCompare(b.createdAt);
    if (timeDiff !== 0) return timeDiff;
    return a.id.localeCompare(b.id);
  });

  const keptBySlot = new Map<string, Booking[]>();
  const toDelete: string[] = [];

  for (const b of sorted) {
    const key = `${b.resourceId}__${b.date}`;
    const keptList = keptBySlot.get(key) || [];

    const hasConflictOrDuplicate = keptList.some((kept) => {
      const exactDuplicate =
        kept.startMin === b.startMin &&
        kept.endMin === b.endMin &&
        kept.title === b.title &&
        kept.status === b.status;

      const overlappingActive =
        isActiveSchedule(kept) &&
        isActiveSchedule(b) &&
        b.startMin < kept.endMin &&
        b.endMin > kept.startMin;

      return exactDuplicate || overlappingActive;
    });

    if (hasConflictOrDuplicate && canDelete(b)) {
      toDelete.push(b.id);
    } else {
      keptList.push(b);
      keptBySlot.set(key, keptList);
    }
  }

  return toDelete;
}

export async function deleteBookingsInFirestore(
  bookingIds: string[]
): Promise<number> {
  let deleted = 0;
  for (const bookingId of bookingIds) {
    const path = `bookings/${bookingId}`;
    try {
      await deleteDoc(doc(db, 'bookings', bookingId));
      deleted += 1;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
  return deleted;
}

export async function seedSampleBookingsForUser(
  user: User,
  resources: Resource[],
  existingBookings: Booking[] = []
): Promise<number> {
  const now = new Date();
  const sampleList = createInitialBookings(now);
  const resourceMap = new Map(resources.map((r) => [r.id, r]));
  const displayName = clampString(
    user.displayName || user.email?.split('@')[0] || '사용자',
    80,
    '사용자'
  );

  let createdCount = 0;
  const picks = sampleList.slice(0, 4);
  const trackedBookings = [...existingBookings];

  for (const item of picks) {
    const res = resourceMap.get(item.resourceId);
    if (!res) continue;

    const alreadyOverlaps = trackedBookings.some(
      (b) =>
        b.resourceId === res.id &&
        b.date === item.date &&
        b.status === 'confirmed' &&
        b.lifecycleStatus !== 'cancelled' &&
        ((b.startMin === item.startMin &&
          b.endMin === item.endMin &&
          b.title === item.title) ||
          (b.lifecycleStatus !== 'completed' &&
            b.startMin < item.endMin &&
            b.endMin > item.startMin))
    );
    if (alreadyOverlaps) continue;

    await ensureResourceExists(user, res.id);

    const bookingId = `bk_${user.uid.slice(0, 8)}_${Date.now()}_${createdCount}`;
    const path = `bookings/${bookingId}`;
    const lifecycleStatus = deriveInitialLifecycleStatus(
      item.date,
      item.startMin,
      item.endMin,
      now
    );

    try {
      await setDoc(doc(db, 'bookings', bookingId), {
        ownerUid: user.uid,
        resourceId: res.id,
        resourceName: clampString(res.name, 80),
        title: clampString(item.title, 120),
        organizerName: displayName,
        organizerDepartment: '프로덕트 본부',
        date: item.date,
        startMin: item.startMin,
        endMin: item.endMin,
        attendeesCount: Math.max(1, Math.min(res.capacity, item.attendeesCount)),
        notes: clampString(item.notes || '', 500),
        checkedIn: lifecycleStatus === 'in_progress' || lifecycleStatus === 'completed',
        status: 'confirmed',
        lifecycleStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      trackedBookings.push({
        id: bookingId,
        ownerUid: user.uid,
        resourceId: res.id,
        resourceName: res.name,
        title: item.title,
        organizerId: user.uid,
        organizerName: displayName,
        organizerDepartment: '프로덕트 본부',
        date: item.date,
        startMin: item.startMin,
        endMin: item.endMin,
        attendeesCount: item.attendeesCount,
        notes: item.notes,
        checkedIn: lifecycleStatus === 'in_progress' || lifecycleStatus === 'completed',
        status: 'confirmed',
        lifecycleStatus,
        createdAt: now.toISOString(),
      });
      createdCount += 1;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  return createdCount;
}

export function subscribeResources(
  onData: (resources: Resource[]) => void,
  onFatalError: (err: Error) => void
): () => void {
  const path = 'resources';
  const q = query(
    collection(db, 'resources'),
    where('visibility', '==', 'workspace')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Resource[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: String(data.name || ''),
          category: data.category,
          visualType: data.visualType,
          floor: String(data.floor || ''),
          zone: String(data.zone || ''),
          capacity: Number(data.capacity || 1),
          amenities: Array.isArray(data.amenities) ? data.amenities : [],
          description: String(data.description || ''),
          operationalStatus: data.operationalStatus || 'active',
          createdByUid: data.createdByUid ? String(data.createdByUid) : undefined,
        };
      });
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onFatalError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeBookings(
  user: User,
  onData: (bookings: Booking[]) => void,
  onFatalError: (err: Error) => void
): () => void {
  const path = 'bookings';
  const admin = isUserAdmin(user);
  const q = admin
    ? query(collection(db, 'bookings'))
    : query(collection(db, 'bookings'), where('ownerUid', '==', user.uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Booking[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ownerUid: String(data.ownerUid || ''),
          resourceId: String(data.resourceId || ''),
          resourceName: String(data.resourceName || ''),
          title: String(data.title || ''),
          organizerId: String(data.ownerUid || ''),
          organizerName: String(data.organizerName || ''),
          organizerDepartment: String(data.organizerDepartment || ''),
          date: String(data.date || ''),
          startMin: Number(data.startMin || 0),
          endMin: Number(data.endMin || 0),
          attendeesCount: Number(data.attendeesCount || 1),
          notes: data.notes ? String(data.notes) : '',
          checkedIn: Boolean(data.checkedIn),
          status: data.status === 'cancelled' ? 'cancelled' : 'confirmed',
          lifecycleStatus: data.lifecycleStatus || (data.status === 'cancelled' ? 'cancelled' : 'scheduled'),
          createdAt: timestampToISO(data.createdAt),
          updatedAt: data.updatedAt ? timestampToISO(data.updatedAt) : undefined,
        };
      });
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onFatalError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

async function ensureResourceExists(user: User, resourceId: string): Promise<void> {
  const res = INITIAL_RESOURCES.find((r) => r.id === resourceId);
  if (!res) return;
  const path = `resources/${res.id}`;
  const ref = doc(db, 'resources', res.id);

  let exists = false;
  try {
    const snap = await getDoc(ref);
    exists = snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  if (!exists) {
    try {
      await setDoc(ref, {
        name: clampString(res.name, 80),
        category: res.category,
        visualType: res.visualType,
        floor: clampString(res.floor, 32),
        zone: clampString(res.zone, 64),
        capacity: Math.max(1, Math.min(200, res.capacity)),
        amenities: res.amenities.slice(0, 10).map((a) => clampString(a, 40)),
        description: clampString(res.description, 300),
        operationalStatus: res.operationalStatus,
        visibility: 'workspace',
        createdByUid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }
}

export async function createBookingInFirestore(
  user: User,
  payload: {
    resourceId: string;
    resourceName: string;
    title: string;
    date: string;
    startMin: number;
    endMin: number;
    attendeesCount: number;
    notes: string;
  },
  now: Date
): Promise<string> {
  await ensureResourceExists(user, payload.resourceId);

  const bookingId = `bk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const path = `bookings/${bookingId}`;

  const startMin = Math.max(0, Math.min(1439, Math.round(payload.startMin)));
  const endMin = Math.max(startMin + 1, Math.min(1440, Math.round(payload.endMin)));
  const lifecycleStatus = deriveInitialLifecycleStatus(
    payload.date,
    startMin,
    endMin,
    now
  );
  const checkedIn = lifecycleStatus === 'in_progress';
  const organizerName = clampString(
    user.displayName || user.email?.split('@')[0] || '사용자',
    80,
    '사용자'
  );

  try {
    await setDoc(doc(db, 'bookings', bookingId), {
      ownerUid: user.uid,
      resourceId: clampString(payload.resourceId, 128),
      resourceName: clampString(payload.resourceName, 80, '리소스'),
      title: clampString(payload.title, 120, '빠른 미팅'),
      organizerName,
      organizerDepartment: '프로덕트 본부',
      date: payload.date,
      startMin,
      endMin,
      attendeesCount: Math.max(1, Math.min(200, Math.round(payload.attendeesCount))),
      notes: clampString(payload.notes, 500, ''),
      checkedIn,
      status: 'confirmed',
      lifecycleStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return bookingId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function checkInBookingInFirestore(
  booking: Booking
): Promise<void> {
  const path = `bookings/${booking.id}`;
  try {
    await updateDoc(doc(db, 'bookings', booking.id), {
      checkedIn: true,
      lifecycleStatus: 'in_progress',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function completeBookingInFirestore(
  bookingId: string
): Promise<void> {
  const path = `bookings/${bookingId}`;
  try {
    await updateDoc(doc(db, 'bookings', bookingId), {
      lifecycleStatus: 'completed',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function cancelBookingInFirestore(
  bookingId: string
): Promise<void> {
  const path = `bookings/${bookingId}`;
  try {
    await updateDoc(doc(db, 'bookings', bookingId), {
      status: 'cancelled',
      lifecycleStatus: 'cancelled',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateBookingDetailsInFirestore(
  booking: Booking,
  updates: {
    title: string;
    date?: string;
    startMin: number;
    endMin: number;
    attendeesCount: number;
    notes: string;
  },
  now: Date
): Promise<void> {
  const path = `bookings/${booking.id}`;
  const targetDate = updates.date || booking.date;
  const startMin = Math.max(0, Math.min(1439, Math.round(updates.startMin)));
  const endMin = Math.max(startMin + 1, Math.min(1440, Math.round(updates.endMin)));
  const lifecycleStatus = deriveInitialLifecycleStatus(
    targetDate,
    startMin,
    endMin,
    now
  );

  try {
    await updateDoc(doc(db, 'bookings', booking.id), {
      title: clampString(updates.title, 120, booking.title),
      date: targetDate,
      startMin,
      endMin,
      attendeesCount: Math.max(1, Math.min(200, Math.round(updates.attendeesCount))),
      notes: clampString(updates.notes, 500, ''),
      lifecycleStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveResourceInFirestore(
  user: User,
  data: Omit<Resource, 'id' | 'operationalStatus'>,
  id?: string
): Promise<void> {
  const targetId = id || `res_${Date.now()}`;
  const path = `resources/${targetId}`;
  try {
    if (id) {
      await updateDoc(doc(db, 'resources', id), {
        name: clampString(data.name, 80, '회의실'),
        category: data.category,
        visualType: data.visualType,
        floor: clampString(data.floor, 32, '4층'),
        zone: clampString(data.zone, 64, '본관'),
        capacity: Math.max(1, Math.min(200, data.capacity)),
        amenities: data.amenities.slice(0, 10).map((a) => clampString(a, 40)),
        description: clampString(data.description, 300, '공용 리소스'),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'resources', targetId), {
        name: clampString(data.name, 80, '회의실'),
        category: data.category,
        visualType: data.visualType,
        floor: clampString(data.floor, 32, '4층'),
        zone: clampString(data.zone, 64, '본관'),
        capacity: Math.max(1, Math.min(200, data.capacity)),
        amenities: data.amenities.slice(0, 10).map((a) => clampString(a, 40)),
        description: clampString(data.description, 300, '공용 리소스'),
        operationalStatus: 'active',
        visibility: 'workspace',
        createdByUid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      id ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function toggleResourceStatusInFirestore(
  resource: Resource
): Promise<void> {
  const path = `resources/${resource.id}`;
  const nextStatus =
    resource.operationalStatus === 'active' ? 'maintenance' : 'active';
  try {
    await updateDoc(doc(db, 'resources', resource.id), {
      operationalStatus: nextStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
