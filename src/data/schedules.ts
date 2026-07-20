import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getAuthUserId } from '../lib/session';
import { camelizeDeep } from '../lib/caseMap';
import { Attendance, Crew, Rsvp, RsvpStatus, Schedule } from '../types';
import { CURRENT_USER_ID, mockAttendances, mockRsvps, mockSchedules } from './mockStore';

export async function listSchedules(): Promise<Schedule[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('schedules').select('*').order('start_at');
    if (error) throw error;
    const schedules = camelizeDeep<Schedule[]>(data ?? []);

    // attendingCount isn't a column; count "yes" rsvps client-side.
    const { data: rsvpRows, error: rsvpError } = await supabase.from('rsvps').select('schedule_id, status').eq('status', 'yes');
    if (rsvpError) throw rsvpError;
    const counts = new Map<string, number>();
    (rsvpRows ?? []).forEach((r) => counts.set(r.schedule_id, (counts.get(r.schedule_id) ?? 0) + 1));

    return schedules.map((s) => ({ ...s, attendingCount: counts.get(s.id) ?? 0 }));
  }
  return [...mockSchedules].sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export async function createSchedule(input: {
  crew: Crew;
  title: string;
  startAt: string;
  place: string;
  capacity: number;
}): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('schedules').insert({
      crew: input.crew,
      title: input.title,
      start_at: input.startAt,
      place: input.place,
      capacity: input.capacity,
      created_by: await getAuthUserId(),
    });
    if (error) throw error;
    return;
  }
  mockSchedules.push({
    id: `s-${Date.now()}`,
    crew: input.crew,
    title: input.title,
    startAt: input.startAt,
    place: input.place,
    capacity: input.capacity,
    createdBy: CURRENT_USER_ID,
    attendingCount: 0,
  });
}

export async function updateSchedule(
  scheduleId: string,
  input: { title: string; place: string; startAt: string; capacity: number },
): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('schedules')
      .update({ title: input.title, place: input.place, start_at: input.startAt, capacity: input.capacity })
      .eq('id', scheduleId)
      .select('id');
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('수정 권한이 없거나 서버 설정(마이그레이션)이 아직 반영되지 않았어요.');
    return;
  }
  const schedule = mockSchedules.find((s) => s.id === scheduleId);
  if (schedule) {
    schedule.title = input.title;
    schedule.place = input.place;
    schedule.startAt = input.startAt;
    schedule.capacity = input.capacity;
  }
}

export async function deleteSchedule(scheduleId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('schedules').delete().eq('id', scheduleId).select('id');
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('삭제 권한이 없거나 서버 설정(마이그레이션)이 아직 반영되지 않았어요.');
    return;
  }
  const idx = mockSchedules.findIndex((s) => s.id === scheduleId);
  if (idx >= 0) mockSchedules.splice(idx, 1);
}

export async function setRsvp(scheduleId: string, status: RsvpStatus): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('rsvps')
      .upsert({ user_id: await getAuthUserId(), schedule_id: scheduleId, status }, { onConflict: 'user_id,schedule_id' });
    if (error) throw error;
    return;
  }
  const existing = mockRsvps.find((r) => r.userId === CURRENT_USER_ID && r.scheduleId === scheduleId);
  if (existing) {
    existing.status = status;
  } else {
    mockRsvps.push({ id: `r-${Date.now()}`, userId: CURRENT_USER_ID, scheduleId, status });
  }
  const schedule = mockSchedules.find((s) => s.id === scheduleId);
  if (schedule) {
    schedule.attendingCount = mockRsvps.filter((r) => r.scheduleId === scheduleId && r.status === 'yes').length;
  }
}

export async function getMyRsvp(scheduleId: string): Promise<Rsvp | undefined> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase
      .from('rsvps')
      .select('*')
      .eq('schedule_id', scheduleId)
      .eq('user_id', await getAuthUserId())
      .maybeSingle();
    return data ? camelizeDeep<Rsvp>(data) : undefined;
  }
  return mockRsvps.find((r) => r.userId === CURRENT_USER_ID && r.scheduleId === scheduleId);
}

export async function checkIn(scheduleId: string): Promise<Attendance> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('attendances')
      .insert({ user_id: await getAuthUserId(), schedule_id: scheduleId })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') throw new Error('이미 이 모임에 출석 처리되었어요.');
      throw error;
    }
    return camelizeDeep<Attendance>(data);
  }
  const alreadyToday = mockAttendances.some(
    (a) => a.userId === CURRENT_USER_ID && a.checkedAt.slice(0, 10) === new Date().toISOString().slice(0, 10),
  );
  if (alreadyToday) throw new Error('오늘은 이미 출석 체크를 하셨어요.');
  const attendance: Attendance = {
    id: `a-${Date.now()}`,
    userId: CURRENT_USER_ID,
    scheduleId,
    checkedAt: new Date().toISOString(),
  };
  mockAttendances.push(attendance);
  return attendance;
}

export async function hasCheckedInToday(): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    const userId = await getAuthUserId();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from('attendances')
      .select('id')
      .eq('user_id', userId)
      .gte('checked_at', startOfDay.toISOString())
      .limit(1);
    if (error) throw error;
    return (data ?? []).length > 0;
  }
  const today = new Date().toISOString().slice(0, 10);
  return mockAttendances.some((a) => a.userId === CURRENT_USER_ID && a.checkedAt.slice(0, 10) === today);
}

export async function listAttendeeIds(scheduleId: string): Promise<string[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('rsvps').select('user_id').eq('schedule_id', scheduleId).eq('status', 'yes');
    if (error) throw error;
    return (data ?? []).map((r) => r.user_id as string);
  }
  return mockRsvps.filter((r) => r.scheduleId === scheduleId && r.status === 'yes').map((r) => r.userId);
}

export async function listAttendeeIdsByScheduleId(): Promise<Map<string, string[]>> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('rsvps').select('schedule_id, user_id').eq('status', 'yes');
    if (error) throw error;
    const map = new Map<string, string[]>();
    (data ?? []).forEach((r) => {
      const list = map.get(r.schedule_id) ?? [];
      list.push(r.user_id);
      map.set(r.schedule_id, list);
    });
    return map;
  }
  const map = new Map<string, string[]>();
  mockRsvps
    .filter((r) => r.status === 'yes')
    .forEach((r) => {
      const list = map.get(r.scheduleId) ?? [];
      list.push(r.userId);
      map.set(r.scheduleId, list);
    });
  return map;
}

export async function listEarlyBirds(scheduleId: string): Promise<Attendance[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('attendances')
      .select('*')
      .eq('schedule_id', scheduleId)
      .order('checked_at')
      .limit(10);
    if (error) throw error;
    return camelizeDeep<Attendance[]>(data ?? []);
  }
  return mockAttendances
    .filter((a) => a.scheduleId === scheduleId)
    .sort((a, b) => a.checkedAt.localeCompare(b.checkedAt));
}
