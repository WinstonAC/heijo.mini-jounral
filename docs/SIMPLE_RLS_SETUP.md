# Simple RLS Setup Guide - Step by Step

## Step 1: Check What You Have (2 minutes)

1. In Supabase SQL Editor, copy and paste this entire script:

```sql
-- Check RLS status
SELECT 
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('journal_entries', 'prompts')
ORDER BY tablename;

-- Check policies
SELECT tablename, policyname FROM pg_policies 
WHERE tablename IN ('journal_entries', 'prompts')
ORDER BY tablename, policyname;
```

2. Click **Run** (or press ⌘ + Enter)

3. Look at the results:
   - **First result**: Shows if RLS is ON (true) or OFF (false)
   - **Second result**: Shows what policies exist (might be empty)

---

## Step 2: If You See Problems, Fix Them

### If RLS is OFF or policies are missing:

1. Copy and paste this ENTIRE script into SQL Editor:

```sql
-- Enable RLS
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

-- Create policies for journal_entries
DROP POLICY IF EXISTS "Users can access own entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can insert own entries" ON journal_entries;

CREATE POLICY "Users can access own entries" ON journal_entries
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entries" ON journal_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy for prompts
DROP POLICY IF EXISTS "Prompts are public" ON prompts;

CREATE POLICY "Prompts are public" ON prompts
  FOR SELECT USING (is_active = true);
```

2. Click **Run**

3. Done! ✅

---

## Step 3: Verify It Worked

Run Step 1 again - you should now see:
- RLS Enabled = `true` for both tables
- Policies listed for both tables

---

## That's It!

If you're still confused, just:
1. Run the Step 2 script (the big one)
2. It will set everything up correctly
3. You're done!

