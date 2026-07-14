import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './types';
import { colors } from '../theme/colors';
import HomeStackNavigator from './HomeStackNavigator';
import ScheduleStackNavigator from './ScheduleStackNavigator';
import ChatStackNavigator from './ChatStackNavigator';
import CommunityStackNavigator from './CommunityStackNavigator';
import MyStackNavigator from './MyStackNavigator';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, string> = {
  HomeTab: '🏠',
  ScheduleTab: '📅',
  ChatTab: '💬',
  CommunityTab: '📣',
  MyTab: '👤',
};

const LABELS: Record<keyof MainTabParamList, string> = {
  HomeTab: '홈',
  ScheduleTab: '일정',
  ChatTab: '채팅',
  CommunityTab: '소통',
  MyTab: '마이',
};

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: () => <Text>{ICONS[route.name as keyof MainTabParamList]}</Text>,
        tabBarLabel: LABELS[route.name as keyof MainTabParamList],
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeStackNavigator} />
      <Tab.Screen name="ScheduleTab" component={ScheduleStackNavigator} />
      <Tab.Screen name="ChatTab" component={ChatStackNavigator} />
      <Tab.Screen name="CommunityTab" component={CommunityStackNavigator} />
      <Tab.Screen name="MyTab" component={MyStackNavigator} />
    </Tab.Navigator>
  );
}
