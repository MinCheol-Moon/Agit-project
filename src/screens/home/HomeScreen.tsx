import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { colors, radius, spacing } from '../../theme/colors';
import { HomeStackParamList, MainTabParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { TierBadge } from '../../components/TierBadge';
import { can, PermissionKey } from '../../lib/permissions';
import { listSchedules } from '../../data/schedules';
import { Schedule, CREW_LABEL } from '../../types';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

type Nav = CompositeNavigationProp<Props['navigation'], BottomTabNavigationProp<MainTabParamList>>;

const GRID_ITEMS: { key: string; label: string; icon: string; permission: PermissionKey; action: (nav: Nav) => void }[] = [
  { key: 'schedule', label: '일정', icon: '📅', permission: 'viewBasicSchedule', action: (nav) => nav.navigate('ScheduleTab', { screen: 'ScheduleList' }) },
  { key: 'attendance', label: '출석', icon: '✅', permission: 'attendance', action: (nav) => nav.navigate('HomeTab', { screen: 'Attendance' }) },
  { key: 'dues', label: '회비', icon: '💰', permission: 'viewDuesExpenses', action: (nav) => nav.navigate('HomeTab', { screen: 'Dues' }) },
  { key: 'vote', label: '투표', icon: '🗳️', permission: 'vote', action: (nav) => nav.navigate('HomeTab', { screen: 'Vote' }) },
  { key: 'chat', label: '채팅', icon: '💬', permission: 'chat', action: (nav) => nav.navigate('ChatTab', { screen: 'ChatRoomList' }) },
  { key: 'gallery', label: '갤러리', icon: '🖼️', permission: 'community', action: (nav) => nav.navigate('CommunityTab', { screen: 'CommunityFeed' }) },
  { key: 'members', label: '멤버', icon: '👥', permission: 'memberList', action: (nav) => nav.navigate('HomeTab', { screen: 'Members' }) },
  { key: 'rules', label: '회칙', icon: '📖', permission: 'viewBasicSchedule', action: (nav) => nav.navigate('MyTab', { screen: 'Rules' }) },
  { key: 'store', label: '스토어', icon: '🛍️', permission: 'viewBasicSchedule', action: (nav) => nav.navigate('HomeTab', { screen: 'Store' }) },
];

export default function HomeScreen({ navigation }: Props) {
  const nav = useNavigation<Nav>();
  const { user } = useAuth();
  const [upcoming, setUpcoming] = useState<Schedule | null>(null);

  useEffect(() => {
    listSchedules().then((list) => setUpcoming(list[0] ?? null));
  }, []);

  const tier = user?.tier ?? 'guest';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.logo}>아지트</Text>
          <Text style={styles.dateText}>{new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}</Text>
        </View>
      </View>

      <View style={styles.greetingCard}>
        <View style={styles.greetingTop}>
          <Text style={styles.greetingText}>{user?.nickname ?? '게스트'}님, 안녕하세요</Text>
          <TierBadge tier={tier} size="sm" />
        </View>
        {user?.crews?.length ? (
          <Text style={styles.crewTags}>{user.crews.map((c) => CREW_LABEL[c]).join(' · ')}</Text>
        ) : null}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.min(100, ((user?.monthlyAttendance ?? 0) / 4) * 100)}%` }]} />
        </View>
        <Text style={styles.progressLabel}>이번 달 출석 {user?.monthlyAttendance ?? 0}/4회</Text>
      </View>

      {user?.status === 'pending' && (
        <TouchableOpacity style={styles.banner} onPress={() => navigation.navigate('PendingApproval')}>
          <Text style={styles.bannerText}>가입 승인 대기 중입니다. 눌러서 확인하세요.</Text>
        </TouchableOpacity>
      )}
      {!user && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>아지트 가입하고 모든 기능을 이용해보세요</Text>
          <View style={styles.bannerRow}>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.bannerLink}>가입 신청 →</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.bannerLink}>이미 회원이신가요? 로그인 →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {upcoming && (
        <View style={styles.upcomingCard}>
          <Text style={styles.upcomingLabel}>다가오는 모임</Text>
          <Text style={styles.upcomingTitle}>{upcoming.title}</Text>
          <Text style={styles.upcomingMeta}>
            {new Date(upcoming.startAt).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · {upcoming.place}
          </Text>
          <Text style={styles.upcomingMeta}>{upcoming.attendingCount}/{upcoming.capacity}명 참석</Text>
        </View>
      )}

      <View style={styles.grid}>
        {GRID_ITEMS.map((item) => {
          const unlocked = can(tier, item.permission);
          return (
            <TouchableOpacity
              key={item.key}
              style={styles.gridTile}
              onPress={() => item.action(nav)}
              activeOpacity={0.7}
            >
              <Text style={styles.gridIcon}>{unlocked ? item.icon : '🔒'}</Text>
              <Text style={styles.gridLabel}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  headerRow: { marginBottom: spacing.lg },
  logo: { fontSize: 22, fontWeight: '800', color: colors.gold },
  dateText: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  greetingCard: {
    backgroundColor: colors.cardDark,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  greetingTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  greetingText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  crewTags: { color: colors.goldLight, fontSize: 12, marginBottom: spacing.md },
  progressTrack: { height: 6, backgroundColor: colors.cardDarkAlt, borderRadius: 3, overflow: 'hidden', marginTop: spacing.sm },
  progressFill: { height: 6, backgroundColor: colors.gold },
  progressLabel: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
  banner: {
    backgroundColor: colors.cream,
    borderColor: colors.creamBorder,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  bannerText: { color: colors.creamText, fontWeight: '600', fontSize: 13, marginBottom: spacing.sm },
  bannerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  bannerLink: { color: colors.creamText, fontWeight: '700', fontSize: 12, textDecorationLine: 'underline' },
  upcomingCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  upcomingLabel: { color: colors.textMuted, fontSize: 12, marginBottom: 4 },
  upcomingTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  upcomingMeta: { fontSize: 12, color: colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  gridTile: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: colors.white,
    borderRadius: radius.tile,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  gridIcon: { fontSize: 24 },
  gridLabel: { fontSize: 12, color: colors.text, fontWeight: '600' },
});
