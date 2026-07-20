import { Platform } from 'react-native';

// Actual-attendance check-in via QR: the master shows a QR that encodes a
// URL like `<origin>/?checkin=<scheduleId>`. A member scans it with their
// phone's camera, which opens the app; once they're unlocked and logged in we
// record their attendance for that schedule. This keeps "voted 참석" separate
// from "actually showed up", since only scanning the master's live QR counts.

const FALLBACK_ORIGIN = 'https://teal-raindrop-87a4c0.netlify.app';

export function siteOrigin(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin;
  return FALLBACK_ORIGIN;
}

export function checkinUrl(scheduleId: string): string {
  return `${siteOrigin()}/?checkin=${scheduleId}`;
}

// Remembered across the PIN/login flow so a scan that lands on the stealth
// screen still checks in once the member finishes unlocking.
let pending: string | null = null;

export function capturePendingCheckin(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const s = new URLSearchParams(window.location.search).get('checkin');
  if (s) pending = s;
}

export function takePendingCheckin(): string | null {
  const s = pending;
  pending = null;
  // Strip the param so a later refresh doesn't re-trigger a check-in.
  if (s && Platform.OS === 'web' && typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    url.searchParams.delete('checkin');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  }
  return s;
}
