import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Public project values baked in as a fallback so any host (Cloudflare Pages,
// Netlify, …) builds a working app without needing build-env vars configured.
// The anon key is the public client key Supabase's security model expects to
// ship in the browser bundle - RLS is the real access boundary. Env vars still
// override these when set.
const FALLBACK_SUPABASE_URL = 'https://hweqzqdipwtawydtekkl.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3ZXF6cWRpcHd0YXd5ZHRla2tsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NjIyNjEsImV4cCI6MjA5MjEzODI2MX0.5S-mztcNgIWmhmosPaQroWUH0ED8oLwZTSsBjeZgwTg';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
