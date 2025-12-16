import { createClient } from '@supabase/supabase-js'
import { debugLog, warnLog } from './logger'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  const configured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== '' && supabaseAnonKey !== '')
  if (!configured) {
    warnLog('Supabase not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local')
  }
  return configured
}

// Browser client - create with error handling and session persistence
export const supabase = (() => {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase configuration missing:', { supabaseUrl, supabaseAnonKey: supabaseAnonKey ? 'present' : 'missing' });
      return null;
    }
    
    // Log current origin for debugging CORS issues
    if (typeof window !== 'undefined') {
      debugLog('[Supabase] Client initialized with origin:', window.location.origin);
      debugLog('[Supabase] Supabase URL:', supabaseUrl);
    }
    
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'heijo_auth',
      },
    });
  } catch (error) {
    console.error('Failed to create Supabase client:', error);
    return null;
  }
})()

// Server client (for API routes)
export const createServerClient = () => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured')
  }
  return createClient(supabaseUrl, supabaseAnonKey)
}
