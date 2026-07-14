import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MyStackParamList } from './types';
import MyPageScreen from '../screens/my/MyPageScreen';
import RulesScreen from '../screens/my/RulesScreen';

const Stack = createNativeStackNavigator<MyStackParamList>();

export default function MyStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MyPage" component={MyPageScreen} />
      <Stack.Screen name="Rules" component={RulesScreen} />
    </Stack.Navigator>
  );
}
