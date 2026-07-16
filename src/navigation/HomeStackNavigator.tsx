import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from './types';
import HomeScreen from '../screens/home/HomeScreen';
import AttendanceScreen from '../screens/attendance/AttendanceScreen';
import DuesScreen from '../screens/dues/DuesScreen';
import MembersScreen from '../screens/members/MembersScreen';
import RulesScreen from '../screens/my/RulesScreen';
import StoreScreen from '../screens/home/StoreScreen';
import NewNoticeScreen from '../screens/home/NewNoticeScreen';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Attendance" component={AttendanceScreen} />
      <Stack.Screen name="Dues" component={DuesScreen} />
      <Stack.Screen name="Members" component={MembersScreen} />
      {/* Rules also lives in MyStack; kept here so Home-grid navigation works without cross-tab jump */}
      <Stack.Screen name="Rules" component={RulesScreen} />
      <Stack.Screen name="Store" component={StoreScreen} />
      <Stack.Screen name="NewNotice" component={NewNoticeScreen} />
    </Stack.Navigator>
  );
}
