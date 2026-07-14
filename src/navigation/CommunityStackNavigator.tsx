import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CommunityStackParamList } from './types';
import CommunityScreen from '../screens/community/CommunityScreen';
import PostDetailScreen from '../screens/community/PostDetailScreen';
import NewPostScreen from '../screens/community/NewPostScreen';

const Stack = createNativeStackNavigator<CommunityStackParamList>();

export default function CommunityStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CommunityFeed" component={CommunityScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="NewPost" component={NewPostScreen} />
    </Stack.Navigator>
  );
}
