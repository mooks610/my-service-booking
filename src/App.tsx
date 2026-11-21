/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { AssetDirectoryView } from './components/AssetDirectoryView';
import { AuthScreen } from './components/AuthScreen';
import { BookingDetailModal } from './components/BookingDetailModal';
import { LiveOverviewView } from './components/LiveOverviewView';
import { MyReservationsView } from './components/MyReservationsView';
import { QuickReservationModal } from './components/QuickReservationModal';
import { ReservationsTableView } from './components/ReservationsTableView';
import { ResourceFormModal } from './components/ResourceFormModal';
import { Sidebar } from './components/Sidebar';
import { TimelineScheduleView } from './components/TimelineScheduleView';
import { ToastContainer } from './components/ToastContainer';
import { TopHeader } from './components/TopHeader';
import { INITIAL_RESOURCES } from './data/initialData';
import { auth, googleProvider } from './firebase';
import {
  cancelBookingInFirestore,
  checkInBookingInFirestore,
  completeBookingInFirestore,
  createBookingInFirestore,
  deleteBookingsInFirestore,
  ensureUserAccount,
  findOverlappingDuplicateBookingIds,
  isUserAdmin,
  saveResourceInFirestore,
  seedInitialResourcesIfMissing,
  seedSampleBookingsForUser,
  subscribeBookings,
  subscribeResources,
  toggleResourceStatusInFirestore,
  updateBookingDetailsInFirestore,
} from './services/firestoreService';
import {
  Booking,
  QuickReserveContext,
  Resource,
  ToastItem,
  UserProfile,
  ViewTab,
} from './types/resource';
import {
  computeResourceLiveInfo,
  findBookingConflict,
  formatDateISO,
  formatMinutesToHHMM,
  getMinutesFromMidnight,
} from './utils/schedule';

export default function App() {
  const [now, setNow] = useState<Date>(() => new Date());
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<Error | null>(null);

  const [resources, setResources] = useState<Resource[]>(INITIAL_RESOURCES);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const seededResourcesRef = useRef(false);
  const deletingDuplicateIdsRef = useRef<Set<string>>(new Set());

  const [quickReserveCtx, setQuickReserveCtx] =
    useState<QuickReserveContext | null>(null);
  const [inspectingBookingId, setInspectingBookingId] = useState<string | null>(
    null
  );
  const [highlightedResourceId, setHighlightedResourceId] = useState<
    string | null
  >(null);
  const [resourceFormOpen, setResourceFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  if (fatalError) {
    throw fatalError;
  }

  // Live 1-second clock tick for real-time status & tabular clock readout
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !user.emailVerified) {
        setAuthError('이메일 인증이 완료된 Google 계정만 이용할 수 있습니다.');
        setAuthUser(null);
        setAuthReady(true);
        return;
      }
      setAuthUser(user);
      if (!user) {
        setResources(INITIAL_RESOURCES);
        setBookings([]);
        seededResourcesRef.current = false;
        deletingDuplicateIdsRef.current.clear();
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Firestore real-time subscriptions (gated on authenticated user)
  useEffect(() => {
    if (!authReady || !authUser) return;

    let cancelled = false;
    seededResourcesRef.current = false;

    ensureUserAccount(authUser).catch((err) => {
      if (!cancelled) {
        setFatalError(err instanceof Error ? err : new Error(String(err)));
      }
    });

    const unsubResources = subscribeResources(
      (list) => {
        if (cancelled) return;

        if (!seededResourcesRef.current) {
          seededResourcesRef.current = true;
          const existingIds = new Set(list.map((r) => r.id));
          seedInitialResourcesIfMissing(authUser, existingIds).catch((err) => {
            if (!cancelled) {
              setFatalError(err instanceof Error ? err : new Error(String(err)));
            }
          });
        }

        if (list.length > 0) {
          const initialOrder = new Map(
            INITIAL_RESOURCES.map((r, idx) => [r.id, idx])
          );
          const sorted = [...list].sort((a, b) => {
            const idxA = initialOrder.get(a.id) ?? 999;
            const idxB = initialOrder.get(b.id) ?? 999;
            if (idxA !== idxB) return idxA - idxB;
            return a.name.localeCompare(b.name, 'ko');
          });
          setResources(sorted);
        } else {
          setResources(INITIAL_RESOURCES);
        }
      },
      (err) => {
        if (!cancelled) setFatalError(err);
      }
    );

    const unsubBookings = subscribeBookings(
      authUser,
      (list) => {
        if (cancelled) return;
        const activeList = list.filter(
          (b) => !deletingDuplicateIdsRef.current.has(b.id)
        );
        const duplicateIds = findOverlappingDuplicateBookingIds(
          activeList,
          authUser
        ).filter((id) => !deletingDuplicateIdsRef.current.has(id));

        if (duplicateIds.length > 0) {
          duplicateIds.forEach((id) => deletingDuplicateIdsRef.current.add(id));
          const dupSet = new Set(duplicateIds);
          setBookings(activeList.filter((b) => !dupSet.has(b.id)));
          deleteBookingsInFirestore(duplicateIds)
            .then((deletedCount) => {
              if (!cancelled && deletedCount > 0) {
                pushToast(
                  `일정이 겹치는 중복 예약 ${deletedCount}건이 자동으로 삭제되었습니다.`,
                  'info'
                );
              }
            })
            .catch((err) => {
              if (!cancelled) {
                setFatalError(
                  err instanceof Error ? err : new Error(String(err))
                );
              }
            });
          return;
        }

        setBookings(activeList);
      },
      (err) => {
        if (!cancelled) setFatalError(err);
      }
    );

    return () => {
      cancelled = true;
      unsubResources();
      unsubBookings();
    };
  }, [authReady, authUser]);

  const currentUser: UserProfile = useMemo(() => {
    const displayName =
      authUser?.displayName || authUser?.email?.split('@')[0] || '사용자';
    return {
      id: authUser?.uid || 'guest',
      name: displayName,
      department: '프로덕트 본부',
      role: isUserAdmin(authUser) ? '워크스페이스 관리자' : '워크스페이스 멤버',
      initials: displayName.slice(0, 2).toUpperCase(),
      email: authUser?.email || '',
    };
  }, [authUser]);

  const adminMode = useMemo(() => isUserAdmin(authUser), [authUser]);

  const pushToast = useCallback(
    (message: string, type: ToastItem['type'] = 'success') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, type, message }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3600);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleSignInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';
      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request'
      ) {
        setAuthError('로그인이 취소되었습니다. 다시 시도해 주세요.');
      } else if (code === 'auth/popup-blocked') {
        setAuthError(
          '브라우저 팝업이 차단되었습니다. 팝업 허용 후 다시 시도해 주세요.'
        );
      } else {
        setAuthError(
          'Google 로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
        );
      }
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      setQuickReserveCtx(null);
      setInspectingBookingId(null);
      setResourceFormOpen(false);
      await signOut(auth);
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  // Computed sidebar counters
  const availableCount = useMemo(() => {
    return resources.filter((r) => {
      const state = computeResourceLiveInfo(r, bookings, now).state;
      return state === 'available' || state === 'imminent_start';
    }).length;
  }, [resources, bookings, now]);

  const myActiveBookingsCount = useMemo(() => {
    const todayISO = formatDateISO(now);
    const nowMin = getMinutesFromMidnight(now);
    return bookings.filter(
      (b) =>
        b.ownerUid === currentUser.id &&
        b.status === 'confirmed' &&
        b.lifecycleStatus !== 'completed' &&
        (b.date > todayISO || (b.date === todayISO && b.endMin > nowMin))
    ).length;
  }, [bookings, currentUser.id, now]);

  const inspectingBooking = useMemo(
    () => bookings.find((b) => b.id === inspectingBookingId) || null,
    [bookings, inspectingBookingId]
  );

  const inspectingResource = useMemo(() => {
    if (!inspectingBooking) return null;
    return (
      resources.find((r) => r.id === inspectingBooking.resourceId) || null
    );
  }, [inspectingBooking, resources]);

  // Booking Actions (Firestore)
  const handleConfirmBooking = useCallback(
    async (payload: {
      resourceId: string;
      title: string;
      date: string;
      startMin: number;
      endMin: number;
      attendeesCount: number;
      notes: string;
    }) => {
      if (!authUser) return;
      const conflict = findBookingConflict(
        bookings,
        payload.resourceId,
        payload.date,
        payload.startMin,
        payload.endMin
      );
      if (conflict) {
        pushToast('해당 시간대에 이미 예약된 일정이 있습니다.', 'warning');
        return;
      }

      const resName =
        resources.find((r) => r.id === payload.resourceId)?.name || '리소스';
      try {
        await createBookingInFirestore(
          authUser,
          { ...payload, resourceName: resName },
          now
        );
        pushToast(
          `${resName} 예약 확정 (${formatMinutesToHHMM(
            payload.startMin
          )}–${formatMinutesToHHMM(payload.endMin)})`
        );
      } catch (err) {
        setFatalError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [authUser, bookings, now, pushToast, resources]
  );

  const handleCheckInBooking = useCallback(
    async (bookingId: string) => {
      const target = bookings.find((b) => b.id === bookingId);
      if (!target) return;
      try {
        await checkInBookingInFirestore(target);
        pushToast('입실 체크인이 완료되었습니다.');
      } catch (err) {
        setFatalError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [bookings, pushToast]
  );

  const handleExtendBooking = useCallback(
    async (bookingId: string, extraMinutes: number) => {
      const target = bookings.find((b) => b.id === bookingId);
      if (!target) return;
      const nextEnd = target.endMin + extraMinutes;
      if (nextEnd > 23 * 60) {
        pushToast('운영 종료 시각(23:00)을 초과하여 연장할 수 없습니다.', 'warning');
        return;
      }
      const conflict = findBookingConflict(
        bookings,
        target.resourceId,
        target.date,
        target.startMin,
        nextEnd,
        target.id
      );
      if (conflict) {
        pushToast(
          `다음 예약('${conflict.title}', ${formatMinutesToHHMM(
            conflict.startMin
          )})과 겹쳐 연장할 수 없습니다.`,
          'warning'
        );
        return;
      }

      try {
        await updateBookingDetailsInFirestore(
          target,
          {
            title: target.title,
            startMin: target.startMin,
            endMin: nextEnd,
            attendeesCount: target.attendeesCount,
            notes: target.notes || '',
          },
          now
        );
        pushToast(`예약 시간이 ${extraMinutes}분 연장되었습니다.`);
      } catch (err) {
        setFatalError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [bookings, now, pushToast]
  );

  const handleCompleteBooking = useCallback(
    async (bookingId: string) => {
      try {
        await completeBookingInFirestore(bookingId);
        pushToast('예약이 사용 완료 처리되었습니다.');
      } catch (err) {
        setFatalError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [pushToast]
  );

  const handleUpdateBooking = useCallback(
    async (
      bookingId: string,
      updates: {
        title: string;
        date?: string;
        startMin: number;
        endMin: number;
        attendeesCount: number;
        notes: string;
      }
    ) => {
      const target = bookings.find((b) => b.id === bookingId);
      if (!target) return;
      try {
        await updateBookingDetailsInFirestore(target, updates, now);
        pushToast('예약 정보가 수정되었습니다.');
      } catch (err) {
        setFatalError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [bookings, now, pushToast]
  );

  const handleCancelBooking = useCallback(
    async (bookingId: string) => {
      try {
        await cancelBookingInFirestore(bookingId);
        pushToast('예약이 취소되었습니다.', 'info');
      } catch (err) {
        setFatalError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [pushToast]
  );

  // Resource Admin Actions (Firestore)
  const handleSaveResource = useCallback(
    async (data: Omit<Resource, 'id' | 'operationalStatus'>, id?: string) => {
      if (!authUser) return;
      try {
        await saveResourceInFirestore(authUser, data, id);
        if (id) {
          pushToast(`'${data.name}' 정보가 수정되었습니다.`);
        } else {
          pushToast(`신규 리소스 '${data.name}'이(가) 등록되었습니다.`);
        }
      } catch (err) {
        setFatalError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [authUser, pushToast]
  );

  const handleToggleOperationalStatus = useCallback(
    async (resourceId: string) => {
      const target = resources.find((r) => r.id === resourceId);
      if (!target) return;
      const nextStatus =
        target.operationalStatus === 'active' ? 'maintenance' : 'active';
      try {
        await toggleResourceStatusInFirestore(target);
        pushToast(
          nextStatus === 'maintenance'
            ? `'${target.name}'이(가) 점검 상태로 전환되었습니다.`
            : `'${target.name}' 운영이 재개되었습니다.`,
          nextStatus === 'maintenance' ? 'info' : 'success'
        );
      } catch (err) {
        setFatalError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [resources, pushToast]
  );

  const handleSeedSampleBookings = useCallback(async () => {
    if (!authUser) return;
    try {
      const count = await seedSampleBookingsForUser(
        authUser,
        resources,
        bookings
      );
      if (count > 0) {
        pushToast(`샘플 예약 ${count}건이 Firebase에 추가되었습니다.`, 'info');
      } else {
        pushToast(
          '겹치지 않는 새 샘플 일정이 없어 추가하지 않았습니다.',
          'info'
        );
      }
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [authUser, bookings, pushToast, resources]);

  const handleJumpToTimeline = useCallback((resourceId: string) => {
    setHighlightedResourceId(resourceId);
    setActiveTab('timeline');
  }, []);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <p className="text-base font-bold text-[#0F172A]">오피스 허브</p>
          <p className="text-sm text-[#64748B]">오피스 허브 연결 중...</p>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <AuthScreen
        onSignInWithGoogle={handleSignInWithGoogle}
        errorMessage={authError}
      />
    );
  }

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-[#0F172A]">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        currentUser={currentUser}
        availableCount={availableCount}
        myActiveBookingsCount={myActiveBookingsCount}
        onSeedSampleBookings={handleSeedSampleBookings}
        onSignOut={handleSignOut}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader
          activeTab={activeTab}
          now={now}
          onOpenQuickReserve={() => setQuickReserveCtx({})}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1440px] w-full mx-auto">
          {activeTab === 'overview' && (
            <LiveOverviewView
              resources={resources}
              bookings={bookings}
              now={now}
              currentUser={currentUser}
              onQuickReserve={(resourceId, startMin) =>
                setQuickReserveCtx({
                  resourceId,
                  date: formatDateISO(now),
                  startMin,
                })
              }
              onInspectBooking={(b) => setInspectingBookingId(b.id)}
              onCheckInBooking={handleCheckInBooking}
              onExtendBooking={handleExtendBooking}
              onJumpToTimeline={handleJumpToTimeline}
            />
          )}

          {activeTab === 'timeline' && (
            <TimelineScheduleView
              resources={resources}
              bookings={bookings}
              now={now}
              currentUser={currentUser}
              highlightedResourceId={highlightedResourceId}
              onSelectSlotToBook={(resourceId, date, startMin) =>
                setQuickReserveCtx({ resourceId, date, startMin })
              }
              onInspectBooking={(b) => setInspectingBookingId(b.id)}
            />
          )}

          {activeTab === 'my_reservations' && (
            <MyReservationsView
              bookings={bookings}
              resources={resources}
              now={now}
              currentUser={currentUser}
              onOpenQuickReserve={(resourceId) =>
                setQuickReserveCtx(resourceId ? { resourceId } : {})
              }
              onCheckInBooking={handleCheckInBooking}
              onCompleteBooking={handleCompleteBooking}
              onCancelBooking={handleCancelBooking}
              onUpdateBooking={handleUpdateBooking}
            />
          )}

          {activeTab === 'reservations' && (
            <ReservationsTableView
              bookings={bookings}
              resources={resources}
              now={now}
              currentUser={currentUser}
              onInspectBooking={(b) => setInspectingBookingId(b.id)}
              onCheckInBooking={handleCheckInBooking}
              onExtendBooking={handleExtendBooking}
              onCompleteBooking={handleCompleteBooking}
              onCancelBooking={handleCancelBooking}
              onOpenQuickReserve={() => setQuickReserveCtx({})}
            />
          )}

          {activeTab === 'directory' && (
            <AssetDirectoryView
              resources={resources}
              bookings={bookings}
              now={now}
              currentUserId={currentUser.id}
              isAdmin={adminMode}
              onAddResource={() => {
                setEditingResource(null);
                setResourceFormOpen(true);
              }}
              onEditResource={(res) => {
                setEditingResource(res);
                setResourceFormOpen(true);
              }}
              onToggleOperationalStatus={handleToggleOperationalStatus}
            />
          )}
        </main>
      </div>

      {/* Quick Reservation Modal */}
      <QuickReservationModal
        isOpen={quickReserveCtx !== null}
        onClose={() => setQuickReserveCtx(null)}
        resources={resources}
        bookings={bookings}
        now={now}
        currentUser={currentUser}
        initialResourceId={quickReserveCtx?.resourceId}
        initialDate={quickReserveCtx?.date}
        initialStartMin={quickReserveCtx?.startMin}
        onConfirmBooking={handleConfirmBooking}
      />

      {/* Booking Inspector / Modify / Extend / Complete Modal */}
      <BookingDetailModal
        booking={inspectingBooking}
        resource={inspectingResource}
        bookings={bookings}
        now={now}
        currentUser={currentUser}
        onClose={() => setInspectingBookingId(null)}
        onCheckIn={handleCheckInBooking}
        onExtend={handleExtendBooking}
        onComplete={handleCompleteBooking}
        onUpdate={handleUpdateBooking}
        onCancelBooking={handleCancelBooking}
      />

      {/* Resource Create / Edit Modal */}
      <ResourceFormModal
        isOpen={resourceFormOpen}
        editingResource={editingResource}
        onClose={() => setResourceFormOpen(false)}
        onSave={handleSaveResource}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
