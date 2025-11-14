import { supabase, isSupabaseConfigured } from './supabaseClient'

export interface JournalEntry {
  id: string;
  created_at: string;
  content: string;
  source: 'text' | 'voice';
  tags: string[];
  user_id?: string;
  sync_status: 'synced' | 'local_only' | 'syncing' | 'error' | 'failed';
  last_synced?: string;
}

export interface StorageBackend {
  saveEntry(entry: Omit<JournalEntry, 'id' | 'sync_status' | 'last_synced'> & { sync_status?: JournalEntry['sync_status']; last_synced?: string; id?: string }): Promise<JournalEntry>;
  getEntries(): Promise<JournalEntry[]>;
  getEntry(id: string): Promise<JournalEntry | null>;
  deleteEntry(id: string): Promise<void>;
  exportEntries(): Promise<JournalEntry[]>;
  syncLocalEntries(): Promise<void>;
}

// Hybrid storage with Supabase + localStorage fallback
class HybridStorage implements StorageBackend {
  private localStorage = new LocalStorage();
  private supabaseStorage = supabase && isSupabaseConfigured() ? new SupabaseStorage() : null;

  async saveEntry(entry: Omit<JournalEntry, 'id' | 'sync_status' | 'last_synced'>): Promise<JournalEntry> {
    const newEntry: JournalEntry = {
      ...entry,
      id: crypto.randomUUID(),
      sync_status: 'syncing',
      last_synced: undefined
    };

    // Always save to localStorage first for immediate feedback
    const localEntry = await this.localStorage.saveEntry(entry);

    // Try to save to Supabase only if user has premium and is authenticated
    if (supabase && isSupabaseConfigured()) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Check premium status
          const premium = user.user_metadata?.premium;
          if (premium === true) {
            const { data, error } = await supabase
              .from('journal_entries')
              .insert([{ 
                ...entry, 
                user_id: user.id,
                sync_status: 'synced',
                last_synced: new Date().toISOString()
              }])
              .select()
              .single();
            
            if (!error && data) {
              // Update localStorage with synced version (use existing ID to update, not create new)
              await this.localStorage.saveEntry({
                ...data,
                id: data.id, // Include ID so it updates instead of creating new
                sync_status: 'synced',
                last_synced: new Date().toISOString()
              });
              return data;
            } else if (error) {
              // Check for specific conflict errors
              if (error.code === '23505' || error.message.includes('duplicate key')) {
                console.warn('Supabase conflict detected (duplicate key), keeping local entry:', error);
              } else {
                console.warn('Supabase insert failed:', error);
              }
            }
          }
        }
      } catch (error) {
        console.warn('Failed to sync to Supabase, keeping local only:', error);
      }
    }

    // Return local entry if Supabase fails or not premium
    return localEntry;
  }

  async getEntries(): Promise<JournalEntry[]> {
    // Always prioritize localStorage first (local-first approach)
    const localEntries = await this.localStorage.getEntries();
    
    // Get current user ID for filtering
    let currentUserId: string | undefined;
    try {
      if (supabase && isSupabaseConfigured()) {
        const { data: { user } } = await supabase.auth.getUser();
        currentUserId = user?.id;
      }
    } catch (error) {
      console.warn('Failed to get current user ID:', error);
    }
    
    // Filter local entries to only those belonging to current user (safety check)
    const filteredLocalEntries = currentUserId
      ? localEntries.filter(entry => !entry.user_id || entry.user_id === currentUserId)
      : localEntries;

    // Try to get from Supabase only if user has premium and is authenticated
    try {
      if (supabase && isSupabaseConfigured() && currentUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Check premium status
          const premium = user.user_metadata?.premium;
          if (premium === true) {
            const { data, error } = await supabase
              .from('journal_entries')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false });
            
            if (!error && data && data.length > 0) {
              // Merge Supabase and localStorage entries
              // Combine both sources, removing duplicates by id
              const mergedEntries = new Map<string, JournalEntry>();
              
              // Add local entries first (prioritize local)
              filteredLocalEntries.forEach(entry => {
                // Double-check user_id matches
                if (!entry.user_id || entry.user_id === currentUserId) {
                  mergedEntries.set(entry.id, entry);
                }
              });
              
              // Add Supabase entries (will overwrite local if same id, but prefer local)
              // Filter to ensure user_id matches
              data
                .filter(entry => entry.user_id === currentUserId)
                .forEach(entry => {
                  if (!mergedEntries.has(entry.id)) {
                    mergedEntries.set(entry.id, entry);
                  }
                });
              
              // Sync local-only entries to Supabase
              await this.syncLocalEntries();
              
              return Array.from(mergedEntries.values()).sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load from Supabase, using localStorage:', error);
    }

    // Return filtered localStorage entries (always available)
    return filteredLocalEntries;
  }

  async getEntry(id: string): Promise<JournalEntry | null> {
    try {
      if (supabase && isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('journal_entries')
          .select('*')
          .eq('id', id)
          .single();
        
        if (!error && data) return data;
      }
    } catch (error) {
      console.warn('Failed to get entry from Supabase, trying localStorage:', error);
    }

    return this.localStorage.getEntry(id);
  }

  async deleteEntry(id: string): Promise<void> {
    try {
      if (supabase && isSupabaseConfigured()) {
        const { error } = await supabase
          .from('journal_entries')
          .delete()
          .eq('id', id);
        
        if (!error) {
          // Also delete from localStorage
          await this.localStorage.deleteEntry(id);
          return;
        }
      }
    } catch (error) {
      console.warn('Failed to delete from Supabase, deleting locally:', error);
    }

    // Fallback to localStorage
    await this.localStorage.deleteEntry(id);
  }

  async exportEntries(): Promise<JournalEntry[]> {
    return this.getEntries();
  }

  async syncLocalEntries(): Promise<void> {
    try {
      if (!supabase || !isSupabaseConfigured()) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('No authenticated user for sync');
        return;
      }

      // Check premium status
      const premium = user.user_metadata?.premium;
      if (premium !== true) {
        console.log('User does not have premium, skipping Supabase sync');
        return;
      }

      const localEntries = await this.localStorage.getEntries();
      const localOnlyEntries = localEntries.filter(entry => entry.sync_status === 'local_only');

      console.log(`Syncing ${localOnlyEntries.length} local entries for user ${user.id}`);

      for (const entry of localOnlyEntries) {
        try {
          // Ensure entry has proper user_id before syncing
          const entryToSync = {
            ...entry,
            user_id: user.id,
            sync_status: 'synced' as const,
            last_synced: new Date().toISOString()
          };

          const { data, error } = await supabase
            .from('journal_entries')
            .insert([entryToSync])
            .select()
            .single();
          
          if (!error && data) {
            // Update localStorage with synced version (use existing ID to update, not create new)
            await this.localStorage.saveEntry({
              ...data,
              id: data.id, // Include ID so it updates instead of creating new
              sync_status: 'synced',
              last_synced: new Date().toISOString()
            });
            console.log(`Successfully synced entry ${entry.id}`);
          } else {
            console.warn(`Failed to sync entry ${entry.id}:`, error);
          }
        } catch (error) {
          console.warn('Failed to sync entry:', entry.id, error);
        }
      }
    } catch (error) {
      console.warn('Failed to sync local entries:', error);
    }
  }
}

// Supabase backend (for direct use)
class SupabaseStorage implements StorageBackend {
  async saveEntry(entry: Omit<JournalEntry, 'id' | 'sync_status' | 'last_synced'>): Promise<JournalEntry> {
    if (!supabase) throw new Error('Supabase not configured');
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { data, error } = await supabase
      .from('journal_entries')
      .insert([{ 
        ...entry, 
        user_id: user.id,
        sync_status: 'synced',
        last_synced: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getEntries(): Promise<JournalEntry[]> {
    if (!supabase) throw new Error('Supabase not configured');
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async getEntry(id: string): Promise<JournalEntry | null> {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return null;
    return data;
  }

  async deleteEntry(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  async exportEntries(): Promise<JournalEntry[]> {
    return this.getEntries();
  }

  async syncLocalEntries(): Promise<void> {
    // No-op for direct Supabase storage
  }
}

// Local storage backend
class LocalStorage implements StorageBackend {
  private getStorageKey(userId?: string): string {
    // Scope localStorage by userId to prevent cross-account data leakage
    if (userId) {
      return `heijo-journal-entries:${userId}`;
    }
    // Fallback for anonymous/legacy entries (will be migrated on first save with userId)
    return 'heijo-journal-entries';
  }
  
  private async getCurrentUserId(): Promise<string | undefined> {
    try {
      if (supabase && isSupabaseConfigured()) {
        const { data: { user } } = await supabase.auth.getUser();
        return user?.id;
      }
    } catch (error) {
      console.warn('Failed to get current user ID:', error);
    }
    return undefined;
  }

  async saveEntry(entry: Omit<JournalEntry, 'id' | 'sync_status' | 'last_synced'> & { id?: string; sync_status?: JournalEntry['sync_status']; last_synced?: string }): Promise<JournalEntry> {
    // Get userId from entry or current user
    const userId = entry.user_id || await this.getCurrentUserId();
    const storageKey = this.getStorageKey(userId);
    const existing = this.getStoredEntries(userId);
    
    // If entry has an ID, check if it already exists and update it
    if (entry.id) {
      const existingIndex = existing.findIndex(e => e.id === entry.id);
      if (existingIndex !== -1) {
        // Update existing entry
        const updatedEntry: JournalEntry = {
          ...existing[existingIndex],
          ...entry,
          id: entry.id,
          user_id: userId || entry.user_id,
          sync_status: entry.sync_status || existing[existingIndex].sync_status,
          last_synced: entry.last_synced || existing[existingIndex].last_synced
        };
        existing[existingIndex] = updatedEntry;
        localStorage.setItem(storageKey, JSON.stringify(existing));
        return updatedEntry;
      }
    }
    
    // Create new entry
    const newEntry: JournalEntry = {
      ...entry,
      id: entry.id || crypto.randomUUID(),
      user_id: userId || entry.user_id,
      sync_status: entry.sync_status || 'local_only',
      last_synced: entry.last_synced || undefined
    };
    
    const updated = [newEntry, ...existing];
    localStorage.setItem(storageKey, JSON.stringify(updated));
    
    return newEntry;
  }

  async getEntries(): Promise<JournalEntry[]> {
    const userId = await this.getCurrentUserId();
    return this.getStoredEntries(userId);
  }

  async getEntry(id: string): Promise<JournalEntry | null> {
    const userId = await this.getCurrentUserId();
    const entries = this.getStoredEntries(userId);
    return entries.find(entry => entry.id === id) || null;
  }

  async deleteEntry(id: string): Promise<void> {
    const userId = await this.getCurrentUserId();
    const storageKey = this.getStorageKey(userId);
    const entries = this.getStoredEntries(userId);
    const updated = entries.filter(entry => entry.id !== id);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  }

  async exportEntries(): Promise<JournalEntry[]> {
    const userId = await this.getCurrentUserId();
    return this.getStoredEntries(userId);
  }

  async syncLocalEntries(): Promise<void> {
    // No-op for localStorage only
  }

  private getStoredEntries(userId?: string): JournalEntry[] {
    if (typeof window === 'undefined') return [];
    
    const storageKey = this.getStorageKey(userId);
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      // If no scoped entries found and we have a userId, try legacy key for migration
      if (userId) {
        const legacyKey = 'heijo-journal-entries';
        const legacyStored = localStorage.getItem(legacyKey);
        if (legacyStored) {
          try {
            const legacyEntries = JSON.parse(legacyStored);
            // Filter legacy entries to only those belonging to this user (STRICT: must have matching user_id)
            const userEntries = legacyEntries.filter((entry: any) => entry.user_id === userId);
            if (userEntries.length > 0) {
              // Migrate to scoped key
              localStorage.setItem(storageKey, JSON.stringify(userEntries));
              // Clean up legacy key after successful migration (only if all entries migrated)
              const remainingEntries = legacyEntries.filter((entry: any) => entry.user_id && entry.user_id !== userId);
              if (remainingEntries.length === 0) {
                // No other users' entries remain, safe to delete legacy key
                localStorage.removeItem(legacyKey);
              } else {
                // Other users' entries remain, keep legacy key but remove migrated entries
                localStorage.setItem(legacyKey, JSON.stringify(remainingEntries));
              }
            }
            return userEntries.map((entry: any) => ({
              ...entry,
              sync_status: entry.sync_status || 'local_only',
              last_synced: entry.last_synced || undefined
            }));
          } catch (e) {
            console.warn('Failed to parse legacy entries:', e);
          }
        }
      }
      return [];
    }
    
    try {
      const entries = JSON.parse(stored);
      // STRICT FILTERING: Only show entries that belong to this specific user
      // Do NOT show entries without user_id (they could be from other accounts)
      const userEntries = userId 
        ? entries.filter((entry: any) => entry.user_id === userId)
        : entries.filter((entry: any) => !entry.user_id); // Only show anonymous entries if no userId
      
      // Ensure all entries have sync_status field for backward compatibility
      return userEntries.map((entry: any) => ({
        ...entry,
        user_id: entry.user_id || userId,
        sync_status: entry.sync_status || 'local_only',
        last_synced: entry.last_synced || undefined
      }));
    } catch (e) {
      console.warn('Failed to parse stored entries:', e);
      return [];
    }
  }
}

// Storage factory
export function createStorage(): StorageBackend {
  return new HybridStorage();
}

// Default storage instance
export const storage = createStorage();
