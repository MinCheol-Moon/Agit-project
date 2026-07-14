import { NavigatorScreenParams } from '@react-navigation/native';

export type StealthStackParamList = {
  Ledger: undefined;
  Pin: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  Attendance: undefined;
  Dues: undefined;
  Vote: undefined;
  Members: undefined;
  Rules: undefined;
  Store: undefined;
  Signup: undefined;
  PendingApproval: undefined;
};

export type ScheduleStackParamList = {
  ScheduleList: undefined;
  ScheduleDetail: { scheduleId: string };
  CreateSchedule: undefined;
};

export type ChatStackParamList = {
  ChatRoomList: undefined;
  ChatRoom: { roomId: string; roomName: string };
};

export type CommunityStackParamList = {
  CommunityFeed: undefined;
  PostDetail: { postId: string };
  NewPost: undefined;
};

export type MyStackParamList = {
  MyPage: undefined;
  Rules: undefined;
};

export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  ScheduleTab: NavigatorScreenParams<ScheduleStackParamList>;
  ChatTab: NavigatorScreenParams<ChatStackParamList>;
  CommunityTab: NavigatorScreenParams<CommunityStackParamList>;
  MyTab: NavigatorScreenParams<MyStackParamList>;
};
