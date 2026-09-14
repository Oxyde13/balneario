import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { PROFILE_EMAILS, isConfigured, supabase } from '../lib/supabase';
import type { Role } from '../types/db';

export type SignInError = 'wrongPin' | 'rateLimited' | 'network' | 'notConfigured';

interface AuthState {
  session: Session | null;
  role: Role | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (profile: Role, pin: string) => Promise<SignInError | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

function roleFromSession(session: Session | null): Role | null {
  if (!session) return null;
  // Anything that is not explicitly admin is treated as read-only.
  return session.user.app_metadata?.role === 'admin' ? 'admin' : 'team';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      userIdRef.current = data.session?.user.id ?? null;
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      const nextId = next?.user.id ?? null;
      if (userIdRef.current !== null && userIdRef.current !== nextId) {
        // Different profile (or logged out): drop every cached answer.
        queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'photo-url' });
      }
      userIdRef.current = nextId;
      setSession(next);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [queryClient]);

  const value = useMemo<AuthState>(() => {
    const role = roleFromSession(session);
    return {
      session,
      role,
      isAdmin: role === 'admin',
      loading,
      async signIn(profile, pin) {
        if (!isConfigured || !PROFILE_EMAILS[profile]) return 'notConfigured';
        const { error } = await supabase.auth.signInWithPassword({ email: PROFILE_EMAILS[profile], password: pin });
        if (!error) return null;
        if (error.status === 429) return 'rateLimited';
        if (error.status === 400 || error.status === 401 || error.status === 422) return 'wrongPin';
        return 'network';
      },
      async signOut() {
        await supabase.auth.signOut();
        queryClient.clear();
      },
    };
  }, [session, loading, queryClient]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
