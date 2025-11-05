-- ============================================
-- Cleanup Duplicate RLS Policies
-- This removes duplicate/redundant policies and keeps only the essential ones
-- ============================================

-- ============================================
-- 1. CLEAN UP JOURNAL_ENTRIES POLICIES
-- ============================================

-- Keep these policies (don't drop):
-- - "Users can access own entries" (ALL operations)
-- - "Users can insert own entries" (INSERT)

-- Remove duplicate/redundant policies:
DROP POLICY IF EXISTS "Users can only see their own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "journal_entries_insert" ON journal_entries;
DROP POLICY IF EXISTS "journal_entries_select" ON journal_entries;
DROP POLICY IF EXISTS "Users can update own entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can delete own entries" ON journal_entries;

-- ============================================
-- 2. CLEAN UP PROMPTS POLICIES
-- ============================================

-- Keep this policy (don't drop):
-- - "Prompts are public" (SELECT)

-- Remove duplicate policy:
DROP POLICY IF EXISTS "prompts_read_all" ON prompts;

-- ============================================
-- 3. VERIFY CLEANUP
-- ============================================

-- Show remaining policies
SELECT 
  tablename,
  policyname,
  cmd as "Operation"
FROM pg_policies 
WHERE tablename IN ('journal_entries', 'prompts')
ORDER BY tablename, policyname;

-- Expected result:
-- journal_entries: "Users can access own entries" (ALL)
-- journal_entries: "Users can insert own entries" (INSERT)
-- prompts: "Prompts are public" (SELECT)
-- Total: 3 policies

