import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radius, spacing } from '../../theme/colors';
import { ScheduleStackParamList } from '../../navigation/types';
import { listAttendeeIdsByScheduleId, listSchedules } from '../../data/schedules';
import { listMembers } from '../../data/users';
import { CREW_LABEL, Schedule } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../lib/permissions';

type Props = NativeStackScreenProps<ScheduleStackParamList, 'ScheduleList'>;

function attendeeSummary(nicknames: string[]): string {
  if (nicknames.length === 0) return '아직 참석자 없음';
  if (nicknames.length <= 2) return `${nicknames.join(', ')} 참석`;
  return `${nicknames.slice(0, 2).join(', ')} 외 ${nicknames.length - 2}명 참석`;
}

export default function ScheduleListScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [attendeesByScheduleId, setAttendeesByScheduleId] = useState<Map<string, string[]>>(new Map());
  const tier = user?.tier ?? 'guest';
  const canSeeAttendees = can(tier, 'attendance');

  useFocusEffect(
    useCallback(() => {
      listSchedules().then(setSchedules);
      if (canSeeAttendees) {
        Promise.all([listAttendeeIdsByScheduleId(), listMembers()]).then(([idsByScheduleId, members]) => {
          const nicknameById = new Map(members.map((m) => [m.id, m.nickname]));
          const nicknamesByScheduleId = new Map<string, string[]>();
          idsByScheduleId.forEach((ids, scheduleId) => {
            nicknamesByScheduleId.set(scheduleId, ids.map((id) => nicknameById.get(id) ?? '회원'));
          });
          setAttendeesByScheduleId(nicknamesByScheduleId);
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canSeeAttendees]),
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>일정</Text>
        {can(tier, 'createSchedule') && (
          <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('CreateSchedule')}>
            <Text style={styles.addButtonText}>+ 만들기</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={schedules}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ScheduleDetail', { scheduleId: item.id })}>
            <View style={[styles.crewDot, { backgroundColor: colors.crew[item.crew] }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardMeta}>
                {CREW_LABEL[item.crew]} · {new Date(item.startAt).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Text style={styles.cardMeta}>{item.place}</Text>
              {canSeeAttendees && (
                <Text style={styles.cardAttendees} numberOfLines={1}>
                  {attendeeSummary(attendeesByScheduleId.get(item.id) ?? [])}
                </Text>
              )}
            </View>
            <Text style={styles.cardCount}>{item.attendingCount}/{item.capacity}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  addButton: { backgroundColor: colors.gold, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  addButtonText: { color: colors.white, fontWeight: '700', fontSize: 12 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    gap: spacing.md,
  },
  crewDot: { width: 10, height: 10, borderRadius: 5 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  cardMeta: { fontSize: 12, color: colors.textMuted },
  cardAttendees: { fontSize: 12, color: colors.gold, marginTop: 4, fontWeight: '600' },
  cardCount: { fontSize: 13, fontWeight: '700', color: colors.gold },
});
