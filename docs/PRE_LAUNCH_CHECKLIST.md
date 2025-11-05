# Pre-Launch Checklist - External User Testing

This checklist ensures your app is ready for external users to test.

---

## ✅ Part 1: Vercel Environment Variables

### Required Variables
These must be set in Vercel for the app to work with authentication and cloud sync:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### How to Verify/Set in Vercel:

1. **Go to Vercel Dashboard**
   - Navigate to: https://vercel.com/dashboard
   - Select your project: `heijo-journal`

2. **Check Environment Variables**
   - Go to: **Settings** → **Environment Variables**
   - Verify both variables are present:
     - `NEXT_PUBLIC_SUPABASE_URL` should be your Supabase project URL (e.g., `https://lzeuvaankbnngfjxpycn.supabase.co`)
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` should be your Supabase anon key

3. **If Missing - Add Them**
   - Click **Add New**
   - Add `NEXT_PUBLIC_SUPABASE_URL` with value from Supabase Dashboard → Settings → API
   - Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` with value from Supabase Dashboard → Settings → API
   - Make sure to select **Production**, **Preview**, and **Development** environments

4. **Get Supabase Credentials** (if needed)
   - Go to: https://supabase.com/dashboard
   - Select your project
   - Navigate to: **Settings** → **API**
   - Copy:
     - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
     - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

5. **Redeploy After Adding**
   - After adding env vars, trigger a new deployment
   - Vercel → Deployments → Click "Redeploy" on latest deployment
   - Or push a new commit to trigger auto-deploy

---

## ✅ Part 2: Supabase Row Level Security (RLS) Policies

### Required Tables & Policies

#### 1. `journal_entries` Table

**RLS Status:**
- [ ] RLS is enabled on `journal_entries` table

**Required Policies:**
- [ ] **SELECT Policy**: Users can only read their own entries
- [ ] **INSERT Policy**: Users can only insert entries with their own `user_id`
- [ ] **UPDATE Policy**: Users can only update their own entries
- [ ] **DELETE Policy**: Users can only delete their own entries

#### 2. `prompts` Table

**RLS Status:**
- [ ] RLS is enabled on `prompts` table

**Required Policies:**
- [ ] **SELECT Policy**: Public read access for active prompts (`is_active = true`)

### How to Verify/Set in Supabase:

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Check RLS Status**
   - Go to: **Table Editor** → Select `journal_entries` table
   - Click on **Policies** tab
   - Verify RLS is **Enabled** (should see toggle ON)

3. **Verify Journal Entries Policies**

   **Check if policies exist:**
   - In **Policies** tab, you should see:
     - "Users can access own entries" (or similar)
     - "Users can insert own entries" (or similar)
     - "Users can update own entries" (or similar)
     - "Users can delete own entries" (or similar)

   **If policies are missing, create them:**

   Go to: **SQL Editor** → Run this SQL:

   ```sql
   -- Enable RLS if not already enabled
   ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

   -- Policy: Users can SELECT their own entries
   CREATE POLICY "Users can access own entries" ON journal_entries
     FOR ALL USING (auth.uid() = user_id);

   -- Policy: Users can INSERT their own entries
   CREATE POLICY "Users can insert own entries" ON journal_entries
     FOR INSERT WITH CHECK (auth.uid() = user_id);

   -- Policy: Users can UPDATE their own entries
   CREATE POLICY "Users can update own entries" ON journal_entries
     FOR UPDATE USING (auth.uid() = user_id);

   -- Policy: Users can DELETE their own entries
   CREATE POLICY "Users can delete own entries" ON journal_entries
     FOR DELETE USING (auth.uid() = user_id);
   ```

4. **Verify Prompts Policies**

   **Check if policy exists:**
   - Go to: **Table Editor** → Select `prompts` table → **Policies** tab
   - Should see: "Prompts are public" (or similar)

   **If policy is missing, create it:**

   ```sql
   -- Enable RLS if not already enabled
   ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

   -- Policy: Public read access for active prompts
   CREATE POLICY "Prompts are public" ON prompts
     FOR SELECT USING (is_active = true);
   ```

5. **Test RLS Policies** (Optional but recommended)

   **Test with a test user:**
   - Create a test account in Supabase → **Authentication** → **Users** → **Add user**
   - Sign in as that user in your app
   - Try to create an entry → Should work
   - Try to access another user's entry → Should fail (no access)

---

## ✅ Part 3: Database Schema Verification

### Required Tables

- [ ] `journal_entries` table exists with correct schema
- [ ] `prompts` table exists with correct schema

### Schema Check

**Go to Supabase Dashboard → SQL Editor → Run:**

```sql
-- Check journal_entries schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'journal_entries'
ORDER BY ordinal_position;

-- Check prompts schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'prompts'
ORDER BY ordinal_position;
```

**Expected `journal_entries` columns:**
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to auth.users)
- `created_at` (timestamp)
- `content` (text)
- `source` (text, check constraint: 'text' or 'voice')
- `tags` (text array)
- `sync_status` (text)
- `last_synced` (timestamp)
- `encrypted_data` (text, nullable)
- `created_at_local` (timestamp, nullable)

**Expected `prompts` columns:**
- `id` (uuid, primary key)
- `text` (text)
- `category` (text)
- `day_number` (integer)
- `created_at` (timestamp)
- `is_active` (boolean)

**If tables are missing, create them:**

```sql
-- Create journal_entries table
CREATE TABLE journal_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('text', 'voice')),
  tags TEXT[] DEFAULT '{}'::text[],
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'syncing', 'failed')),
  last_synced TIMESTAMP WITH TIME ZONE,
  encrypted_data TEXT,
  created_at_local TIMESTAMP WITH TIME ZONE
);

-- Create prompts table
CREATE TABLE prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  category TEXT NOT NULL,
  day_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- Create indexes for performance
CREATE INDEX idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX idx_journal_entries_created_at ON journal_entries(created_at DESC);
CREATE INDEX idx_journal_entries_sync_status ON journal_entries(sync_status);
CREATE INDEX idx_prompts_day_number ON prompts(day_number);
CREATE INDEX idx_prompts_active ON prompts(is_active) WHERE is_active = true;
```

---

## ✅ Part 4: Authentication Configuration

### Email Confirmation Settings

**Decision needed:** Do you want external users to confirm their email?

- [ ] **Option A**: Require email confirmation (more secure, standard)
  - Go to: Supabase Dashboard → **Authentication** → **Settings** → **Email Auth**
  - Ensure "Enable email confirmations" is **ON**
  - Users will receive confirmation email after signup

- [ ] **Option B**: Auto-confirm emails (easier for testing)
  - Go to: Supabase Dashboard → **Authentication** → **Settings** → **Email Auth**
  - Set "Enable email confirmations" to **OFF** OR
  - Set "Auto Confirm" to **ON**
  - Users can sign in immediately without email confirmation

**Recommendation:** For external testing, **Option B (Auto Confirm)** is easier for testers.

---

## ✅ Part 5: Capacity & Limits

### Supabase Plan Check

- [ ] Verify your Supabase plan can handle expected users
  - **Free tier**: ~500 users (limited)
  - **Pro tier**: Better for production
  - Check: Supabase Dashboard → **Settings** → **Usage**

### Vercel Plan Check

- [ ] Verify your Vercel plan can handle traffic
  - **Free tier**: Usually sufficient for testing
  - Check: Vercel Dashboard → **Usage**

---

## ✅ Part 6: Functional Testing

### Before Sharing with External Users

- [x] **Sign up flow works** ✅ COMPLETED
  - Go to: https://journal.heijo.io/login
  - Create a new account
  - Verify you can sign in
  - ✅ Added "Forgot password?" feature with password reset
  - ✅ Email confirmation configured and working

- [x] **Journal entry creation works** ✅ COMPLETED
  - Create a text entry
  - Create a voice entry (if browser supports)
  - Verify entries save and appear in list
  - ✅ Entries save to localStorage (free tier)
  - ✅ Entries sync to Supabase (premium tier)

- [x] **Data persistence works** ✅ COMPLETED
  - Create an entry
  - Refresh the page
  - Verify entry still exists
  - ✅ Fixed localStorage priority - entries always load from local first
  - ✅ History button always visible (shows empty state if no entries)

- [x] **Privacy controls work** ✅ COMPLETED
  - Go to: Settings → Export Your Data
  - ✅ Test export (CSV download - replaced JSON)
  - ✅ CSV format: Date, Time, Content, Tags (comma-separated), Source
  - ✅ Filename: `heijo-journal-YYYY-MM-DD.csv`
  - Test delete (verify data is removed)

- [ ] **Search & tags work** ⚠️ NEEDS VERIFICATION
  - Create entries with tags
  - Search for entries
  - Filter by tags

- [x] **Premium feature works** ✅ COMPLETED
  - ✅ Premium toggle in Settings
  - ✅ Upgrade modal (free for testing, payment API TODO)
  - ✅ Sync confirmation modal
  - ✅ Supabase sync gated behind premium status
  - ✅ Local Storage and Premium are mutually exclusive

---

## ✅ Part 7: Documentation Ready

- [ ] **Tester onboarding doc is ready**
  - File: `docs/TESTER_ONBOARDING.md`
  - Contains: URL, sign-in steps, what to test

- [ ] **Testing checklist is ready**
  - File: `docs/TESTING_READINESS.md`
  - Contains: Browser support, test scenarios, QA matrix

- [ ] **Feedback channels are set up**
  - GitHub Issues: https://github.com/WinstonAC/heijo.mini-jounral/issues
  - Support email: support@heijo.io

---

## 🎯 Final Checklist Summary

**Critical (Must Have):**
- [ ] Vercel env vars set (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- [ ] RLS policies enabled on `journal_entries` and `prompts`
- [ ] Database tables exist with correct schema
- [ ] Authentication works (sign up/sign in)

**Important (Should Have):**
- [ ] Email confirmation configured (auto-confirm recommended for testing)
- [ ] Functional testing completed
- [ ] Documentation ready to share

**Nice to Have:**
- [ ] Capacity limits verified
- [ ] Test accounts created (optional, only if needed)

---

## 🚀 Once Complete

1. **Share with testers:**
   - URL: `https://journal.heijo.io`
   - Docs: `docs/TESTER_ONBOARDING.md`
   - Feedback: GitHub Issues or support@heijo.io

2. **Monitor deployment:**
   - Check Vercel logs for errors
   - Monitor Supabase usage
   - Watch for user feedback

3. **Iterate based on feedback:**
   - Fix bugs reported
   - Update documentation as needed
   - Plan next testing phase

---

**Last Updated:** 2025-11-05
**Status:** Part 6 In Progress - Export/History fixes completed, Premium feature added

### Recent Updates (2025-11-05):
- ✅ Fixed CSV export (replaced JSON)
- ✅ Fixed History button visibility (always visible)
- ✅ Fixed localStorage priority (local-first approach)
- ✅ Added Premium Cloud Sync feature
- ✅ Added password reset functionality
- ✅ Removed "E" export button from Composer
- ✅ Build tested and passing

