import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StealthStackParamList } from './types';
import LedgerScreen from '../screens/stealth/LedgerScreen';
import PinScreen from '../screens/stealth/PinScreen';

const Stack = createNativeStackNavigator<StealthStackParamList>();

export default function StealthStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Ledger" component={LedgerScreen} />
      <Stack.Screen name="Pin" component={PinScreen} />
    </Stack.Navigator>
  );
}
