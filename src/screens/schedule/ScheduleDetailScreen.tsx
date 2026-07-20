import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/colors';
import { ScheduleStackParamList } from '../../navigation/types';
import { deleteSchedule, getMyRsvp, listAttendeeIds, listEarlyBirds, listSchedules, setRsvp, updateSchedule } from '../../data/schedules';
import { listMembers } from '../../data/users';
import { addScheduleComment, deleteScheduleComment, listScheduleComments } from '../../data/scheduleComments';
import { CREW_LABEL, Rsvp, Schedule, ScheduleComment } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../lib/permissions';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Avatar } from '../../components/Avatar';
import { alert } from '../../lib/alert';
import { confirmDestructive } from '../../lib/confirm';

type Props = NativeStackScreenProps<ScheduleStackParamList, 'ScheduleDetail'>;

type Profile = { nickname: string; avatarUrl?: string | null };

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
  const [attendees, setAttendees] = useState<Profile[]>([]);
  const [checkedIn, setCheckedIn] = useState<Profile[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [comments, setComments] = useState<ScheduleComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [replyTo, setReplyTo] = useState<ScheduleComment | null>(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [capacity, setCapacity] = useState('');
  const tier = user?.tier ?? 'guest';
  const canSeeAttendees = can(tier, 'attendance');

  const loadAttendees = useCallback(async () => {
    const [ids, earlyBirds, members] = await Promise.all([
      canSeeAttendees ? listAttendeeIds(scheduleId) : Promise.resolve([]),
      canSeeAttendees ? listEarlyBirds(scheduleId) : Promise.resolve([]),
      listMembers(),
    ]);
    const profileById: Record<string, Profile> = Object.fromEntries(
      members.map((m) => [m.id, { nickname: m.nickname, avatarUrl: m.avatarUrl }]),
    );
    setProfiles(profileById);
    setAttendees(ids.map((id) => profileById[id] ?? { nickname: '회원' }));
    setCheckedIn(earlyBirds.map((a) => profileById[a.userId] ?? { nickname: '회원' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleId, canSeeAttendees]);

  const loadComments = useCallback(() => {
    listScheduleComments(scheduleId).then(setComments).catch(() => {});
  }, [scheduleId]);

  useFocusEffect(
    useCallback(() => {
      listSchedules().then((list) => setSchedule(list.find((s) => s.id === scheduleId) ?? null));
      getMyRsvp(scheduleId).then(setMyRsvp);
      loadAttendees();
      loadComments();
    }, [scheduleId, loadAttendees, loadComments]),
  );

  const handleAddComment = async () => {
    if (!commentInput.trim()) return;
    try {
      await addScheduleComment(scheduleId, commentInput.trim(), replyTo?.id);
      setCommentInput('');
      setReplyTo(null);
      loadComments();
    } catch (e) {
      alert('댓글 등록 실패', e instanceof Error ? e.message : String(e));
    }
  };

  const handleDeleteComment = (commentId: string) => {
    confirmDestructive('댓글 삭제', '이 댓글을 삭제할까요?', async () => {
      try {
        await deleteScheduleComment(commentId);
        loadComments();
      } catch (e) {
        alert('삭제 실패', e instanceof Error ? e.message : String(e));
      }
    });
  };

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
                {attendees.map((a, i) => (
                  <View key={`${a.nickname}-${i}`} style={styles.attendeeChip}>
                    <Avatar url={a.avatarUrl} name={a.nickname} size={22} />
                    <Text style={styles.attendeeChipText}>{a.nickname}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.lockNote}>랄잡부터 참석자 명단을 볼 수 있어요</Text>
        )}

        {canSeeAttendees && (
          <View style={styles.attendeeSection}>
            <Text style={styles.attendeeTitle}>실제 참석 (QR 체크인) {checkedIn.length > 0 ? checkedIn.length : ''}</Text>
            {checkedIn.length === 0 ? (
              <Text style={styles.attendeeEmpty}>현장에서 마스터의 출석 QR을 찍으면 여기에 표시돼요</Text>
            ) : (
              <View style={styles.attendeeList}>
                {checkedIn.map((a, i) => (
                  <View key={`ci-${a.nickname}-${i}`} style={[styles.attendeeChip, styles.checkedInChip]}>
                    <Avatar url={a.avatarUrl} name={a.nickname} size={22} />
                    <Text style={styles.attendeeChipText}>{a.nickname}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.commentSection}>
          <Text style={styles.attendeeTitle}>댓글 {comments.length > 0 ? comments.length : ''}</Text>
          {comments.filter((c) => !c.parentId).map((comment) => {
            const replies = comments.filter((c) => c.parentId === comment.id);
            return (
              <View key={comment.id}>
                <CommentRow
                  comment={comment}
                  profile={profiles[comment.userId]}
                  canDelete={comment.userId === user?.id || tier === 'admin' || Boolean(user?.isMaster)}
                  onDelete={() => handleDeleteComment(comment.id)}
                  onReply={() => setReplyTo(comment)}
                />
                {replies.map((reply) => (
                  <View key={reply.id} style={styles.replyIndent}>
                    <CommentRow
                      comment={reply}
                      profile={profiles[reply.userId]}
                      canDelete={reply.userId === user?.id || tier === 'admin' || Boolean(user?.isMaster)}
                      onDelete={() => handleDeleteComment(reply.id)}
                    />
                  </View>
                ))}
              </View>
            );
          })}
          {replyTo && (
            <View style={styles.replyBanner}>
              <Text style={styles.replyBannerText}>
                {profiles[replyTo.userId]?.nickname ?? '회원'}님에게 답글 작성 중
              </Text>
              <TouchableOpacity onPress={() => setReplyTo(null)}>
                <Ionicons name="close" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.commentInput}
              value={commentInput}
              onChangeText={setCommentInput}
              placeholder={replyTo ? '답글 입력' : '댓글 입력'}
            />
            <TouchableOpacity style={styles.commentSendButton} onPress={handleAddComment}>
              <Text style={styles.commentSendText}>등록</Text>
            </TouchableOpacity>
          </View>
        </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function CommentRow({
  comment,
  profile,
  canDelete,
  onDelete,
  onReply,
}: {
  comment: ScheduleComment;
  profile?: Profile;
  canDelete: boolean;
  onDelete: () => void;
  onReply?: () => void;
}) {
  return (
    <View style={styles.commentRow}>
      <Avatar url={profile?.avatarUrl} name={profile?.nickname ?? '회원'} size={28} />
      <View style={styles.commentBody}>
        <View style={styles.commentTop}>
          <Text style={styles.commentNickname}>{profile?.nickname ?? '회원'}</Text>
          <Text style={styles.commentTime}>
            {new Date(comment.createdAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <Text style={styles.commentText}>{comment.body}</Text>
        <View style={styles.commentActions}>
          {onReply && (
            <TouchableOpacity onPress={onReply}>
              <Text style={styles.commentActionText}>답글</Text>
            </TouchableOpacity>
          )}
          {canDelete && (
            <TouchableOpacity onPress={onDelete}>
              <Text style={styles.commentActionText}>삭제</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
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
  attendeeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  checkedInChip: { borderColor: colors.success, backgroundColor: '#eaf7ee' },
  attendeeChipText: { fontSize: 13, color: colors.text, fontWeight: '600' },
  commentSection: { marginTop: spacing.xl },
  commentRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  commentBody: { flex: 1 },
  commentTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  commentNickname: { fontSize: 12, fontWeight: '700', color: colors.text },
  commentTime: { fontSize: 10, color: colors.textMuted },
  commentText: { fontSize: 13, color: colors.text, marginTop: 2 },
  commentActions: { flexDirection: 'row', gap: spacing.md, marginTop: 4 },
  commentActionText: { fontSize: 11, color: colors.textMuted },
  replyIndent: { marginLeft: spacing.xxl },
  replyBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.cream, borderRadius: radius.tile, paddingHorizontal: spacing.md, paddingVertical: 8, marginBottom: spacing.sm },
  replyBannerText: { fontSize: 12, color: colors.creamText },
  commentInputRow: { flexDirection: 'row', gap: spacing.sm },
  commentInput: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 13 },
  commentSendButton: { backgroundColor: colors.gold, borderRadius: radius.pill, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  commentSendText: { color: colors.white, fontWeight: '700', fontSize: 13 },
});
