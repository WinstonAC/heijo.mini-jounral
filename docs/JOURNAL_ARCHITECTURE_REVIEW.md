# Heijō Journaling System - Complete Technical Architecture Review

**Date:** January 2025  
**Purpose:** Comprehensive technical overview for Gemini Live integration planning  
**Status:** Production-ready v1.0.0, no AI integration currently

---

## Executive Summary

Heijō Mini-Journal is a **privacy-first journaling application** built with Next.js 14, React 18, and Supabase. The system uses a **hybrid storage architecture** (localStorage + Supabase) with **zero AI integration** currently. All journaling operations are handled client-side via React components and Supabase client SDK.

**Key Finding:** No API routes exist. All data operations go through Supabase client directly from the browser. No AI/GPT/Gemini integration is present.

---

## 1. Frontend Components

### Core Journaling Components

#### `components/Composer.tsx` (680 lines)
**Primary entry creation interface**

- **Purpose:** Main journaling input component with voice and text support
- **State Management:** 
  - `content` - current entry text
  - `selectedTags` - array of tag strings
  - `source` - 'text' | 'voice'
  - `isAutoSaving` - auto-save status
  - `lastSaved` - timestamp of last save
- **Features:**
  - Auto-save after 7 seconds of inactivity (if content > 10 chars)
  - Manual save via Cmd/Ctrl+S or Cmd/Ctrl+Enter
  - Voice transcription via `MicButton` component
  - Daily prompt display and selection
  - Tag picker integration
  - Export current entry to .txt file
  - Keyboard shortcuts (S=Save, E=Export, H=History)
- **Auto-save Logic:** 
  ```typescript
  // Lines 101-119: Auto-save after 7 seconds
  useEffect(() => {
    if (content.trim() && content.length > 10) {
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleAutoSave();
      }, 7000);
    }
  }, [content, handleAutoSave]);
  ```
- **Save Flow:** Calls `onSave` prop (provided by `app/journal/page.tsx`) which uses `storage.saveEntry()`

#### `components/EntryList.tsx` (129 lines)
**Entry display and grouping**

- **Purpose:** Renders journal entries grouped by date
- **Props:** `entries: JournalEntry[]`
- **Features:**
  - Groups entries by date (Today, Yesterday, or formatted date)
  - Shows time, source (text/voice), sync status icons
  - Displays tags (max 3 visible)
  - Click handler to navigate to entry detail
- **State:** None (presentational component)

#### `components/EntryDetail.tsx` (89 lines)
**Individual entry view**

- **Purpose:** Full entry detail page component
- **Props:** `entry: JournalEntry`, `onDelete?: (id: string) => void`
- **Features:**
  - Full entry content display
  - Tag display
  - Delete functionality
  - Source indicator (text/voice)
  - Timestamp display

#### `components/RecentEntriesDrawer.tsx` (421 lines)
**Slide-out entry history panel**

- **Purpose:** Side drawer showing recent entries
- **Props:** `entries`, `onEntryClick`, `onExportAll`
- **Features:**
  - Groups entries by "Today" and "Earlier"
  - Expandable entry cards
  - Sync status indicators
  - Export all functionality
  - Mobile-responsive drawer

#### `components/MicButton.tsx`
**Voice recording interface**

- **Purpose:** Wraps `lib/voiceToText.ts` for voice input
- **Props:** `onTranscript: (text: string, isFinal?: boolean) => void`, `onError: (error: string) => void`
- **Features:**
  - Visual recording state (pulse animation)
  - Browser Web Speech API integration
  - Real-time transcription streaming
  - Error handling for microphone permissions

#### `components/PromptChip.tsx` (93 lines)
**Daily prompt selector**

- **Purpose:** Displays daily journaling prompts
- **Props:** `userId: string`
- **State:** `'initial' | 'showing' | 'accepted' | 'skipped'`
- **Features:**
  - Y/N prompt question interface
  - Prompts from `lib/pickPrompt.ts`
  - Daily reset logic (localStorage-based)
  - Prompt history tracking

#### `components/TagPicker.tsx`
**Tag management interface**

- **Purpose:** Add/remove tags from entries
- **Props:** `selectedTags: string[]`, `onTagsChange: (tags: string[]) => void`
- **Features:**
  - Create new tags
  - Remove existing tags
  - Visual tag chips

### Supporting Components

- `components/HeaderClock.tsx` - Date/time display
- `components/OnboardingModal.tsx` - First-time user experience
- `components/Settings.tsx` - Privacy settings and export
- `components/AnalyticsDashboard.tsx` - Usage analytics (v1.0.0 feature)
- `components/PrivacySettings.tsx` - GDPR compliance controls

---

## 2. API Routes

### **CRITICAL FINDING: NO API ROUTES EXIST**

**All data operations are client-side only.**

The application uses **zero Next.js API routes**. All journaling operations go through:

1. **Supabase Client SDK** (`lib/supabaseClient.ts`) - Direct browser-to-Supabase calls
2. **Local Storage** (`lib/store.ts`) - Browser localStorage for offline fallback

### Supabase Client Integration

**File:** `lib/supabaseClient.ts`

```typescript
// Direct Supabase client initialization
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
```

**Authentication Flow:**
- Magic link: `supabase.auth.signInWithOtp({ email })`
- Password: `supabase.auth.signInWithPassword({ email, password })`
- Session management: `supabase.auth.getSession()`

**Database Operations:**
- Insert: `supabase.from('journal_entries').insert([entry]).select().single()`
- Query: `supabase.from('journal_entries').select('*').eq('user_id', userId).order('created_at', { ascending: false })`
- Delete: `supabase.from('journal_entries').delete().eq('id', id)`
- Sync: `supabase.from('journal_entries').insert([localEntries])` for offline sync

**No server-side API layer exists.** All operations are direct client-to-Supabase.

---

## 3. Front-End State Flow

### State Management Architecture

**Pattern:** React `useState` hooks in page components, no global state management

#### `app/journal/page.tsx` - Main Journal Page

**State:**
```typescript
const [entries, setEntries] = useState<JournalEntry[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [showOnboarding, setShowOnboarding] = useState(false);
const [showSettings, setShowSettings] = useState(false);
const [selectedPrompt, setSelectedPrompt] = useState<{ id: string; text: string } | null>(null);
const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
```

**Auth State:** `useAuth()` hook from `lib/auth.tsx` (React Context)

**Data Flow:**
1. Component mounts → `loadEntries()` called
2. `storage.getEntries()` → fetches from Supabase or localStorage
3. `setEntries(loadedEntries)` → updates UI
4. User saves entry → `handleSave()` → `storage.saveEntry()` → updates `entries` state
5. Auto-sync on mount: `storage.syncLocalEntries()` → syncs offline entries

#### `components/Composer.tsx` - Entry Creation

**State:**
```typescript
const [content, setContent] = useState('');
const [selectedTags, setSelectedTags] = useState<string[]>([]);
const [source, setSource] = useState<'text' | 'voice'>('text');
const [isAutoSaving, setIsAutoSaving] = useState(false);
const [lastSaved, setLastSaved] = useState<Date | null>(null);
```

**Auto-save Trigger:**
- Content changes → `useEffect` watches `content`
- After 7 seconds of no changes → `handleAutoSave()` → `onSave()` prop → parent `handleSave()`

#### State Persistence

**No Redux/Zustand/Context for journaling state.** Only:
- React component state (in-memory)
- localStorage (via `lib/store.ts` LocalStorage class)
- Supabase database (via `lib/store.ts` SupabaseStorage class)

---

## 4. Local Storage Behavior

### Storage Architecture

**File:** `lib/store.ts` (345 lines)

**Pattern:** Hybrid storage with three backends

#### 1. `HybridStorage` (Primary)
**Orchestrates localStorage + Supabase**

```typescript
class HybridStorage implements StorageBackend {
  private localStorage = new LocalStorage();
  private supabaseStorage = supabase && isSupabaseConfigured() ? new SupabaseStorage() : null;
  
  async saveEntry(entry): Promise<JournalEntry> {
    // 1. Always save to localStorage first (immediate feedback)
    const localEntry = await this.localStorage.saveEntry(entry);
    
    // 2. Try Supabase sync (if configured and user authenticated)
    if (supabase && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('journal_entries')
          .insert([{ ...entry, user_id: user.id }])
          .select()
          .single();
        // Update localStorage with synced version
        return data;
      } catch (error) {
        // Keep local only on failure
        return localEntry;
      }
    }
    return localEntry;
  }
}
```

#### 2. `LocalStorage` (Offline Fallback)
**Browser localStorage implementation**

**Storage Key:** `'heijo-journal-entries'`

**Format:** JSON array of `JournalEntry[]`

```typescript
async saveEntry(entry): Promise<JournalEntry> {
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
```

**Conflict Resolution:**
- No explicit conflict resolution for localStorage
- Entries stored as array, newest first
- Supabase sync checks for duplicate keys (error code '23505')

#### 3. `SupabaseStorage` (Cloud Sync)
**Direct Supabase operations**

**Authentication Required:** All operations check `supabase.auth.getUser()`

**User Isolation:** Row Level Security (RLS) ensures `user_id` matches authenticated user

### Sync Status Tracking

**Entry States:**
- `'synced'` - Successfully synced to Supabase
- `'syncing'` - Currently being synced
- `'local_only'` - Not yet synced (offline)
- `'failed'` - Sync attempt failed
- `'error'` - Error state

### Offline Draft Handling

**Behavior:**
1. User creates entry offline → saved to localStorage with `sync_status: 'local_only'`
2. On app boot → `storage.syncLocalEntries()` called (line 53 in `app/journal/page.tsx`)
3. Sync process:
   ```typescript
   // lib/store.ts lines 152-201
   async syncLocalEntries(): Promise<void> {
     const localEntries = await this.localStorage.getEntries();
     const localOnlyEntries = localEntries.filter(entry => entry.sync_status === 'local_only');
     
     for (const entry of localOnlyEntries) {
       const { data, error } = await supabase
         .from('journal_entries')
         .insert([{ ...entry, user_id: user.id }])
         .select()
         .single();
       
       if (!error && data) {
         // Update localStorage with synced version
         await this.localStorage.saveEntry({ ...data, sync_status: 'synced' });
       }
     }
   }
   ```

**Conflict Resolution:**
- **No merge strategy** - Last write wins
- Duplicate key errors (23505) are logged but entry remains local
- No version tracking or timestamp comparison for conflicts

### Secure Storage (Encrypted)

**File:** `lib/secureStorage.ts` (400 lines)

**Optional encryption layer using AES-GCM**

**Storage:** IndexedDB (`HeijoSecureStorage` database)

**Features:**
- Device-specific encryption keys
- 50MB storage limit
- Auto-delete after 365 days (configurable)
- Used when GDPR consent given (`gdprManager.hasDataStorageConsent()`)

**Not currently used in main flow** - `storage.saveEntry()` uses `HybridStorage` by default.

### Serialization/Deserialization

**Format:** JSON

**Keys:**
- `'heijo-journal-entries'` - Main entries array
- `'heijo-prompt-shown'` - Daily prompt tracking
- `'heijo-prompt-reset'` - Prompt reset date
- `'heijo-has-visited'` - Onboarding flag
- `'heijo_session'` - Supabase session backup

**No custom serialization** - Standard `JSON.stringify()` / `JSON.parse()`

---

## 5. AI Integration

### **CRITICAL FINDING: NO AI INTEGRATION EXISTS**

**Status:** Completely absent. No GPT, Gemini, or any AI features.

**Search Results:**
- Zero references to GPT, Gemini, OpenAI, or AI APIs
- No AI-related API routes
- No AI service integrations
- No AI prompt templates or AI-generated content

### Current Voice Recognition

**File:** `lib/voiceToText.ts` (574 lines)

**Technology:** Browser-native Web Speech API

**Implementation:**
```typescript
// Lines 126-143: Web Speech API initialization
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
this.recognition = new SpeechRecognition();
this.recognition.continuous = true;
this.recognition.interimResults = true;
```

**Features:**
- Real-time transcription streaming
- Voice Activity Detection (VAD) via Web Audio API
- Latency tracking (<300ms first partial, <800ms final)
- Offline-capable (no network required)

**No cloud AI transcription** - purely browser-based.

### AI-Ready Infrastructure

**None exists.** To integrate Gemini Live, you would need to:

1. **Create API routes** (currently none exist)
2. **Set up streaming infrastructure** (Server-Sent Events or WebSocket)
3. **Implement session management** for AI conversations
4. **Add database schema** for AI sessions

### Stubbed/TODO Items

**No AI-related TODOs found.** The codebase is focused on local-first journaling with no AI roadmap indicators.

---

## 6. Database Schema

### Supabase Tables

#### `journal_entries`
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
  encrypted_data text,
  created_at_local timestamp with time zone
);
```

**Missing for Gemini Live:**
- No `ai_sessions` table
- No `ai_messages` table
- No `ai_conversation_id` field in `journal_entries`

#### `prompts`
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

**Note:** Prompts are currently hardcoded in `lib/pickPrompt.ts` (10 prompts), not using this table.

---

## 7. Gemini Live Integration Recommendations

### Required Infrastructure

#### 1. Create API Routes

**Recommended:** `app/api/ai/` directory

**Routes needed:**
- `app/api/ai/live-session-init/route.ts` - Initialize Gemini Live session
- `app/api/ai/live-session/route.ts` - Handle streaming messages
- `app/api/ai/stream/route.ts` - Server-Sent Events endpoint for real-time streaming

**Example structure:**
```typescript
// app/api/ai/live-session-init/route.ts
export async function POST(request: Request) {
  const { userId, entryId } = await request.json();
  
  // Initialize Gemini Live session
  const session = await initializeGeminiLiveSession(userId, entryId);
  
  return Response.json({ sessionId: session.id });
}
```

#### 2. Database Schema Additions

**New table: `ai_sessions`**
```sql
create table ai_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  journal_entry_id uuid references journal_entries(id) on delete cascade,
  gemini_session_id text not null,
  status text default 'active' check (status in ('active', 'ended', 'expired')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  ended_at timestamp with time zone
);

create index idx_ai_sessions_user_id on ai_sessions(user_id);
create index idx_ai_sessions_entry_id on ai_sessions(journal_entry_id);
```

**New table: `ai_messages`**
```sql
create table ai_messages (
  id uuid default gen_random_uuid() primary key,
  ai_session_id uuid references ai_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_ai_messages_session_id on ai_messages(ai_session_id);
```

**Add to `journal_entries`:**
```sql
alter table journal_entries 
  add column ai_session_id uuid references ai_sessions(id);
```

#### 3. Frontend Integration Points

**Component: `components/AILiveSession.tsx` (NEW)**
- Real-time streaming UI
- Server-Sent Events client
- Message history display
- Session controls (start/stop/end)

**Integration with `Composer.tsx`:**
- Add "Start AI Session" button
- Show streaming indicator
- Display AI responses inline
- Option to append AI conversation to entry

**State Management:**
```typescript
// In Composer.tsx or new AILiveSession component
const [aiSession, setAiSession] = useState<AISession | null>(null);
const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
const [isStreaming, setIsStreaming] = useState(false);
```

#### 4. Streaming Implementation

**Server-Sent Events (SSE) Pattern:**
```typescript
// app/api/ai/stream/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  
  const stream = new ReadableStream({
    async start(controller) {
      // Connect to Gemini Live API
      const geminiStream = await getGeminiLiveStream(sessionId);
      
      geminiStream.on('data', (chunk) => {
        controller.enqueue(`data: ${JSON.stringify(chunk)}\n\n`);
      });
      
      geminiStream.on('end', () => {
        controller.close();
      });
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
```

**Frontend SSE Client:**
```typescript
// In AILiveSession component
const eventSource = new EventSource(`/api/ai/stream?sessionId=${sessionId}`);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  setAiMessages(prev => [...prev, data]);
  setIsStreaming(false);
};

eventSource.onerror = () => {
  eventSource.close();
  setIsStreaming(false);
};
```

#### 5. Authentication & Rate Limiting

**Existing:** `lib/rateLimiter.ts` (100 requests/hour per device)

**Enhance for AI:**
- Separate rate limit for AI sessions (e.g., 10 sessions/hour)
- Per-session message limits
- Session duration limits (e.g., 30 minutes max)

**Authentication:**
- Use existing `useAuth()` hook
- Verify `user.id` in API routes
- Pass `user.id` to Gemini Live API calls

#### 6. Data Flow

**Recommended Flow:**
1. User starts journal entry in `Composer`
2. Clicks "Start AI Session" → calls `POST /api/ai/live-session-init`
3. API creates `ai_sessions` record, initializes Gemini Live session
4. Frontend opens SSE connection to `/api/ai/stream?sessionId=xxx`
5. User types/speaks → sent to API → forwarded to Gemini Live
6. AI responses streamed back via SSE → displayed in real-time
7. User ends session → `POST /api/ai/live-session/end` → saves conversation
8. Option to append AI conversation to journal entry

#### 7. Error Handling

**Graceful Degradation:**
- If Gemini Live unavailable → fall back to regular journaling
- Show user-friendly error messages
- Retry logic for transient failures
- Session timeout handling

#### 8. Privacy Considerations

**Current:** Privacy-first architecture

**For AI:**
- User consent required before starting AI session
- Clear indication when data is sent to external AI service
- Option to delete AI sessions
- Encryption for AI session data (if storing sensitive content)

---

## 8. Testing Readiness

### Current State

**✅ Ready:**
- Core journaling functionality (create, read, delete)
- Voice transcription (Web Speech API)
- Offline storage and sync
- Authentication and user isolation
- Data export (JSON)

**❌ Missing for Gemini Live:**
- API route infrastructure
- Streaming/SSE support
- AI session management
- Database schema for AI data
- Error handling for AI failures

### Testing Checklist (Post-Integration)

1. **API Routes:**
   - [ ] `/api/ai/live-session-init` creates session
   - [ ] `/api/ai/stream` streams responses correctly
   - [ ] `/api/ai/live-session/end` saves conversation
   - [ ] Authentication required for all routes
   - [ ] Rate limiting enforced

2. **Frontend:**
   - [ ] AILiveSession component renders correctly
   - [ ] SSE connection establishes and maintains
   - [ ] Messages stream in real-time
   - [ ] Error states handled gracefully
   - [ ] Session controls work (start/stop/end)

3. **Database:**
   - [ ] `ai_sessions` records created correctly
   - [ ] `ai_messages` linked to sessions
   - [ ] RLS policies enforce user isolation
   - [ ] Foreign key constraints work

4. **Integration:**
   - [ ] AI session can be appended to journal entry
   - [ ] Voice input works with AI streaming
   - [ ] Offline mode degrades gracefully
   - [ ] Rate limits prevent abuse

---

## 9. Summary

### Architecture Overview

**Frontend Components:**
- `Composer.tsx` - Entry creation with auto-save
- `EntryList.tsx` - Entry display and grouping
- `EntryDetail.tsx` - Individual entry view
- `RecentEntriesDrawer.tsx` - Side drawer history
- `MicButton.tsx` - Voice recording interface
- `PromptChip.tsx` - Daily prompt selector
- `TagPicker.tsx` - Tag management

**API Routes:**
- **NONE** - All operations via Supabase client SDK

**Local Storage Behavior:**
- `heijo-journal-entries` - Main entries array (JSON)
- Hybrid storage: localStorage → Supabase sync
- Auto-sync on app boot for offline entries
- Conflict resolution: Last-write-wins (no merge strategy)

**AI Integration:**
- **CURRENT STATUS:** Not implemented
- **Voice Recognition:** Browser Web Speech API (no cloud AI)
- **AI Features:** None (no GPT, Gemini, or AI services)

### Gemini Live Integration Path

**Required Work:**
1. Create API routes (`app/api/ai/*`)
2. Add database schema (`ai_sessions`, `ai_messages`)
3. Build streaming infrastructure (Server-Sent Events)
4. Create `AILiveSession` component
5. Integrate with `Composer.tsx`
6. Add authentication and rate limiting
7. Implement error handling and graceful degradation

**Recommended Priority:**
1. Database schema (foundation)
2. API routes (backend infrastructure)
3. SSE streaming (real-time communication)
4. Frontend component (user interface)
5. Integration with existing components (UX polish)

**Estimated Complexity:**
- Database schema: **Low** (straightforward SQL)
- API routes: **Medium** (SSE streaming requires careful implementation)
- Frontend component: **Medium** (real-time UI updates)
- Integration: **Low-Medium** (well-defined component boundaries)

---

**End of Report**

