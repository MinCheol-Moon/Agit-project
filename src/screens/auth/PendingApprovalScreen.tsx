import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useAppLock } from '../../context/AppLockContext';
import { UserStatus } from '../../types';
import { logOut } from '../../data/users';

const COPY: Record<UserStatus, { icon: keyof typeof Ionicons.glyphMap; title: string; desc: string }> = {
  pending: {
    icon: 'hourglass-outline',
    title: '마스터의 승인을 기다리고 있어요',
    desc: '가입 신청이 접수되었습니다. 아카츠키(관리자)가 확인 후 승인하면 랄잡 등급으로 활동을 시작할 수 있어요.',
  },
  expelled: {
    icon: 'close-circle-outline',
    title: '탈퇴 처리된 계정이에요',
    desc: '이 계정은 더 이상 활동할 수 없어요. 문의사항은 마스터에게 직접 연락해주세요.',
  },
  active: { icon: 'checkmark-circle-outline', title: '', desc: '' },
};

// Rendered by RootNavigator's AuthGate in place of the main app for any
// signed-up account whose status isn't 'active' yet — a dedicated gate, not
// a screen inside the tab navigator, so a pending/expelled member can't just
// tap around into the rest of the app.
export default function PendingApprovalScreen({ status }: { status: UserStatus }) {
  const { refresh } = useAuth();
  const { lock } = useAppLock();
  const copy = COPY[status];

  const handleLogOut = async () => {
    await logOut();
    await refresh();
  };

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <Ionicons name={copy.icon} size={40} color={colors.gold} />
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.desc}>{copy.desc}</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={refresh}>
          <Text style={styles.refreshButtonText}>승인 상태 새로고침</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerButton} onPress={handleLogOut}>
          <Text style={styles.footerButtonText}>로그아웃</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerButton} onPress={lock}>
          <Text style={styles.footerButtonText}>잠그고 위장 화면으로</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.md },
  title: { fontSize: 17, fontWeight: '800', color: colors.text, textAlign: 'center' },
  desc: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  refreshButton: { marginTop: spacing.lg, backgroundColor: colors.gold, borderRadius: radius.pill, paddingHorizontal: spacing.xl, paddingVertical: 12 },
  refreshButtonText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  footer: { padding: spacing.lg, gap: spacing.sm },
  footerButton: { alignItems: 'center', paddingVertical: 12 },
  footerButtonText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
});
