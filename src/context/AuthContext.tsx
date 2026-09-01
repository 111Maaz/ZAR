import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { AdminProfile, UserRole } from '@/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: AdminProfile | null;
  loading: boolean;
  mfaRequired: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(false);

  const loadProfile = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle();

    if (error) {
      console.error('Error loading profile:', error);
      return null;
    }
    return data as AdminProfile | null;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await loadProfile(user.id);
    setProfile(p);
  }, [user, loadProfile]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        loadProfile(session.user.id).then((p) => {
          if (!mounted) return;
          setProfile(p);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);

        (async () => {
          if (newSession?.user) {
            const p = await loadProfile(newSession.user.id);
            if (!mounted) return;
            setProfile(p);
          } else {
            setProfile(null);
          }
          setLoading(false);
        })();
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { error: error.message };

      // Check if MFA is required
      if (data?.session) {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totpFactor = factors?.totp?.[0];
        if (totpFactor && totpFactor.status === 'verified') {
          // User has MFA — sign out this session and require MFA challenge
          await supabase.auth.signOut({ scope: 'global' });
          setMfaRequired(true);
          setSession(null);
          setUser(null);
          setProfile(null);
          return { error: null };
        }
      }

      return { error: null };
    },
    []
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut({ scope: 'global' });
    setSession(null);
    setUser(null);
    setProfile(null);
    setMfaRequired(false);
  }, []);

  const value: AuthContextValue = {
    session,
    user,
    profile,
    loading,
    mfaRequired,
    signIn,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useIsAdmin(): boolean {
  const { profile } = useAuth();
  return profile?.role === 'admin';
}

export function useRole(): UserRole | null {
  const { profile } = useAuth();
  return profile?.role ?? null;
}
