import React, { useRef } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing } from '../../theme/colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StealthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<StealthStackParamList, 'Ledger'>;

const TRANSACTIONS = [
  { id: 1, category: '식비', memo: '점심 김밥천국', amount: -8500, date: '07.13' },
  { id: 2, category: '교통', memo: '지하철', amount: -1500, date: '07.13' },
  { id: 3, category: '급여', memo: '7월 급여', amount: 2650000, date: '07.10' },
  { id: 4, category: '카페', memo: '스타벅스', amount: -6200, date: '07.09' },
  { id: 5, category: '쇼핑', memo: '생필품', amount: -34000, date: '07.07' },
];

export default function LedgerScreen({ navigation }: Props) {
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSecretTap = () => {
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    if (tapCount.current >= 3) {
      tapCount.current = 0;
      navigation.navigate('Pin');
      return;
    }
    tapTimer.current = setTimeout(() => {
      tapCount.current = 0;
    }, 800);
  };

  const balance = TRANSACTIONS.reduce((sum, t) => sum + t.amount, 0);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TouchableOpacity activeOpacity={1} onLongPress={() => navigation.navigate('Pin')} delayLongPress={900}>
        <Text style={styles.title}>가계부</Text>
      </TouchableOpacity>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>이번 달 잔액</Text>
        <TouchableOpacity onPress={handleSecretTap} activeOpacity={0.8}>
          <Text style={styles.balanceValue}>{balance.toLocaleString()}원</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>최근 거래내역</Text>
      {TRANSACTIONS.map((t) => (
        <View key={t.id} style={styles.row}>
          <View>
            <Text style={styles.rowMemo}>{t.memo}</Text>
            <Text style={styles.rowCategory}>{t.category} · {t.date}</Text>
          </View>
          <Text style={[styles.rowAmount, t.amount > 0 ? styles.income : styles.expense]}>
            {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString()}원
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  balanceCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.line,
  },
  balanceLabel: { color: colors.textMuted, fontSize: 13, marginBottom: 6 },
  balanceValue: { fontSize: 28, fontWeight: '700', color: colors.text },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowMemo: { fontSize: 14, color: colors.text, fontWeight: '600' },
  rowCategory: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  rowAmount: { fontSize: 14, fontWeight: '700' },
  income: { color: colors.success },
  expense: { color: colors.text },
});
