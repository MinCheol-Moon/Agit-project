import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, radius, spacing } from '../../theme/colors';
import { MainTabParamList, MyStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { useAppLock } from '../../context/AppLockContext';
import { TierBadge } from '../../components/TierBadge';
import { Avatar } from '../../components/Avatar';
import { CREW_LABEL } from '../../types';
import { logOut, removeAvatar, updateAvatar, updateNotifyChat } from '../../data/users';
import { alert } from '../../lib/alert';
import { confirmDestructive } from '../../lib/confirm';

type Props = NativeStackScreenProps<MyStackParamList, 'MyPage'>;
type Nav = CompositeNavigationProp<Props['navigation'], BottomTabNavigationProp<MainTabParamList>>;

export default function MyPageScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<Nav>();
  const { user, refresh } = useAuth();
  const { lock } = useAppLock();
  const [uploading, setUploading] = useState(false);

  const handleLogOut = async () => {
    await logOut();
    await refresh();
  };

  const handleChangeAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (result.canceled) return;
    setUploading(true);
    try {
      await updateAvatar(result.assets[0].uri);
      await refresh();
    } catch (e) {
      alert('프로필 사진 변경 실패', e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = () => {
    confirmDestructive('프로필 사진 삭제', '프로필 사진을 삭제할까요?', async () => {
      try {
        await removeAvatar();
        await refresh();
      } catch (e) {
        alert('삭제 실패', e instanceof Error ? e.message : String(e));
      }
    });
  };

  const handleToggleNotifyChat = async (value: boolean) => {
    try {
      await updateNotifyChat(value);
      await refresh();
    } catch (e) {
      alert('설정 저장 실패', e instanceof Error ? e.message : String(e));
    }
  };

  if (!user) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          <Text style={styles.notice}>아직 가입 신청 전이에요. 홈 화면의 가입 배너를 눌러 신청해주세요.</Text>
          <TouchableOpacity style={styles.lockButton} onPress={lock}>
            <Text style={styles.lockButtonText}>잠그고 위장 화면으로</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const progress = Math.min(100, (user.monthlyAttendance / 4) * 100);

  return (
    <ScrollView style={[styles.screen, { paddingTop: insets.top }]} contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        <View style={styles.profileTop}>
          <View style={styles.profileIdentity}>
            <TouchableOpacity onPress={handleChangeAvatar} disabled={uploading}>
              <Avatar url={user.avatarUrl} name={user.nickname} size={52} />
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={11} color={colors.white} />
              </View>
            </TouchableOpacity>
            <Text style={styles.nickname}>{user.nickname}</Text>
          </View>
          <TierBadge tier={user.tier} isMaster={user.isMaster} />
        </View>
        {user.avatarUrl ? (
          <TouchableOpacity onPress={handleRemoveAvatar}>
            <Text style={styles.avatarRemoveText}>프로필 사진 삭제</Text>
          </TouchableOpacity>
        ) : null}
        <Text style={styles.crews}>{user.crews.map((c) => CREW_LABEL[c]).join(' · ') || '소속 크루 없음'}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.totalAttendance}</Text>
            <Text style={styles.statLabel}>누적 출석</Text>
          </View>
          <View style={styles.statItem}>
            <View style={styles.trophyRow}>
              <Ionicons name="trophy" size={16} color={colors.goldLight} />
              <Text style={styles.statValue}>{user.totalAttendance > 50 ? 3 : user.totalAttendance > 20 ? 2 : 1}</Text>
            </View>
            <Text style={styles.statLabel}>트로피</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>이번 달 승급 현황</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressLabel}>{user.monthlyAttendance}/4회 (4회 이상 출석 시 자동 승급)</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>승급 · 강등 규정</Text>
        <Text style={styles.ruleText}>· 월 4회 이상 출석 → 한 단계 승급</Text>
        <Text style={styles.ruleText}>· 월 미참석(0회) → 한 단계 강등</Text>
        <Text style={styles.ruleText}>· 3개월 연속 미참석 → 탈퇴 처리</Text>
      </View>

      <View style={[styles.linkRow, styles.toggleRow]}>
        <Text style={styles.linkText}>채팅 알림</Text>
        <Switch value={user.notifyChat ?? true} onValueChange={handleToggleNotifyChat} />
      </View>

      {user.isMaster && (
        <TouchableOpacity style={styles.linkRow} onPress={() => nav.navigate('HomeTab', { screen: 'Members' })}>
          <Text style={styles.linkText}>회원 관리 (등급 조정 · 관리자 임명)</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Rules')}>
        <Text style={styles.linkText}>회칙 보기</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.linkRow} onPress={handleLogOut}>
        <Text style={styles.linkText}>로그아웃</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.lockButton} onPress={lock}>
        <Text style={styles.lockButtonText}>잠그고 위장 화면으로</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  notice: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxl },
  profileCard: { backgroundColor: colors.cardDark, borderRadius: radius.card, padding: spacing.lg },
  profileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  profileIdentity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatarEditBadge: { position: 'absolute', right: -2, bottom: -2, backgroundColor: colors.gold, borderRadius: 999, padding: 3 },
  avatarRemoveText: { color: colors.textMuted, fontSize: 11, marginBottom: spacing.sm, textDecorationLine: 'underline' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nickname: { color: colors.white, fontSize: 20, fontWeight: '800' },
  crews: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.lg },
  statsRow: { flexDirection: 'row', gap: spacing.xl },
  statItem: { alignItems: 'center' },
  trophyRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue: { color: colors.goldLight, fontSize: 18, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  section: { backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: spacing.lg },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  progressTrack: { height: 8, backgroundColor: colors.background, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: colors.gold },
  progressLabel: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm },
  ruleText: { fontSize: 13, color: colors.textMuted, marginBottom: 4 },
  linkRow: { backgroundColor: colors.white, borderRadius: radius.tile, borderWidth: 1, borderColor: colors.line, padding: spacing.md },
  linkText: { fontSize: 14, fontWeight: '600', color: colors.text },
  lockButton: { backgroundColor: colors.cardDark, borderRadius: radius.card, alignItems: 'center', paddingVertical: 16, marginTop: spacing.md },
  lockButtonText: { color: colors.goldLight, fontWeight: '700' },
});
