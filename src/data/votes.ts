import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { Vote } from '../types';
import { CURRENT_USER_ID, mockVotes } from './mockStore';

export async function listVotes(): Promise<Vote[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('votes').select('*, options:vote_options(*)');
    if (error) throw error;
    return data as unknown as Vote[];
  }
  return mockVotes;
}

export async function createVote(input: { title: string; deadline: string; scope: string; options: string[] }): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('votes')
      .insert({ title: input.title, deadline: input.deadline, scope: input.scope })
      .select()
      .single();
    if (error) throw error;
    const rows = input.options.map((label) => ({ vote_id: data.id, label }));
    const { error: optError } = await supabase.from('vote_options').insert(rows);
    if (optError) throw optError;
    return;
  }
  const voteId = `v-${Date.now()}`;
  mockVotes.push({
    id: voteId,
    title: input.title,
    deadline: input.deadline,
    scope: input.scope,
    options: input.options.map((label, i) => ({ id: `${voteId}-o${i}`, voteId, label, count: 0 })),
  });
}

export async function respond(voteId: string, optionId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('vote_responses')
      .upsert({ vote_id: voteId, option_id: optionId, user_id: CURRENT_USER_ID }, { onConflict: 'vote_id,user_id' });
    if (error) throw error;
    return;
  }
  const vote = mockVotes.find((v) => v.id === voteId);
  const option = vote?.options.find((o) => o.id === optionId);
  if (option) option.count += 1;
}
