import React, { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAppLock } from '../context/AppLockContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { registerForPushNotifications } from '../lib/push';
import { signOut } from '../lib/session';
import { capturePendingCheckin, takePendingCheckin } from '../lib/checkinLink';
import { checkIn } from '../data/schedules';
import { alert } from '../lib/alert';
import StealthStackNavigator from './StealthStackNavigator';
import AuthStackNavigator from './AuthStackNavigator';
import MainTabNavigator from './MainTabNavigator';
import PendingApprovalScreen from '../screens/auth/PendingApprovalScreen';

// Leaving the app for this long signs the session out and drops back to the
// stealth screen - reopening requires PIN + login (or biometric quick login).
const AUTO_LOGOUT_MS = 15 * 60 * 1000;

function AuthGate() {
  const { user, loading, refresh } = useAuth();

  useEffect(() => {
    if (user) {
      registerForPushNotifications().catch(() => {});
    }
  }, [user]);

  // If the member arrived by scanning the master's attendance QR, record their
  // actual attendance now that they're unlocked and signed in.
  useEffect(() => {
    if (user?.status !== 'active') return;
    const scheduleId = takePendingCheckin();
    if (!scheduleId) return;
    checkIn(scheduleId)
      .then(() => {
        alert('출석 완료', '실제 출석이 정상 처리되었어요!');
        refresh();
      })
      .catch((e) => alert('출석 처리', e instanceof Error ? e.message : String(e)));
  }, [user?.status, refresh]);

  if (loading) return null;
  if (!user) return <AuthStackNavigator />;
  // A signed-up account isn't let into the app until the master approves it
  // (status becomes 'active') - gate here rather than inside the tab
  // navigator so a pending/expelled member can't just navigate around it.
  if (user.status !== 'active') return <PendingApprovalScreen status={user.status} />;
  return <MainTabNavigator />;
}

export default function RootNavigator() {
  const { ready, unlocked, lock } = useAppLock();
  const backgroundedAt = useRef<number | null>(null);

  // Remember a ?checkin=<scheduleId> param before the PIN/login flow consumes
  // the navigation, so it survives until AuthGate can act on it.
  useEffect(() => {
    capturePendingCheckin();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'background') {
          backgroundedAt.current = Date.now();
        } else if (state === 'active' && backgroundedAt.current) {
          const away = Date.now() - backgroundedAt.current;
          backgroundedAt.current = null;
          if (away >= AUTO_LOGOUT_MS) {
            signOut().catch(() => {});
            lock();
          }
        }
      });
      return () => sub.remove();
    }

    // Web: there's no real "background", so log out after a stretch of
    // inactivity. The last-active time is persisted to localStorage so it
    // survives a full PWA close/relaunch (iOS kills suspended web apps); on
    // startup we check it and sign out if the idle window already elapsed,
    // which forces a real re-login rather than just the PIN.
    const KEY = 'agit:lastActive';
    const now = Date.now();

    const stored = Number(window.localStorage.getItem(KEY) || 0);
    if (stored && now - stored >= AUTO_LOGOUT_MS) {
      signOut().catch(() => {});
      lock();
    }
    window.localStorage.setItem(KEY, String(now));

    let lastWrite = now;
    const bump = () => {
      const t = Date.now();
      // Throttle localStorage writes to at most once every few seconds.
      if (t - lastWrite > 4000) {
        window.localStorage.setItem(KEY, String(t));
        lastWrite = t;
      }
    };
    const checkIdle = () => {
      const last = Number(window.localStorage.getItem(KEY) || 0);
      if (last && Date.now() - last >= AUTO_LOGOUT_MS) {
        signOut().catch(() => {});
        lock();
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkIdle();
      else {
        window.localStorage.setItem(KEY, String(Date.now()));
        lastWrite = Date.now();
      }
    };
    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    document.addEventListener('visibilitychange', onVisible);
    // Only check; do NOT refresh the timestamp here, or an open-but-idle app
    // would never time out. Real interaction (bump) is what keeps it alive.
    const interval = setInterval(checkIdle, 30 * 1000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(interval);
    };
  }, [lock]);

  if (!ready) return null;

  return (
    <NavigationContainer
      // On web, React Navigation otherwise rewrites document.title to the
      // active route name (e.g. "Ledger"), which iOS then picks up as the
      // "Add to Home Screen" name. Pin it to the disguise name instead.
      documentTitle={{ formatter: () => '가계부' }}
    >
      {unlocked ? (
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      ) : (
        <StealthStackNavigator />
      )}
    </NavigationContainer>
  );
}
