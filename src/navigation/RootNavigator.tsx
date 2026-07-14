import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAppLock } from '../context/AppLockContext';
import { AuthProvider } from '../context/AuthContext';
import { registerForPushNotifications } from '../lib/push';
import StealthStackNavigator from './StealthStackNavigator';
import MainTabNavigator from './MainTabNavigator';

export default function RootNavigator() {
  const { ready, unlocked } = useAppLock();

  useEffect(() => {
    if (unlocked) {
      registerForPushNotifications().catch(() => {});
    }
  }, [unlocked]);

  if (!ready) return null;

  return (
    <NavigationContainer>
      {unlocked ? (
        <AuthProvider>
          <MainTabNavigator />
        </AuthProvider>
      ) : (
        <StealthStackNavigator />
      )}
    </NavigationContainer>
  );
}
