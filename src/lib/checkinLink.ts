import { Platform } from 'react-native';

// Actual-attendance check-in via QR: the master shows a QR that encodes a
// URL like `<origin>/?checkin=<scheduleId>`. A member scans it with their
// phone's camera, which opens the app; once they're unlocked and logged in we
// record their attendance for that schedule. This keeps "voted 참석" separate
// from "actually showed up", since only scanning the master's live QR counts.

const FALLBACK_ORIGIN = 'https://agit-project.moonmc194.workers.dev';

export function siteOrigin(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin;
  return FALLBACK_ORIGIN;
}

export function checkinUrl(scheduleId: string): string {
  return `${siteOrigin()}/?checkin=${scheduleId}`;
}

// A shareable link that deep-links straight to a schedule's detail page.
export function scheduleShareUrl(scheduleId: string): string {
  return `${siteOrigin()}/?schedule=${scheduleId}`;
}

// Remembered across the PIN/login flow so a link/scan that lands on the stealth
// screen is still honored once the member finishes unlocking.
let pendingCheckin: string | null = null;
let pendingSchedule: string | null = null;

// Reads ?checkin= and ?schedule= from the URL once, at app startup.
export function capturePendingCheckin(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const c = params.get('checkin');
  if (c) pendingCheckin = c;
  const s = params.get('schedule');
  if (s) pendingSchedule = s;
}

function stripParam(name: string): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete(name);
  window.history.replaceState({}, '', url.pathname + url.search + url.hash);
}

export function takePendingCheckin(): string | null {
  const s = pendingCheckin;
  pendingCheckin = null;
  if (s) stripParam('checkin');
  return s;
}

export function takePendingSchedule(): string | null {
  const s = pendingSchedule;
  pendingSchedule = null;
  if (s) stripParam('schedule');
  return s;
}
