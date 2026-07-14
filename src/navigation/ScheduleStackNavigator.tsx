import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ScheduleStackParamList } from './types';
import ScheduleListScreen from '../screens/schedule/ScheduleListScreen';
import ScheduleDetailScreen from '../screens/schedule/ScheduleDetailScreen';
import CreateScheduleScreen from '../screens/schedule/CreateScheduleScreen';

const Stack = createNativeStackNavigator<ScheduleStackParamList>();

export default function ScheduleStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ScheduleList" component={ScheduleListScreen} />
      <Stack.Screen name="ScheduleDetail" component={ScheduleDetailScreen} />
      <Stack.Screen name="CreateSchedule" component={CreateScheduleScreen} />
    </Stack.Navigator>
  );
}
