# Database Architecture

## Overview

Heijō Mini-Journal uses a hybrid storage approach with **Supabase** as the primary database and **localStorage** as a fallback for offline functionality. This architecture ensures data persistence while maintaining privacy-first principles.

## Database Schema

### Supabase Tables

#### `journal_entries`
Primary table for storing journal entries with user isolation.

```sql
create table journal_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  content text not null,
  source text not null check (source in ('text', 'voice')),
  tags text[] default '{}'::text[],
  sync_status text default 'synced' check (sync_status in ('synced', 'syncing', 'failed')),
  last_synced timestamp with time zone,
  encrypted_data text, -- For additional encrypted fields
  created_at_local timestamp with time zone -- Local timestamp for offline sync
);
```

#### `prompts`
Table for storing daily journal prompts.

```sql
create table prompts (
  id uuid default gen_random_uuid() primary key,
  text text not null,
  category text not null,
  day_number integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_active boolean default true
);
```

### Indexes

```sql
-- Performance indexes
create index idx_journal_entries_user_id on journal_entries(user_id);
create index idx_journal_entries_created_at on journal_entries(created_at desc);
create index idx_journal_entries_sync_status on journal_entries(sync_status);
create index idx_prompts_day_number on prompts(day_number);
create index idx_prompts_active on prompts(is_active) where is_active = true;
```

## Data Management Patterns

### Hybrid Storage Strategy

The app implements a **hybrid storage pattern** that provides:

1. **Immediate Local Storage**: All entries saved to localStorage first for instant feedback
2. **Background Sync**: Automatic sync to Supabase when available
3. **Offline Resilience**: Full functionality without internet connection
4. **Conflict Resolution**: Last-write-wins with timestamp comparison

### Storage Backend Classes

#### `HybridStorage`
Main storage class that orchestrates between local and remote storage.

```typescript
class HybridStorage implements StorageBackend {
  private localStorage = new LocalStorage();
  private supabaseStorage = new SupabaseStorage();
  
  async saveEntry(entry: JournalEntry): Promise<JournalEntry> {
    // 1. Save to localStorage immediately
    const localEntry = await this.localStorage.saveEntry(entry);
    
    // 2. Try to sync to Supabase
    if (supabase && isSupabaseConfigured()) {
      try {
        const syncedEntry = await this.supabaseStorage.saveEntry(entry);
        return syncedEntry;
      } catch (error) {
        console.warn('Sync failed, keeping local only:', error);
      }
    }
    
    return localEntry;
  }
}
```

#### `LocalStorage`
Handles browser localStorage with encryption support.

```typescript
class LocalStorage implements StorageBackend {
  private getStorageKey() {
    return 'heijo-journal-entries';
  }
  
  async saveEntry(entry: JournalEntry): Promise<JournalEntry> {
    const entries = await this.getEntries();
    const updatedEntries = [entry, ...entries];
    localStorage.setItem(this.getStorageKey(), JSON.stringify(updatedEntries));
    return entry;
  }
}
```

#### `SupabaseStorage`
Handles Supabase operations with user authentication.

```typescript
class SupabaseStorage implements StorageBackend {
  async saveEntry(entry: JournalEntry): Promise<JournalEntry> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { data, error } = await supabase
      .from('journal_entries')
      .insert([{ ...entry, user_id: user.id }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}
```

## Data Encryption

### AES-GCM Encryption

All sensitive data is encrypted using **AES-GCM** with device-specific keys:

```typescript
// lib/encryption.ts
export class EncryptionManager {
  private async getDeviceKey(): Promise<CryptoKey> {
    // Generate or retrieve device-specific key
    const keyData = await this.getOrCreateDeviceKey();
    return await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  async encrypt(data: string): Promise<string> {
    const key = await this.getDeviceKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(data)
    );
    return JSON.stringify({
      data: Array.from(new Uint8Array(encrypted)),
      iv: Array.from(iv)
    });
  }
}
```

## Data Synchronization

### Sync Status Tracking

Each entry tracks its synchronization status:

- `synced`: Successfully synced to Supabase
- `syncing`: Currently being synced
- `failed`: Sync failed, stored locally only

### Conflict Resolution

When syncing local entries to Supabase:

1. **Timestamp Comparison**: Use `created_at_local` for conflict resolution
2. **Last-Write-Wins**: Newer entries overwrite older ones
3. **Merge Strategy**: Combine tags arrays, preserve all data

### Offline-First Approach

The app is designed to work completely offline:

1. **Voice Recognition**: Uses browser Web Speech API (no network required)
2. **Data Storage**: All data stored locally with encryption
3. **UI Functionality**: Full app functionality without internet
4. **Background Sync**: Automatic sync when connection restored

## Performance Optimizations

### Lazy Loading
- Entries loaded on-demand
- Pagination for large datasets
- Virtual scrolling for entry lists

### Caching Strategy
- Local storage cache for immediate access
- Supabase cache for offline functionality
- IndexedDB for encrypted data storage

### Query Optimization
- Indexed queries for fast retrieval
- Batch operations for multiple entries
- Connection pooling for Supabase

## Security Considerations

### Data Isolation
- User-specific data queries with RLS (Row Level Security)
- No cross-user data access
- Encrypted local storage

### Privacy Protection
- No data transmitted without user consent
- Local-first architecture
- GDPR compliance with data export/deletion

### Backup and Recovery
- Automatic local backups
- Data export functionality
- Secure data deletion

## Migration and Schema Changes

### Version Management
- Database version tracking
- Automatic schema migrations
- Backward compatibility

### Data Migration
- Safe migration scripts
- Data validation
- Rollback capabilities

## Monitoring and Analytics

### Performance Metrics
- Query performance tracking
- Sync success rates
- Storage usage monitoring

### Error Handling
- Graceful degradation
- Error logging and reporting
- User-friendly error messages

## API Integration

### Supabase Client
- Real-time subscriptions
- Authentication integration
- Row Level Security (RLS)

### Local Storage API
- IndexedDB for large datasets
- localStorage for configuration
- Web Crypto API for encryption

This database architecture ensures **privacy-first**, **offline-capable**, and **high-performance** data management for the Heijō Mini-Journal application.
