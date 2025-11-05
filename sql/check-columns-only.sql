-- Quick check: Just the columns
-- Run this if you didn't see the column results

-- Check journal_entries columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'journal_entries'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check prompts columns  
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'prompts'
  AND table_schema = 'public'
ORDER BY ordinal_position;

