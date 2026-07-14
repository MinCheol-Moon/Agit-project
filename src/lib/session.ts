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
