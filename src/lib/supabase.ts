import { createClient } from '@supabase/supabase-js';
import type { Role } from '../types/db';

const configuredUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
// A relative value (e.g. "/") means "same origin as the app": that is how the
// local development backend is served, through the Vite proxy.
const url = configuredUrl?.startsWith('/') ? window.location.origin : configuredUrl;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isConfigured = Boolean(url && anonKey);

export const supabase = createClient(url ?? 'http://localhost:54321', anonKey ?? 'missing-anon-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'balneario-auth',
  },
});

export const PROFILE_EMAILS: Record<Role, string> = {
  admin: (import.meta.env.VITE_ADMIN_EMAIL as string | undefined) ?? '',
  team: (import.meta.env.VITE_TEAM_EMAIL as string | undefined) ?? '',
};

export const APP_URL = ((import.meta.env.VITE_APP_URL as string | undefined) ?? window.location.origin).replace(/\/$/, '');

export const PHOTO_BUCKET = 'member-photos';

/** Throws the Supabase error so TanStack Query sees a failure. */
export function unwrap<T>(result: { data: T | null; error: { message: string; code?: string } | null }): T {
  if (result.error) throw result.error;
  return result.data as T;
}
