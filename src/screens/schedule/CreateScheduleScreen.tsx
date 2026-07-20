import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radius, spacing } from '../../theme/colors';
import { ScheduleStackParamList } from '../../navigation/types';
import { createSchedule } from '../../data/schedules';
import { CREW_LABEL, Crew } from '../../types';
import { ScreenHeader } from '../../components/ScreenHeader';
import { PickerField } from '../../components/PickerField';
import { alert } from '../../lib/alert';

type Props = NativeStackScreenProps<ScheduleStackParamList, 'CreateSchedule'>;

const CREWS: Crew[] = ['game', 'tea', 'fishing', 'hiking'];

function defaultDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString().slice(0, 10);
}

export default function CreateScheduleScreen({ navigation }: Props) {
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState('');
  const [capacity, setCapacity] = useState('');
  const [crew, setCrew] = useState<Crew>('game');
  // Empty by default so the field shows a light placeholder hint instead of
  // what looks like already-entered text; submit falls back to the defaults.
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [error, setError] = useState('');

  const stepCapacity = (delta: number) => {
    const next = Math.max(0, (parseInt(capacity, 10) || 0) + delta);
    setCapacity(String(next));
  };

  const handleSubmit = async () => {
    if (!title || !place) return;
    const startAt = new Date(`${date || defaultDate()}T${time || '19:00'}:00`);
    if (Number.isNaN(startAt.getTime())) {
      setError('날짜/시간 형식을 확인해주세요 (예: 2026-07-20, 19:00)');
      return;
    }
    setError('');
    try {
      await createSchedule({ crew, title, place, capacity: Number(capacity) || 10, startAt: startAt.toISOString() });
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
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
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="모임 제목" placeholderTextColor={colors.placeholder} />

        <Text style={styles.label}>날짜</Text>
        <View style={styles.pickerRow}>
          <TextInput
            style={[styles.input, styles.pickerInput]}
            value={date}
            onChangeText={setDate}
            placeholder={`예: ${defaultDate()}`}
            placeholderTextColor={colors.placeholder}
          />
          <PickerField mode="date" value={date} onChange={setDate} />
        </View>

        <Text style={styles.label}>시간</Text>
        <View style={styles.pickerRow}>
          <TextInput
            style={[styles.input, styles.pickerInput]}
            value={time}
            onChangeText={setTime}
            placeholder="예: 19:00"
            placeholderTextColor={colors.placeholder}
          />
          <PickerField mode="time" value={time} onChange={setTime} />
        </View>

        <Text style={styles.label}>장소</Text>
        <TextInput style={styles.input} value={place} onChangeText={setPlace} placeholder="모임 장소" placeholderTextColor={colors.placeholder} />

        <Text style={styles.label}>정원</Text>
        <View style={styles.stepperRow}>
          <TouchableOpacity style={styles.stepButton} onPress={() => stepCapacity(-1)}>
            <Text style={styles.stepButtonText}>−</Text>
          </TouchableOpacity>
          <View style={styles.stepValue}>
            <TextInput
              style={styles.stepInput}
              value={capacity}
              onChangeText={(t) => setCapacity(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="10"
              placeholderTextColor={colors.placeholder}
              textAlign="center"
            />
            <Text style={styles.stepSuffix}>명</Text>
          </View>
          <TouchableOpacity style={styles.stepButton} onPress={() => stepCapacity(1)}>
            <Text style={styles.stepButtonText}>＋</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

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
    color: colors.text,
  },
  pickerRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'stretch' },
  pickerInput: { flex: 1 },
  stepperRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  stepButton: {
    width: 48,
    height: 48,
    borderRadius: radius.tile,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonText: { fontSize: 22, color: colors.gold, fontWeight: '700' },
  stepValue: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.tile,
    height: 48,
    gap: 4,
  },
  stepInput: { fontSize: 16, color: colors.text, minWidth: 40, paddingVertical: 0 },
  stepSuffix: { fontSize: 14, color: colors.textMuted },
  submitButton: {
    backgroundColor: colors.gold,
    borderRadius: radius.card,
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: spacing.xxl,
  },
  submitText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  error: { color: colors.danger, fontSize: 12, marginTop: spacing.md },
});
