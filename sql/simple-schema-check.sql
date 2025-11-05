-- ============================================
-- SIMPLE Schema Check - Run this one query at a time
-- ============================================

-- STEP 1: Check journal_entries columns
-- Copy and run ONLY this first query:
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'journal_entries'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- STEP 2: After you see the results, come back and run this:
-- Check prompts columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'prompts'
  AND table_schema = 'public'
ORDER BY ordinal_position;

