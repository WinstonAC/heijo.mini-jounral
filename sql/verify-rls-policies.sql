-- ============================================
-- RLS Policy Verification Script
-- Run this in Supabase SQL Editor to check RLS status
-- ============================================

-- Check if RLS is enabled on journal_entries
SELECT 
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('journal_entries', 'prompts')
ORDER BY tablename;

-- Check existing policies on journal_entries
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'journal_entries'
ORDER BY policyname;

-- Check existing policies on prompts
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'prompts'
ORDER BY policyname;

