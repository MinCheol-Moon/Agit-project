import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radius, spacing } from '../../theme/colors';
import { MyStackParamList } from '../../navigation/types';
import { ScreenHeader } from '../../components/ScreenHeader';
import { TIER_LABEL } from '../../types';

type Props = NativeStackScreenProps<MyStackParamList, 'Rules'>;

const TIER_ROWS: { tier: keyof typeof TIER_LABEL; desc: string }[] = [
  { tier: 'guest', desc: '회비 사용처, 기본 일정 열람' },
  { tier: 'raljab', desc: '+ 출석, 일정 참석 여부 표시' },
  { tier: 'talbuchak', desc: '+ 회비 잔액, 채팅, 일정 참여' },
  { tier: 'taljuninja', desc: '모든 기능·열람 + 일정 생성' },
  { tier: 'akatsuki', desc: '자동 승급 최고 등급 (출석으로 도달 가능)' },
  { tier: 'admin', desc: '마스터가 임명 · 등급 조정, 가입 승인, 실명 열람, 회비 관리, 공지 작성' },
];

export default function RulesScreen({ navigation }: Props) {
  return (
    <View style={styles.screen}>
      <ScreenHeader title="회칙" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>등급 체계</Text>
        {TIER_ROWS.map((row) => (
          <View key={row.tier} style={styles.tierRow}>
            <Text style={styles.tierName}>{TIER_LABEL[row.tier]}</Text>
            <Text style={styles.tierDesc}>{row.desc}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>자동 승급 · 강등 규칙</Text>
        <View style={styles.card}>
          <Text style={styles.ruleText}>1. 지난달 출석 4회 이상 → 한 단계 승급 (탈주닌자까지 자동)</Text>
          <Text style={styles.ruleText}>2. 지난달 출석 0회 → 한 단계 강등 (랄잡이 하한)</Text>
          <Text style={styles.ruleText}>3. 3개월 연속 0회 → 탈퇴 처리</Text>
        </View>

        <Text style={styles.sectionTitle}>기본 약속</Text>
        <View style={styles.card}>
          <Text style={styles.ruleText}>· 실명·연락처는 관리자·마스터만 열람하며 열람 기록이 남습니다</Text>
          <Text style={styles.ruleText}>· 회비는 카카오뱅크로만 관리되며 사용처는 전 등급에 공개됩니다</Text>
          <Text style={styles.ruleText}>· 서로 존중하는 태도로 활동해주세요</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  tierRow: { backgroundColor: colors.white, borderRadius: radius.tile, borderWidth: 1, borderColor: colors.line, padding: spacing.md, marginBottom: spacing.sm },
  tierName: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 2 },
  tierDesc: { fontSize: 12, color: colors.textMuted },
  card: { backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, gap: 6 },
  ruleText: { fontSize: 13, color: colors.textMuted },
});
