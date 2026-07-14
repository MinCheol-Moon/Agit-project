import {
  AppUser,
  Attendance,
  ChatMessage,
  ChatRoom,
  DuesLedgerEntry,
  DuesSettings,
  Post,
  Rsvp,
  Schedule,
  TierLog,
  Vote,
} from '../types';

const now = new Date();
const iso = (daysOffset: number, hour = 19) => {
  const d = new Date(now);
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export const CURRENT_USER_ID = 'u-me';

export const mockUsers: AppUser[] = [
  {
    id: CURRENT_USER_ID,
    realName: '문민철',
    nickname: '고스트',
    phone: '010-1234-5678',
    crews: ['game', 'fishing'],
    tier: 'akatsuki',
    isMaster: true,
    status: 'active',
    monthlyAttendance: 3,
    totalAttendance: 41,
    createdAt: iso(-200),
  },
  {
    id: 'u-2',
    realName: '김태식',
    nickname: '레이지',
    phone: '010-2222-3333',
    crews: ['game'],
    tier: 'akatsuki',
    isMaster: false,
    status: 'active',
    monthlyAttendance: 5,
    totalAttendance: 88,
    createdAt: iso(-300),
  },
  {
    id: 'u-3',
    realName: '박준영',
    nickname: '낚시왕',
    phone: '010-4444-5555',
    crews: ['fishing'],
    tier: 'talbuchak',
    isMaster: false,
    status: 'active',
    monthlyAttendance: 2,
    totalAttendance: 12,
    createdAt: iso(-90),
  },
  {
    id: 'u-4',
    realName: '이수민',
    nickname: '초보산악인',
    phone: '010-6666-7777',
    crews: ['hiking'],
    tier: 'raljab',
    isMaster: false,
    status: 'active',
    monthlyAttendance: 1,
    totalAttendance: 3,
    createdAt: iso(-20),
  },
  {
    id: 'u-5',
    realName: '정하늘',
    nickname: '신입회원',
    phone: '010-8888-9999',
    crews: ['game'],
    tier: 'guest',
    isMaster: false,
    status: 'pending',
    monthlyAttendance: 0,
    totalAttendance: 0,
    createdAt: iso(-1),
  },
];

export const mockSchedules: Schedule[] = [
  {
    id: 's-1',
    crew: 'game',
    title: '롤 내전 5:5',
    startAt: iso(2),
    place: 'PC방 아지트점',
    capacity: 10,
    createdBy: 'u-2',
    attendingCount: 6,
  },
  {
    id: 's-2',
    crew: 'fishing',
    title: '새벽 배스 낚시',
    startAt: iso(5, 5),
    place: '팔당댐 포인트',
    capacity: 6,
    createdBy: CURRENT_USER_ID,
    attendingCount: 3,
  },
  {
    id: 's-3',
    crew: 'hiking',
    title: '북한산 정기 산행',
    startAt: iso(9, 8),
    place: '북한산성 입구',
    capacity: 15,
    createdBy: 'u-2',
    attendingCount: 8,
  },
];

export const mockRsvps: Rsvp[] = [
  { id: 'r-1', userId: CURRENT_USER_ID, scheduleId: 's-1', status: 'yes' },
];

export const mockAttendances: Attendance[] = [
  { id: 'a-1', userId: CURRENT_USER_ID, scheduleId: 's-2', checkedAt: iso(-2) },
];

export const mockDuesSettings: DuesSettings = {
  monthlyFee: 30000,
  depositDay: 5,
  notifyOn: true,
};

export const mockLedger: DuesLedgerEntry[] = [
  {
    id: 'l-1',
    type: 'income',
    amount: 30000,
    memo: '7월 회비 - 레이지',
    memberId: 'u-2',
    autoRecognized: true,
    occurredAt: iso(-10),
  },
  {
    id: 'l-2',
    type: 'expense',
    amount: 85000,
    memo: 'PC방 대관비',
    autoRecognized: false,
    occurredAt: iso(-8),
  },
  {
    id: 'l-3',
    type: 'income',
    amount: 30000,
    memo: '7월 회비 - 낚시왕',
    memberId: 'u-3',
    autoRecognized: true,
    occurredAt: iso(-6),
  },
];

export const mockChatRooms: ChatRoom[] = [
  { id: 'c-all', name: '전체방', minTier: 'talbuchak', lastMessage: '내일 내전 콜?', lastMessageAt: iso(0, 10) },
  { id: 'c-game', name: '게임 크루', crew: 'game', minTier: 'talbuchak', lastMessage: 'ㅇㅋ 8시에 봄', lastMessageAt: iso(0, 9) },
  { id: 'c-fishing', name: '낚시 크루', crew: 'fishing', minTier: 'talbuchak', lastMessage: '포인트 좋더라', lastMessageAt: iso(-1) },
];

export const mockMessages: ChatMessage[] = [
  { id: 'm-1', roomId: 'c-all', userId: 'u-2', body: '이번주 토요일 내전 어때요', createdAt: iso(0, 9) },
  { id: 'm-2', roomId: 'c-all', userId: CURRENT_USER_ID, body: '콜입니다', createdAt: iso(0, 9) },
  { id: 'm-3', roomId: 'c-all', userId: 'u-3', body: '내일 내전 콜?', createdAt: iso(0, 10) },
];

export const mockPosts: Post[] = [
  {
    id: 'p-1',
    userId: 'u-3',
    crew: 'fishing',
    title: '오늘의 조황',
    body: '새벽부터 나갔는데 손맛 좋았습니다',
    createdAt: iso(-1),
    likeCount: 12,
    commentCount: 3,
  },
  {
    id: 'p-2',
    userId: 'u-2',
    crew: 'game',
    title: '지난주 내전 하이라이트',
    body: '역전승 미쳤다 진짜',
    createdAt: iso(-3),
    likeCount: 20,
    commentCount: 7,
  },
];

export const mockVotes: Vote[] = [
  {
    id: 'v-1',
    title: '다음달 정기모임 장소',
    deadline: iso(4),
    scope: '전체',
    options: [
      { id: 'vo-1', voteId: 'v-1', label: '서울', count: 9 },
      { id: 'vo-2', voteId: 'v-1', label: '경기', count: 4 },
    ],
  },
];

export const mockTierLogs: TierLog[] = [
  { id: 't-1', userId: CURRENT_USER_ID, fromTier: 'talbuchak', toTier: 'taljuninja', reason: '월 4회 이상 출석', createdAt: iso(-40) },
];
