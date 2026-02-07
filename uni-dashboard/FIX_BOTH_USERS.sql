-- ========================================
-- FINAL FIX - Assign BOTH users to batches
-- ========================================

-- Check who has issues
SELECT 
  'Current users:' as info,
  p.id,
  p.index_number,
  p.batch_id,
  b.batch_number
FROM profiles p
LEFT JOIN batches b ON b.id = p.batch_id
WHERE p.index_number IN ('235550X', '245550X')
ORDER BY p.index_number;

-- Assign 235550X to Batch 23
UPDATE profiles 
SET batch_id = (SELECT id FROM batches WHERE batch_number = 23 LIMIT 1)
WHERE index_number = '235550X';

-- Assign 245550X to Batch 24  
UPDATE profiles 
SET batch_id = (SELECT id FROM batches WHERE batch_number = 24 LIMIT 1)
WHERE index_number = '245550X';

-- Verify both are fixed
SELECT 
  'After fix - both users:' as info,
  p.id,
  p.index_number,
  p.batch_id,
  b.batch_number,
  b.batch_code
FROM profiles p
JOIN batches b ON b.id = p.batch_id
WHERE p.index_number IN ('235550X', '245550X')
ORDER BY p.index_number;

SELECT '
✅ FIX APPLIED!

235550X → Batch 23
245550X → Batch 24

Now:
1. Logout from browser (important!)
2. Login again
3. 500 error should be gone
4. Save Changes will work

' as status;
