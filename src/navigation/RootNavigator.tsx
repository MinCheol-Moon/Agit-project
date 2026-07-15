import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAppLock } from '../context/AppLockContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { registerForPushNotifications } from '../lib/push';
import StealthStackNavigator from './StealthStackNavigator';
import AuthStackNavigator from './AuthStackNavigator';
import MainTabNavigator from './MainTabNavigator';
import PendingApprovalScreen from '../screens/auth/PendingApprovalScreen';

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
  const { ready, unlocked } = useAppLock();

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
