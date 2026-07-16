import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getAuthUserId } from '../lib/session';
import { camelizeDeep } from '../lib/caseMap';
import { ScheduleComment } from '../types';
import { CURRENT_USER_ID, mockScheduleComments } from './mockStore';

export async function listScheduleComments(scheduleId: string): Promise<ScheduleComment[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('schedule_comments')
      .select('*')
      .eq('schedule_id', scheduleId)
      .order('created_at');
    if (error) throw error;
    return camelizeDeep<ScheduleComment[]>(data ?? []);
  }
  return mockScheduleComments
    .filter((c) => c.scheduleId === scheduleId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function addScheduleComment(scheduleId: string, body: string, parentId?: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('schedule_comments').insert({
      schedule_id: scheduleId,
      user_id: await getAuthUserId(),
      parent_id: parentId ?? null,
      body,
    });
    if (error) throw error;
    return;
  }
  mockScheduleComments.push({
    id: `sc-${Date.now()}`,
    scheduleId,
    userId: CURRENT_USER_ID,
    parentId: parentId ?? null,
    body,
    createdAt: new Date().toISOString(),
  });
}

export async function deleteScheduleComment(commentId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('schedule_comments').delete().eq('id', commentId).select('id');
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('삭제 권한이 없거나 서버 설정(마이그레이션)이 아직 반영되지 않았어요.');
    return;
  }
  // Also drop replies hanging off the deleted comment, matching the DB's cascade.
  const ids = new Set([commentId, ...mockScheduleComments.filter((c) => c.parentId === commentId).map((c) => c.id)]);
  for (let i = mockScheduleComments.length - 1; i >= 0; i--) {
    if (ids.has(mockScheduleComments[i].id)) mockScheduleComments.splice(i, 1);
  }
}
