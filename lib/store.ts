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
  saveEntry(entry: Omit<JournalEntry, 'id' | 'sync_status' | 'last_synced'> & { sync_status?: 'local_only' | 'synced' }): Promise<JournalEntry>;
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

    // Try to save to Supabase only if configured
    if (supabase && isSupabaseConfigured()) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
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
            // Update localStorage with synced version
            await this.localStorage.saveEntry({
              ...data,
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
      } catch (error) {
        console.warn('Failed to sync to Supabase, keeping local only:', error);
      }
    }

    // Return local entry if Supabase fails
    return localEntry;
  }

  async getEntries(): Promise<JournalEntry[]> {
    try {
      // Try to get from Supabase first
      if (supabase && isSupabaseConfigured()) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('journal_entries')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          
          if (!error && data) {
            // Merge with local entries and sync
            await this.syncLocalEntries();
            return data;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load from Supabase, using localStorage:', error);
    }

    // Fallback to localStorage
    return this.localStorage.getEntries();
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
            // Update localStorage with synced version
            await this.localStorage.saveEntry({
              ...data,
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
  private getStorageKey() {
    return 'heijo-journal-entries';
  }

  async saveEntry(entry: Omit<JournalEntry, 'id' | 'sync_status' | 'last_synced'>): Promise<JournalEntry> {
    const newEntry: JournalEntry = {
      ...entry,
      id: crypto.randomUUID(),
      sync_status: 'local_only',
      last_synced: undefined
    };
    
    const existing = this.getStoredEntries();
    const updated = [newEntry, ...existing];
    localStorage.setItem(this.getStorageKey(), JSON.stringify(updated));
    
    return newEntry;
  }

  async getEntries(): Promise<JournalEntry[]> {
    return this.getStoredEntries();
  }

  async getEntry(id: string): Promise<JournalEntry | null> {
    const entries = this.getStoredEntries();
    return entries.find(entry => entry.id === id) || null;
  }

  async deleteEntry(id: string): Promise<void> {
    const entries = this.getStoredEntries();
    const updated = entries.filter(entry => entry.id !== id);
    localStorage.setItem(this.getStorageKey(), JSON.stringify(updated));
  }

  async exportEntries(): Promise<JournalEntry[]> {
    return this.getStoredEntries();
  }

  async syncLocalEntries(): Promise<void> {
    // No-op for localStorage only
  }

  private getStoredEntries(): JournalEntry[] {
    if (typeof window === 'undefined') return [];
    
    const stored = localStorage.getItem(this.getStorageKey());
    if (!stored) return [];
    
    const entries = JSON.parse(stored);
    // Ensure all entries have sync_status field for backward compatibility
    return entries.map((entry: any) => ({
      ...entry,
      sync_status: entry.sync_status || 'local_only',
      last_synced: entry.last_synced || undefined
    }));
  }
}

// Storage factory
export function createStorage(): StorageBackend {
  return new HybridStorage();
}

// Default storage instance
export const storage = createStorage();
