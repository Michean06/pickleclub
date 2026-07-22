'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  role: 'player' | 'staff' | 'admin';
  player_id: string | null;
  skill_level: string;
  credits: number;
  games_played: number;
  wins: number;
  losses: number;
  rating: number;
  court_hours: number;
  current_streak: number;
  longest_streak: number;
  is_active: boolean;
  member_since: string;
}

interface AuthContextType {
  user: any;
  session: any;
  profile: UserProfile | null;
  loading: boolean;
  profileError: string | null;
  signUp: (email: string, password: string, metadata?: any) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  getCurrentUser: () => Promise<any>;
  isEmailVerified: () => boolean;
  getUserProfile: () => Promise<UserProfile | null>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const RETRY_DELAYS = [500, 1500, 3000];

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchProfile = useCallback(
    async (userId: string, attempt = 0): Promise<void> => {
      try {
        setProfileError(null);
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          if (attempt < RETRY_DELAYS.length) {
            // Retry with exponential backoff
            await new Promise((res) => setTimeout(res, RETRY_DELAYS[attempt]));
            return fetchProfile(userId, attempt + 1);
          }
          console.error('[AuthContext] Profile fetch failed after retries:', error.message);
          setProfileError('Could not load your profile. Please refresh.');
          return;
        }

        if (data) {
          setProfile(data as UserProfile);
          setProfileError(null);
        }
      } catch (err: any) {
        if (attempt < RETRY_DELAYS.length) {
          await new Promise((res) => setTimeout(res, RETRY_DELAYS[attempt]));
          return fetchProfile(userId, attempt + 1);
        }
        console.error('[AuthContext] Unexpected profile fetch error:', err?.message);
        setProfileError('Could not load your profile. Please refresh.');
      }
    },
    [supabase],
  );

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      if (error) {
        console.error('[AuthContext] getSession error:', error.message);
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) {
          fetchProfile(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setProfileError(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signUp = async (email: string, password: string, metadata: any = {}) => {
    const redirectTo = process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
      : `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: metadata?.fullName || '',
          avatar_url: metadata?.avatarUrl || '',
          role: metadata?.role || 'player',
          skill_level: metadata?.skillLevel || 'beginner',
        },
        emailRedirectTo: redirectTo,
      },
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
    setProfileError(null);
  };

  const getCurrentUser = async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  };

  const isEmailVerified = () => {
    return user?.email_confirmed_at !== null && user?.email_confirmed_at !== undefined;
  };

  const getUserProfile = async (): Promise<UserProfile | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) throw error;
    return data as UserProfile;
  };

  const refreshProfile = async () => {
    if (user) {
      setProfileError(null);
      await fetchProfile(user.id);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    profileError,
    signUp,
    signIn,
    signOut,
    getCurrentUser,
    isEmailVerified,
    getUserProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
