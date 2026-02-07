-- ========================================
-- DIAGNOSTIC: Check if SQL migrations actually worked
-- ========================================

-- 1. Check if user 235550X has batch assigned
SELECT 
  '1. User 235550X batch assignment:' as test,
  p.index_number,
  p.batch_id,
  b.batch_number,
  b.batch_code,
  CASE 
    WHEN p.batch_id IS NULL THEN '❌ FAILED - No batch_id'
    WHEN b.batch_number = 23 THEN '✅ CORRECT - Batch 23'
    ELSE '⚠️  WRONG BATCH - Should be 23'
  END as status
FROM profiles p
LEFT JOIN batches b ON b.id = p.batch_id
WHERE p.index_number = '235550X';

-- 2. Check if Batch 23 exists in batches table
SELECT 
  '2. Batch 23 exists:' as test,
  id,
  batch_number,
  batch_code,
  current_semester,
  CASE 
    WHEN id IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM batches
WHERE batch_number = 23;

-- 3. Check RLS policies for past_paper_structures
SELECT 
  '3. RLS policy for past_paper_structures:' as test,
  policyname,
  cmd,
  CASE 
    WHEN policyname = 'Edit all viewable batch papers' THEN '✅ CORRECT'
    ELSE '⚠️  OLD POLICY'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'past_paper_structures'
ORDER BY policyname;

-- 4. Check module exists
SELECT 
  '4. Module c5218df6-dbca-42df-be8d-45c33dda37af:' as test,
  id,
  code,
  name,
  year,
  '✅ EXISTS' as status
FROM modules
WHERE id = 'c5218df6-dbca-42df-be8d-45c33dda37af'::uuid;

-- 5. Test get_viewable_batches function for batch 23
SELECT 
  '5. Viewable batches for B23:' as test,
  get_viewable_batches(23) as batches,
  CASE 
    WHEN 23 = ANY(get_viewable_batches(23)) THEN '✅ CONTAINS 23'
    ELSE '❌ MISSING 23'
  END as status;

-- SUMMARY
SELECT '
========================================
DIAGNOSTIC RESULTS
========================================

Run all queries above and check for ❌ or ⚠️ 

If ANY test shows ❌:
→ The SQL migration did NOT work
→ Re-run the failed migration

If ALL tests show ✅:
→ Database is OK
→ Problem is in frontend/cache
→ Do hard refresh (Cmd+Shift+R)
→ Then logout/login

' as summary;
