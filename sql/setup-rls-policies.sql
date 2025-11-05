-- ============================================
-- RLS Policy Setup Script
-- Run this in Supabase SQL Editor to create all required RLS policies
-- ============================================

-- ============================================
-- 1. JOURNAL_ENTRIES TABLE
-- ============================================

-- Enable RLS on journal_entries (safe to run if already enabled)
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can access own entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can insert own entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can update own entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can delete own entries" ON journal_entries;

-- Policy: Users can SELECT, UPDATE, DELETE their own entries
-- This uses FOR ALL which covers SELECT, UPDATE, DELETE operations
CREATE POLICY "Users can access own entries" ON journal_entries
  FOR ALL 
  USING (auth.uid() = user_id);

-- Policy: Users can INSERT entries with their own user_id
CREATE POLICY "Users can insert own entries" ON journal_entries
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Alternative: If you prefer separate policies for each operation, use these instead:
-- (Comment out the FOR ALL policy above if using these)

-- CREATE POLICY "Users can select own entries" ON journal_entries
--   FOR SELECT 
--   USING (auth.uid() = user_id);

-- CREATE POLICY "Users can update own entries" ON journal_entries
--   FOR UPDATE 
--   USING (auth.uid() = user_id);

-- CREATE POLICY "Users can delete own entries" ON journal_entries
--   FOR DELETE 
--   USING (auth.uid() = user_id);

-- ============================================
-- 2. PROMPTS TABLE
-- ============================================

-- Enable RLS on prompts (safe to run if already enabled)
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Prompts are public" ON prompts;

-- Policy: Public read access for active prompts only
CREATE POLICY "Prompts are public" ON prompts
  FOR SELECT 
  USING (is_active = true);

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify policies were created
SELECT 
  tablename,
  policyname,
  cmd as "Operation"
FROM pg_policies 
WHERE tablename IN ('journal_entries', 'prompts')
ORDER BY tablename, policyname;

