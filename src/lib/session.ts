import { isSupabaseConfigured, supabase } from './supabase';

let ensured: Promise<void> | null = null;

// Every device gets a silent Supabase Anonymous auth session on first launch so
// auth.uid() exists for RLS, without adding an email/password login screen the
// spec never asked for (membership is real-name + phone, gated by PIN, not by login).
// Requires "Anonymous Sign-Ins" to be enabled in Supabase Auth settings.
export async function ensureSession(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  if (!ensured) {
    ensured = (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
      }
    })();
  }
  return ensured;
}

// The authenticated user's id, i.e. the value auth.uid() resolves to in RLS
// policies. Callers must already be inside an `isSupabaseConfigured && supabase`
// branch — this throws otherwise, since there is no auth id in mock mode.
export async function getAuthUserId(): Promise<string> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is not configured');
  await ensureSession();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('No authenticated user');
  return data.user.id;
}
