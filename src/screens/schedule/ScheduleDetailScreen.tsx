import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/colors';
import { ScheduleStackParamList } from '../../navigation/types';
import { deleteSchedule, getMyRsvp, listAttendeeIds, listSchedules, setRsvp, updateSchedule } from '../../data/schedules';
import { listMembers } from '../../data/users';
import { CREW_LABEL, Rsvp, Schedule } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../lib/permissions';
import { ScreenHeader } from '../../components/ScreenHeader';
import { alert } from '../../lib/alert';
import { confirmDestructive } from '../../lib/confirm';

type Props = NativeStackScreenProps<ScheduleStackParamList, 'ScheduleDetail'>;

function toDateInput(iso: string): string {
  return iso.slice(0, 10);
}
function toTimeInput(iso: string): string {
  return new Date(iso).toTimeString().slice(0, 5);
}

export default function ScheduleDetailScreen({ route, navigation }: Props) {
  const { scheduleId } = route.params;
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [myRsvp, setMyRsvp] = useState<Rsvp | undefined>();
  const [attendees, setAttendees] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [capacity, setCapacity] = useState('');
  const tier = user?.tier ?? 'guest';
  const canSeeAttendees = can(tier, 'attendance');

  const loadAttendees = useCallback(async () => {
    if (!canSeeAttendees) return;
    const [ids, members] = await Promise.all([listAttendeeIds(scheduleId), listMembers()]);
    const nicknameById = new Map(members.map((m) => [m.id, m.nickname]));
    setAttendees(ids.map((id) => nicknameById.get(id) ?? '회원'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleId, canSeeAttendees]);

  useFocusEffect(
    useCallback(() => {
      listSchedules().then((list) => setSchedule(list.find((s) => s.id === scheduleId) ?? null));
      getMyRsvp(scheduleId).then(setMyRsvp);
      loadAttendees();
    }, [scheduleId, loadAttendees]),
  );

  const handleRsvp = async (status: 'yes' | 'no') => {
    if (!can(tier, 'scheduleRsvp')) {
      alert('랄잡부터 참석 투표가 가능합니다');
      return;
    }
    try {
      await setRsvp(scheduleId, status);
      const updated = await getMyRsvp(scheduleId);
      setMyRsvp(updated);
      listSchedules().then((list) => setSchedule(list.find((s) => s.id === scheduleId) ?? null));
      loadAttendees();
    } catch (e) {
      alert('참석 등록 실패', e instanceof Error ? e.message : String(e));
    }
  };

  if (!schedule) return null;

  const canManage = schedule.createdBy === user?.id || tier === 'admin' || Boolean(user?.isMaster);

  const startEdit = () => {
    setTitle(schedule.title);
    setPlace(schedule.place);
    setDate(toDateInput(schedule.startAt));
    setTime(toTimeInput(schedule.startAt));
    setCapacity(String(schedule.capacity));
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!title.trim() || !place.trim()) return;
    const startAt = new Date(`${date}T${time}:00`);
    if (Number.isNaN(startAt.getTime())) {
      alert('날짜/시간 형식을 확인해주세요 (예: 2026-07-20, 19:00)');
      return;
    }
    try {
      await updateSchedule(scheduleId, {
        title: title.trim(),
        place: place.trim(),
        startAt: startAt.toISOString(),
        capacity: Number(capacity) || schedule.capacity,
      });
      setEditing(false);
      listSchedules().then((list) => setSchedule(list.find((s) => s.id === scheduleId) ?? null));
    } catch (e) {
      alert('수정 실패', e instanceof Error ? e.message : String(e));
    }
  };

  const handleDelete = () => {
    confirmDestructive('일정 삭제', '이 일정을 삭제할까요?', async () => {
      try {
        await deleteSchedule(scheduleId);
        navigation.goBack();
      } catch (e) {
        alert('삭제 실패', e instanceof Error ? e.message : String(e));
      }
    });
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="일정 상세"
        onBack={() => navigation.goBack()}
        right={
          canManage && !editing ? (
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={startEdit}>
                <Ionicons name="create-outline" size={20} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        {editing ? (
          <>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="제목" />
            <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="날짜 (YYYY-MM-DD)" />
            <TextInput style={styles.input} value={time} onChangeText={setTime} placeholder="시간 (HH:mm)" />
            <TextInput style={styles.input} value={place} onChangeText={setPlace} placeholder="장소" />
            <TextInput style={styles.input} value={capacity} onChangeText={setCapacity} placeholder="정원" keyboardType="number-pad" />
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setEditing(false)}>
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit}>
                <Text style={styles.saveButtonText}>저장</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
        <View style={[styles.crewChip, { backgroundColor: colors.crew[schedule.crew] }]}>
          <Text style={styles.crewChipText}>{CREW_LABEL[schedule.crew]}</Text>
        </View>
        <Text style={styles.title}>{schedule.title}</Text>
        <Text style={styles.meta}>
          {new Date(schedule.startAt).toLocaleString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })}
        </Text>
        <Text style={styles.meta}>{schedule.place}</Text>
        <Text style={styles.meta}>참석 {schedule.attendingCount}/{schedule.capacity}명</Text>

        <View style={styles.rsvpRow}>
          <TouchableOpacity
            style={[styles.rsvpButton, myRsvp?.status === 'yes' && styles.rsvpActive]}
            onPress={() => handleRsvp('yes')}
          >
            <Text style={[styles.rsvpText, myRsvp?.status === 'yes' && styles.rsvpTextActive]}>참석</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rsvpButton, myRsvp?.status === 'no' && styles.rsvpActiveNo]}
            onPress={() => handleRsvp('no')}
          >
            <Text style={[styles.rsvpText, myRsvp?.status === 'no' && styles.rsvpTextActive]}>불참</Text>
          </TouchableOpacity>
        </View>
        {!can(tier, 'scheduleRsvp') && <Text style={styles.lockNote}>랄잡부터 참석 여부를 표시할 수 있어요</Text>}

        {canSeeAttendees ? (
          <View style={styles.attendeeSection}>
            <Text style={styles.attendeeTitle}>참석자 명단</Text>
            {attendees.length === 0 ? (
              <Text style={styles.attendeeEmpty}>아직 참석자가 없어요</Text>
            ) : (
              <View style={styles.attendeeList}>
                {attendees.map((nickname, i) => (
                  <View key={`${nickname}-${i}`} style={styles.attendeeChip}>
                    <Text style={styles.attendeeChipText}>{nickname}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.lockNote}>랄잡부터 참석자 명단을 볼 수 있어요</Text>
        )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  headerActions: { flexDirection: 'row', gap: spacing.md },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.tile, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 14, marginBottom: spacing.md },
  editActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  cancelButton: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: radius.card, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  cancelButtonText: { fontWeight: '700', color: colors.text },
  saveButton: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: radius.card, backgroundColor: colors.gold },
  saveButtonText: { fontWeight: '700', color: colors.white },
  crewChip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, marginBottom: spacing.md },
  crewChipText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  meta: { fontSize: 14, color: colors.textMuted, marginBottom: 4 },
  rsvpRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  rsvpButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.card,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  rsvpActive: { backgroundColor: colors.success, borderColor: colors.success },
  rsvpActiveNo: { backgroundColor: colors.danger, borderColor: colors.danger },
  rsvpText: { fontWeight: '700', color: colors.text },
  rsvpTextActive: { color: colors.white },
  lockNote: { marginTop: spacing.md, fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  attendeeSection: { marginTop: spacing.xl },
  attendeeTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  attendeeEmpty: { fontSize: 13, color: colors.textMuted },
  attendeeList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  attendeeChip: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 8 },
  attendeeChipText: { fontSize: 13, color: colors.text, fontWeight: '600' },
});
