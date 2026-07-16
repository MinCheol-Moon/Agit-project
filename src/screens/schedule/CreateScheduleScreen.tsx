import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, radius, spacing } from '../../theme/colors';
import { ScheduleStackParamList } from '../../navigation/types';
import { createSchedule } from '../../data/schedules';
import { CREW_LABEL, Crew } from '../../types';
import { ScreenHeader } from '../../components/ScreenHeader';

type Props = NativeStackScreenProps<ScheduleStackParamList, 'CreateSchedule'>;

const CREWS: Crew[] = ['game', 'tea', 'fishing', 'hiking'];

function defaultDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString().slice(0, 10);
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [error, setError] = useState('');

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

  // ponytail: the native calendar/wheel pickers don't exist on web - there,
  // plain text input (already supported) is the whole story.
  const pickersAvailable = Platform.OS !== 'web';

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

        <Text style={styles.label}>날짜</Text>
        <View style={styles.pickerRow}>
          <TextInput
            style={[styles.input, styles.pickerInput]}
            value={date}
            onChangeText={setDate}
            placeholder={`예: ${defaultDate()}`}
          />
          {pickersAvailable && (
            <TouchableOpacity style={styles.pickerButton} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar-outline" size={20} color={colors.gold} />
            </TouchableOpacity>
          )}
        </View>
        {showDatePicker && (
          <DateTimePicker
            value={date ? new Date(`${date}T12:00:00`) : new Date(`${defaultDate()}T12:00:00`)}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
            onChange={(event, selected) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selected) {
                setDate(`${selected.getFullYear()}-${pad2(selected.getMonth() + 1)}-${pad2(selected.getDate())}`);
                if (Platform.OS === 'ios') setShowDatePicker(false);
              }
            }}
          />
        )}

        <Text style={styles.label}>시간</Text>
        <View style={styles.pickerRow}>
          <TextInput
            style={[styles.input, styles.pickerInput]}
            value={time}
            onChangeText={setTime}
            placeholder="예: 19:00"
          />
          {pickersAvailable && (
            <TouchableOpacity style={styles.pickerButton} onPress={() => setShowTimePicker(true)}>
              <Ionicons name="time-outline" size={20} color={colors.gold} />
            </TouchableOpacity>
          )}
        </View>
        {showTimePicker && (
          <DateTimePicker
            value={new Date(`${defaultDate()}T${time || '19:00'}:00`)}
            mode="time"
            display="spinner"
            minuteInterval={5}
            onChange={(event, selected) => {
              setShowTimePicker(Platform.OS === 'ios');
              if (selected) {
                setTime(`${pad2(selected.getHours())}:${pad2(selected.getMinutes())}`);
                if (Platform.OS === 'ios') setShowTimePicker(false);
              }
            }}
          />
        )}

        <Text style={styles.label}>장소</Text>
        <TextInput style={styles.input} value={place} onChangeText={setPlace} placeholder="모임 장소" />

        <Text style={styles.label}>정원</Text>
        <TextInput style={styles.input} value={capacity} onChangeText={setCapacity} keyboardType="number-pad" placeholder="예: 10" />

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
  },
  pickerRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  pickerInput: { flex: 1 },
  pickerButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.tile,
    padding: 11,
  },
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
