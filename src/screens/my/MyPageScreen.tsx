import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radius, spacing } from '../../theme/colors';
import { MyStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { useAppLock } from '../../context/AppLockContext';
import { TierBadge } from '../../components/TierBadge';
import { CREW_LABEL } from '../../types';
import { activateMultiDeviceLogin, logOut } from '../../data/users';

type Props = NativeStackScreenProps<MyStackParamList, 'MyPage'>;

export default function MyPageScreen({ navigation }: Props) {
  const { user, refresh } = useAuth();
  const { lock } = useAppLock();

  const handleActivateLogin = async () => {
    if (!user) return;
    try {
      await activateMultiDeviceLogin(user.phone);
      Alert.alert('활성화 완료', `이제 다른 기기에서 "${user.nickname}" 또는 실명 + 전화번호 뒷 4자리로 로그인할 수 있어요.`);
    } catch (e) {
      Alert.alert('활성화 실패', e instanceof Error ? e.message : String(e));
    }
  };

  const handleLogOut = async () => {
    await logOut();
    await refresh();
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
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        <View style={styles.profileTop}>
          <Text style={styles.nickname}>{user.nickname}</Text>
          <TierBadge tier={user.tier} />
        </View>
        <Text style={styles.crews}>{user.crews.map((c) => CREW_LABEL[c]).join(' · ') || '소속 크루 없음'}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.totalAttendance}</Text>
            <Text style={styles.statLabel}>누적 출석</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>🏆 {user.totalAttendance > 50 ? 3 : user.totalAttendance > 20 ? 2 : 1}</Text>
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

      <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Rules')}>
        <Text style={styles.linkText}>회칙 보기</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.linkRow}>
        <Text style={styles.linkText}>친구 초대 (추천인 등록)</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.linkRow} onPress={handleActivateLogin}>
        <Text style={styles.linkText}>다른 기기 로그인 활성화</Text>
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
  nickname: { color: colors.white, fontSize: 20, fontWeight: '800' },
  crews: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.lg },
  statsRow: { flexDirection: 'row', gap: spacing.xl },
  statItem: { alignItems: 'center' },
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
