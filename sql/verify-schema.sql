-- ============================================
-- Database Schema Verification Script
-- Run this to check if your tables match what the app expects
-- ============================================

-- ============================================
-- 1. CHECK JOURNAL_ENTRIES TABLE SCHEMA
-- ============================================

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'journal_entries'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================
-- 2. CHECK PROMPTS TABLE SCHEMA
-- ============================================

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'prompts'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================
-- 3. CHECK INDEXES (for performance)
-- ============================================

SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('journal_entries', 'prompts')
ORDER BY tablename, indexname;

-- ============================================
-- 4. CHECK FOREIGN KEYS
-- ============================================

SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('journal_entries', 'prompts');

