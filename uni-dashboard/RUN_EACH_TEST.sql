-- ========================================
-- RUN EACH QUERY ONE AT A TIME
-- Copy and run queries 1 through 5 separately
-- ========================================

-- === QUERY 1: User batch assignment ===
SELECT 
  '1. User 235550X batch' as test,
  p.index_number,
  p.batch_id,
  b.batch_number,
  CASE 
    WHEN p.batch_id IS NULL THEN '❌ NO BATCH'
    WHEN b.batch_number = 23 THEN '✅ CORRECT'
    ELSE '⚠️ WRONG BATCH'
  END as status
FROM profiles p
LEFT JOIN batches b ON b.id = p.batch_id
WHERE p.index_number = '235550X';

-- === QUERY 2: Batch 23 exists ===
SELECT 
  '2. Batch 23' as test,
  batch_number,
  batch_code,
  '✅ EXISTS' as status
FROM batches
WHERE batch_number = 23;

-- === QUERY 3: RLS policies ===
SELECT 
  '3. RLS policy' as test,
  policyname,
  CASE 
    WHEN policyname = 'Edit all viewable batch papers' THEN '✅ NEW'
    ELSE '⚠️ OLD'
  END as status
FROM pg_policies
WHERE tablename = 'past_paper_structures'
LIMIT 1;

-- === QUERY 4: Module exists ===
SELECT 
  '4. Module' as test,
  code,
  name,
  '✅ EXISTS' as status
FROM modules
WHERE id = 'c5218df6-dbca-42df-be8d-45c33dda37af'::uuid;

-- === QUERY 5: Viewable batches ===
SELECT 
  '5. Function' as test,
  get_viewable_batches(23) as batches,
  '✅ WORKS' as status;
