import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppLockProvider } from './src/context/AppLockContext';
import RootNavigator from './src/navigation/RootNavigator';
import { useAppFonts } from './src/theme/typography';

export default function App() {
  const [fontsLoaded] = useAppFonts();

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <AppLockProvider>
        <RootNavigator />
      </AppLockProvider>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
