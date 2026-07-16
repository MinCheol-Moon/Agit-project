import React, { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAppLock } from '../context/AppLockContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { registerForPushNotifications } from '../lib/push';
import { signOut } from '../lib/session';
import StealthStackNavigator from './StealthStackNavigator';
import AuthStackNavigator from './AuthStackNavigator';
import MainTabNavigator from './MainTabNavigator';
import PendingApprovalScreen from '../screens/auth/PendingApprovalScreen';

// Leaving the app for this long signs the session out and drops back to the
// stealth screen - reopening requires PIN + login (or biometric quick login).
const AUTO_LOGOUT_MS = 15 * 60 * 1000;

function AuthGate() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user) {
      registerForPushNotifications().catch(() => {});
    }
  }, [user]);

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

  useEffect(() => {
    if (Platform.OS === 'web') return; // browsers don't background the same way
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
  }, [lock]);

  if (!ready) return null;

  return (
    <NavigationContainer>
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
