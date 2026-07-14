import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getAuthUserId } from '../lib/session';
import { Attendance, Crew, Rsvp, RsvpStatus, Schedule } from '../types';
import { CURRENT_USER_ID, mockAttendances, mockRsvps, mockSchedules } from './mockStore';

export async function listSchedules(): Promise<Schedule[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('schedules').select('*').order('start_at');
    if (error) throw error;
    return data as Schedule[];
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
    return (data as Rsvp) ?? undefined;
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
    if (error) throw error;
    return data as Attendance;
  }
  const attendance: Attendance = {
    id: `a-${Date.now()}`,
    userId: CURRENT_USER_ID,
    scheduleId,
    checkedAt: new Date().toISOString(),
  };
  mockAttendances.push(attendance);
  return attendance;
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
    return data as Attendance[];
  }
  return mockAttendances
    .filter((a) => a.scheduleId === scheduleId)
    .sort((a, b) => a.checkedAt.localeCompare(b.checkedAt));
}
