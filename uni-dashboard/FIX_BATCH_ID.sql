-- ========================================
-- FIX: Assign batch_id to user 235550X
-- This fixes the 500 error on /api/modules/[moduleId]/batches
-- ========================================

-- Check current status
SELECT 
  'Current status:' as info,
  p.id,
  p.index_number,
  p.batch_id,
  b.batch_number,
  b.batch_code
FROM profiles p
LEFT JOIN batches b ON b.id = p.batch_id
WHERE p.index_number IN ('235550X', '245550X');

-- Assign 235550X to Batch 23
UPDATE profiles 
SET batch_id = (SELECT id FROM batches WHERE batch_number = 23 LIMIT 1)
WHERE index_number = '235550X';

-- Verify fix
SELECT 
  'After fix:' as info,
  p.id,
  p.index_number,
  p.batch_id,
  b.batch_number,
  b.batch_code
FROM profiles p
JOIN batches b ON b.id = p.batch_id
WHERE p.index_number = '235550X';

-- Expected: batch_id should be populated, batch_number = 23

SELECT '
✅ FIXED!

After running this:
1. Refresh your browser
2. The 500 error should be gone
3. Save Changes will work now

' as status;
