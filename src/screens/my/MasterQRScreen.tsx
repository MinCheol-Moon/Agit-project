import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import QRCode from 'react-native-qrcode-svg';
import { colors, radius, spacing } from '../../theme/colors';
import { MyStackParamList } from '../../navigation/types';
import { listSchedules } from '../../data/schedules';
import { Schedule } from '../../types';
import { ScreenHeader } from '../../components/ScreenHeader';
import { checkinUrl } from '../../lib/checkinLink';

type Props = NativeStackScreenProps<MyStackParamList, 'MasterQR'>;

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function MasterQRScreen({ navigation }: Props) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      listSchedules().then((list) => {
        setSchedules(list);
        setSelectedId((cur) => cur ?? list[0]?.id ?? null);
      });
    }, []),
  );

  const selected = schedules.find((s) => s.id === selectedId) ?? null;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="출석 체크 QR" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.help}>
          모임 현장에서 이 QR을 회원들에게 보여주세요. 회원이 휴대폰 카메라로 찍으면 실제 참석이 처리됩니다.
          (참석/불참 투표와 별개로, QR을 찍은 사람만 실제 출석으로 집계돼요.)
        </Text>

        <Text style={styles.label}>어떤 모임의 출석인가요?</Text>
        {schedules.length === 0 ? (
          <Text style={styles.empty}>등록된 일정이 없어요. 먼저 일정을 만들어주세요.</Text>
        ) : (
          <View style={styles.pickList}>
            {schedules.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.pickItem, selectedId === s.id && styles.pickItemActive]}
                onPress={() => setSelectedId(s.id)}
              >
                <Text style={[styles.pickTitle, selectedId === s.id && styles.pickTitleActive]}>{s.title}</Text>
                <Text style={[styles.pickMeta, selectedId === s.id && styles.pickMetaActive]}>{fmt(s.startAt)} · {s.place}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {selected && (
          <View style={styles.qrCard}>
            <QRCode value={checkinUrl(selected.id)} size={230} backgroundColor="#ffffff" color="#191c22" />
            <Text style={styles.qrCaption}>{selected.title}</Text>
            <Text style={styles.qrMeta}>{fmt(selected.startAt)}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  help: { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  empty: { fontSize: 13, color: colors.textMuted },
  pickList: { gap: spacing.sm },
  pickItem: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.tile,
    padding: spacing.md,
  },
  pickItemActive: { borderColor: colors.gold, backgroundColor: colors.goldLight },
  pickTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  pickTitleActive: { color: '#191c22' },
  pickMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  pickMetaActive: { color: '#5c4a1e' },
  qrCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xl,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  qrCaption: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  qrMeta: { fontSize: 12, color: colors.textMuted },
});
