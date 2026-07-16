import { Tier, TIER_RANK } from '../types';

export function rankOf(tier: Tier): number {
  return TIER_RANK[tier];
}

export function hasRank(tier: Tier, minRank: number): boolean {
  return rankOf(tier) >= minRank;
}

export const PERMISSIONS = {
  viewDuesExpenses: 0,
  viewBasicSchedule: 0,
  attendance: 1,
  scheduleRsvp: 1,
  viewDuesBalance: 2,
  chat: 2,
  scheduleJoinFree: 2,
  selfUploadReceipt: 2,
  viewPaymentStatus: 3,
  community: 3,
  vote: 3,
  memberList: 3,
  createSchedule: 3,
  uploadReceipt: 5,
  setDepositDay: 5,
  viewRealName: 5,
  adjustTier: 5,
  approveSignup: 5,
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export function can(tier: Tier, permission: PermissionKey): boolean {
  return hasRank(tier, PERMISSIONS[permission]);
}
