import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radius, spacing } from '../../theme/colors';
import { ScheduleStackParamList } from '../../navigation/types';
import { createSchedule } from '../../data/schedules';
import { CREW_LABEL, Crew } from '../../types';
import { ScreenHeader } from '../../components/ScreenHeader';

type Props = NativeStackScreenProps<ScheduleStackParamList, 'CreateSchedule'>;

const CREWS: Crew[] = ['game', 'tea', 'fishing', 'hiking'];

export default function CreateScheduleScreen({ navigation }: Props) {
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState('');
  const [capacity, setCapacity] = useState('10');
  const [crew, setCrew] = useState<Crew>('game');

  const handleSubmit = async () => {
    if (!title || !place) return;
    const startAt = new Date();
    startAt.setDate(startAt.getDate() + 3);
    await createSchedule({ crew, title, place, capacity: Number(capacity) || 10, startAt: startAt.toISOString() });
    navigation.goBack();
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="일정 만들기" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>크루</Text>
        <View style={styles.crewRow}>
          {CREWS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.crewChip, crew === c && { backgroundColor: colors.crew[c] }]}
              onPress={() => setCrew(c)}
            >
              <Text style={[styles.crewChipText, crew === c && styles.crewChipTextActive]}>{CREW_LABEL[c]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>제목</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="모임 제목" />

        <Text style={styles.label}>장소</Text>
        <TextInput style={styles.input} value={place} onChangeText={setPlace} placeholder="모임 장소" />

        <Text style={styles.label}>정원</Text>
        <TextInput style={styles.input} value={capacity} onChangeText={setCapacity} keyboardType="number-pad" />

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitText}>일정 만들기</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  crewRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  crewChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  crewChipText: { fontSize: 13, color: colors.text, fontWeight: '600' },
  crewChipTextActive: { color: colors.white },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.tile,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: colors.gold,
    borderRadius: radius.card,
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: spacing.xxl,
  },
  submitText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
