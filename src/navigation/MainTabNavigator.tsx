import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { MainTabParamList } from './types';
import { colors } from '../theme/colors';
import HomeStackNavigator from './HomeStackNavigator';
import ScheduleStackNavigator from './ScheduleStackNavigator';
import ChatStackNavigator from './ChatStackNavigator';
import CommunityStackNavigator from './CommunityStackNavigator';
import MyStackNavigator from './MyStackNavigator';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Hide the bottom tab bar while inside an actual conversation, so it doesn't
// sit between the chat input and the keyboard.
const HIDE_TAB_BAR_ROUTES = ['ChatRoom', 'DmRoom'];

const ICONS: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  HomeTab: 'home',
  ScheduleTab: 'calendar',
  ChatTab: 'chatbubbles',
  CommunityTab: 'megaphone',
  MyTab: 'person',
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
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons name={focused ? ICONS[route.name as keyof MainTabParamList] : `${ICONS[route.name as keyof MainTabParamList]}-outline` as keyof typeof Ionicons.glyphMap} size={size} color={color} />
        ),
        tabBarLabel: LABELS[route.name as keyof MainTabParamList],
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeStackNavigator} />
      <Tab.Screen name="ScheduleTab" component={ScheduleStackNavigator} />
      <Tab.Screen
        name="ChatTab"
        component={ChatStackNavigator}
        options={({ route }) => {
          const focused = getFocusedRouteNameFromRoute(route);
          return focused && HIDE_TAB_BAR_ROUTES.includes(focused)
            ? { tabBarStyle: { display: 'none' } }
            : {};
        }}
      />
      <Tab.Screen name="CommunityTab" component={CommunityStackNavigator} />
      <Tab.Screen name="MyTab" component={MyStackNavigator} />
    </Tab.Navigator>
  );
}
