# Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Identity & Ownership**:
   - `/users/{userId}` documents store PII (`email`) and are strictly readable and writable only by `request.auth.uid == userId` or verified admin (`isAdmin()`).
   - `/bookings/{bookingId}` documents require `ownerUid == request.auth.uid` on creation, and `ownerUid` is immutable after creation.
   - All authenticated writes require `request.auth.token.email_verified == true`.

2. **Referential Integrity**:
   - Every `/bookings/{bookingId}` creation verifies that the referenced `/resources/{resourceId}` document exists in Firestore (`exists(...)`).

3. **Temporal Integrity**:
   - `createdAt` must equal `request.time` on document creation and remain immutable on updates.
   - `updatedAt` must equal `request.time` on both creation and update.
   - `endMin` must be strictly greater than `startMin`, within `[0, 1440]`.

4. **State & Terminal Locking**:
   - `status` (`confirmed | cancelled`) and `lifecycleStatus` (`scheduled | in_progress | completed | cancelled`) must stay synchronized.
   - Once a booking reaches a terminal state (`status == 'cancelled'` or `lifecycleStatus in ['cancelled', 'completed']`), non-admin updates are strictly blocked.

---

## 2. The "Dirty Dozen" Adversarial Payloads

All 12 payloads below MUST evaluate to `PERMISSION_DENIED`:

1. **Unauthenticated Create**: `POST /bookings/bk_1` with `auth: null`.
2. **Unverified Email Create**: `POST /bookings/bk_2` with `auth.token.email_verified: false`.
3. **Identity Spoofing on Create**: `POST /bookings/bk_3` with `ownerUid: "victim_uid"` while `auth.uid: "attacker_uid"`.
4. **Shadow Field Injection (Ghost Field)**: `POST /bookings/bk_4` containing valid booking fields plus `isApprovedByCeo: true`.
5. **Orphan Resource Reference**: `POST /bookings/bk_5` with `resourceId: "non_existent_room_999"`.
6. **Client-Forged Timestamp**: `POST /bookings/bk_6` with `createdAt: Timestamp(2020-01-01)` instead of server `request.time`.
7. **Invalid Time Range**: `POST /bookings/bk_7` with `startMin: 900, endMin: 800`.
8. **ID Poisoning (Oversized Document ID)**: `POST /bookings/` + 500-char ID or invalid characters (`bk$bad/id`).
9. **State Desync**: `POST /bookings/bk_8` with `status: "cancelled", lifecycleStatus: "in_progress"`.
10. **Terminal State Mutation**: `PATCH /bookings/bk_cancelled` changing `title` or `status` back to `"confirmed"` as non-admin.
11. **PII Blanket Read**: `GET /users/victim_uid` signed in as `attacker_uid` (`email_verified: true`).
12. **Admin Email Spoofing**: `GET /bookings/victim_bk` with `token.email: "mooks610@gmail.com"` and `token.email_verified: false`.
