'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes and persist sessions
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Persist session to localStorage to prevent session loss
      if (session) {
        localStorage.setItem('heijo_session', JSON.stringify(session));
      } else {
        localStorage.removeItem('heijo_session');
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      // Provide clearer error messages for CORS issues
      if (error && (error.message?.includes('CORS') || error.message?.includes('fetch') || error.message?.includes('Failed to fetch'))) {
        return { 
          error: new Error('CORS Error: Please check Supabase dashboard settings. Ensure "https://journal.heijo.io" is added to Site URL and Redirect URLs in Authentication → URL Configuration.') 
        };
      }
      
      return { error };
    } catch (err: any) {
      const errorMessage = err?.message || String(err);
      if (errorMessage.includes('CORS') || errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch') || errorMessage.includes('Access-Control')) {
        return { 
          error: new Error('CORS Error: Please check Supabase dashboard settings. Ensure "https://journal.heijo.io" is added to Site URL and Redirect URLs in Authentication → URL Configuration.') 
        };
      }
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signInWithMagicLink = async (email: string) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/journal`,
      },
    });
    return { error };
  };

  const signOut = async () => {
    if (!supabase) return;
    
    // Clear user-specific localStorage data on sign out
    // Entries remain intentionally because the key is already scoped as
    // `heijo-journal-entries:${userId}`, so there is no cross-account leakage
    try {
      const session = await supabase.auth.getSession();
      const userId = session.data.session?.user?.id;
      
      if (userId) {
        // Keep journal entries so they rehydrate on next login; scoped keys prevent leakage
        // Clear analytics data (if user-specific)
        localStorage.removeItem('heijo_analytics');
        // Clear notification preferences (if user-specific)
        localStorage.removeItem('heijo_notification_preferences');
      }
      
      // Clear session
      localStorage.removeItem('heijo_session');
    } catch (error) {
      console.warn('Error clearing localStorage on sign out:', error);
    }
    
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/reset-password`,
    });
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithMagicLink,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
