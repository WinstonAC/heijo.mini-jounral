-- ============================================
-- RLS Policy Test Script
-- Run this AFTER setting up policies to verify they work
-- ============================================
-- 
-- NOTE: This script requires you to be authenticated as a test user
-- Run this in Supabase SQL Editor after creating a test user
-- ============================================

-- Test 1: Check if you can see your own entries
-- (Replace 'your-user-id-here' with an actual user_id from auth.users)
SELECT 
  id,
  user_id,
  content,
  created_at
FROM journal_entries
WHERE user_id = auth.uid()
LIMIT 5;

-- Test 2: Try to see another user's entries (should return 0 rows)
-- This should fail if RLS is working correctly
SELECT 
  id,
  user_id,
  content
FROM journal_entries
WHERE user_id != auth.uid()
LIMIT 5;

-- Test 3: Check if you can see active prompts (should work)
SELECT 
  id,
  text,
  category,
  is_active
FROM prompts
WHERE is_active = true
LIMIT 5;

-- Test 4: Check if you can see inactive prompts (should return 0 rows)
SELECT 
  id,
  text,
  category,
  is_active
FROM prompts
WHERE is_active = false
LIMIT 5;

