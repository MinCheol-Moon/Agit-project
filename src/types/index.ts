export type Tier = 'guest' | 'raljab' | 'talbuchak' | 'taljuninja' | 'akatsuki' | 'admin';

export const TIER_RANK: Record<Tier, number> = {
  guest: 0,
  raljab: 1,
  talbuchak: 2,
  taljuninja: 3,
  akatsuki: 4,
  admin: 5,
};

export const TIER_LABEL: Record<Tier, string> = {
  guest: '거수자',
  raljab: '랄잡',
  talbuchak: '탈부착',
  taljuninja: '탈주닌자',
  akatsuki: '아카츠키',
  admin: '관리자',
};

export type UserStatus = 'pending' | 'active' | 'expelled';

export type Crew = 'game' | 'tea' | 'fishing' | 'hiking';

export const CREW_LABEL: Record<Crew, string> = {
  game: '게임',
  tea: '차',
  fishing: '낚시',
  hiking: '등산',
};

export interface AppUser {
  id: string;
  realName: string;
  nickname: string;
  phone: string;
  referrer?: string;
  intro?: string;
  crews: Crew[];
  tier: Tier;
  isMaster: boolean;
  status: UserStatus;
  avatarUrl?: string | null;
  notifyChat?: boolean;
  monthlyAttendance: number;
  totalAttendance: number;
  createdAt: string;
}

export interface ScheduleComment {
  id: string;
  scheduleId: string;
  userId: string;
  parentId?: string | null;
  body: string;
  createdAt: string;
}

export interface Schedule {
  id: string;
  crew: Crew;
  title: string;
  startAt: string;
  place: string;
  capacity: number;
  createdBy: string;
  attendingCount: number;
}

export type RsvpStatus = 'yes' | 'no';

export interface Rsvp {
  id: string;
  userId: string;
  scheduleId: string;
  status: RsvpStatus;
}

export interface Attendance {
  id: string;
  userId: string;
  scheduleId: string;
  checkedAt: string;
}

export type LedgerType = 'income' | 'expense';

export interface DuesLedgerEntry {
  id: string;
  type: LedgerType;
  amount: number;
  memo: string;
  memberId?: string;
  autoRecognized: boolean;
  receiptUrl?: string;
  occurredAt: string;
}

export interface DuesSettings {
  monthlyFee: number;
  depositDay: number;
  notifyOn: boolean;
}

export interface Post {
  id: string;
  userId: string;
  crew?: Crew;
  title: string;
  body: string;
  imageUrl?: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
}

export interface ChatRoom {
  id: string;
  name: string;
  crew?: Crew;
  minTier: Tier;
  lastMessage?: string;
  lastMessageAt?: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string | null;
  body: string;
  createdAt: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  body: string;
  createdAt: string;
}

export interface VoteOption {
  id: string;
  voteId: string;
  label: string;
  count: number;
}

export interface Vote {
  id: string;
  title: string;
  deadline: string;
  scope: string;
  options: VoteOption[];
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  createdBy: string;
  createdAt: string;
}

export interface TierLog {
  id: string;
  userId: string;
  fromTier: Tier;
  toTier: Tier;
  reason: string;
  createdAt: string;
}
