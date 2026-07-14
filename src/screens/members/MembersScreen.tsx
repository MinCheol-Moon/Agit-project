import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radius, spacing } from '../../theme/colors';
import { HomeStackParamList } from '../../navigation/types';
import { approveMember, getRealName, listMembers, listPendingMembers, rejectMember, setMemberTier } from '../../data/users';
import { AppUser, CREW_LABEL, TIER_RANK, Tier } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../lib/permissions';
import { TierBadge } from '../../components/TierBadge';
import { ScreenHeader } from '../../components/ScreenHeader';

type Props = NativeStackScreenProps<HomeStackParamList, 'Members'>;

const TIER_ORDER: Tier[] = ['guest', 'raljab', 'talbuchak', 'taljuninja', 'akatsuki'];

export default function MembersScreen({ navigation }: Props) {
  const { user } = useAuth();
  const tier = user?.tier ?? 'guest';
  const isAdmin = can(tier, 'adjustTier');
  const [members, setMembers] = useState<AppUser[]>([]);
  const [pending, setPending] = useState<AppUser[]>([]);
  const [showRealName, setShowRealName] = useState(false);
  const [realNames, setRealNames] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const activeMembers = await listMembers();
    setMembers(activeMembers);
    if (isAdmin) setPending(await listPendingMembers());
  }, [isAdmin]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggleRealName = async () => {
    const next = !showRealName;
    setShowRealName(next);
    if (next && isAdmin && members.some((m) => !m.realName && !realNames[m.id])) {
      try {
        const entries = await Promise.all(members.map(async (m) => [m.id, await getRealName(m.id)] as const));
        setRealNames(Object.fromEntries(entries));
      } catch (e) {
        Alert.alert('실명 조회 실패', e instanceof Error ? e.message : String(e));
      }
    }
  };

  const nameFor = (m: AppUser) => m.realName || realNames[m.id] || '';

  const handleApprove = async (id: string) => {
    try {
      await approveMember(id);
      load();
    } catch (e) {
      Alert.alert('승인 실패', e instanceof Error ? e.message : String(e));
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectMember(id);
      load();
    } catch (e) {
      Alert.alert('거절 실패', e instanceof Error ? e.message : String(e));
    }
  };

  const cycleTier = async (member: AppUser) => {
    const idx = TIER_ORDER.indexOf(member.tier);
    const next = TIER_ORDER[Math.min(idx + 1, TIER_ORDER.length - 1)];
    Alert.alert('등급 변경', `${member.nickname}님을 ${next}로 변경할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '변경',
        onPress: async () => {
          try {
            await setMemberTier(member.id, next);
            load();
          } catch (e) {
            Alert.alert('등급 변경 실패', e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="멤버"
        onBack={() => navigation.goBack()}
        right={
          isAdmin ? (
            <TouchableOpacity onPress={toggleRealName}>
              <Text style={styles.toggleText}>{showRealName ? '실명 숨기기' : '실명 보기'}</Text>
            </TouchableOpacity>
          ) : null
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        {isAdmin && pending.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>가입 승인 대기</Text>
            {pending.map((p) => (
              <View key={p.id} style={styles.pendingRow}>
                <View>
                  <Text style={styles.memberName}>{p.nickname} {showRealName ? `(${p.realName})` : ''}</Text>
                  <Text style={styles.memberMeta}>{p.phone}</Text>
                </View>
                <View style={styles.pendingActions}>
                  <TouchableOpacity style={styles.approveButton} onPress={() => handleApprove(p.id)}>
                    <Text style={styles.approveText}>승인</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectButton} onPress={() => handleReject(p.id)}>
                    <Text style={styles.rejectText}>거절</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>전체 멤버</Text>
          {members.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={styles.memberRow}
              disabled={!isAdmin}
              onPress={() => cycleTier(m)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>
                  {m.nickname} {showRealName ? `· ${nameFor(m)}` : ''} {m.isMaster ? '👑' : ''}
                </Text>
                <Text style={styles.memberMeta}>{m.crews.map((c) => CREW_LABEL[c]).join(', ')} · 이달 {m.monthlyAttendance}회 출석</Text>
              </View>
              <TierBadge tier={m.tier} size="sm" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  toggleText: { color: colors.gold, fontSize: 12, fontWeight: '700' },
  section: { backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: spacing.lg },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  pendingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line },
  pendingActions: { flexDirection: 'row', gap: spacing.sm },
  approveButton: { backgroundColor: colors.success, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  approveText: { color: colors.white, fontWeight: '700', fontSize: 12 },
  rejectButton: { backgroundColor: colors.danger, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  rejectText: { color: colors.white, fontWeight: '700', fontSize: 12 },
  memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line },
  memberName: { fontSize: 14, fontWeight: '700', color: colors.text },
  memberMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
});
