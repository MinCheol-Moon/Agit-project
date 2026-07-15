import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAppLock } from '../context/AppLockContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { registerForPushNotifications } from '../lib/push';
import StealthStackNavigator from './StealthStackNavigator';
import AuthStackNavigator from './AuthStackNavigator';
import MainTabNavigator from './MainTabNavigator';

function AuthGate() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user) {
      registerForPushNotifications().catch(() => {});
    }
  }, [user]);

  if (loading) return null;
  return user ? <MainTabNavigator /> : <AuthStackNavigator />;
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
