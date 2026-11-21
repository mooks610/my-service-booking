/**
 * Security Rule Verification Scenarios for Office Hub (오피스 허브)
 * Mirrors the "Dirty Dozen" adversarial payloads defined in security_spec.md.
 */

export interface RuleTestScenario {
  id: string;
  description: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  expected: 'PERMISSION_DENIED' | 'ALLOW';
}

export const DIRTY_DOZEN_SCENARIOS: RuleTestScenario[] = [
  {
    id: 'DD-01',
    description: 'Reject unauthenticated booking create',
    operation: 'create',
    path: '/bookings/bk_unauth',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-02',
    description: 'Reject booking create when email_verified is false',
    operation: 'create',
    path: '/bookings/bk_unverified',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-03',
    description: 'Reject ownerUid spoofing on booking create',
    operation: 'create',
    path: '/bookings/bk_spoof',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-04',
    description: 'Reject shadow/ghost fields via hasOnly key check',
    operation: 'create',
    path: '/bookings/bk_shadow',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-05',
    description: 'Reject orphan resourceId that does not exist in /resources',
    operation: 'create',
    path: '/bookings/bk_orphan',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-06',
    description: 'Reject client-forged createdAt timestamp != request.time',
    operation: 'create',
    path: '/bookings/bk_badtime',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-07',
    description: 'Reject invalid schedule where endMin <= startMin',
    operation: 'create',
    path: '/bookings/bk_badspan',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-08',
    description: 'Reject invalid/oversized booking document ID',
    operation: 'create',
    path: '/bookings/bad$id',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-09',
    description: 'Reject mismatched status vs lifecycleStatus',
    operation: 'create',
    path: '/bookings/bk_desync',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-10',
    description: 'Reject mutation of a cancelled/completed terminal booking',
    operation: 'update',
    path: '/bookings/bk_terminal',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-11',
    description: 'Reject non-owner read of private /users/{userId} PII',
    operation: 'get',
    path: '/users/other_user',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-12',
    description: 'Reject admin privilege when token email_verified is false',
    operation: 'get',
    path: '/bookings/other_booking',
    expected: 'PERMISSION_DENIED',
  },
];
