-- ========================================
-- COMPLETE FIX - Run ALL these in Supabase SQL Editor
-- ========================================

-- ============ FIX 1: Assign 245550X to Batch 23 ============
UPDATE profiles 
SET batch_id = (SELECT id FROM batches WHERE batch_number = 23 LIMIT 1)
WHERE index_number = '245550X';

-- Verify
SELECT 
  p.index_number,
  p.full_name,
  b.batch_number,
  b.batch_code
FROM profiles p
LEFT JOIN batches b ON b.id = p.batch_id
WHERE p.index_number = '245550X';

-- ============ FIX 2: Update RLS Policies ============

-- 2A: Allow authenticated users to create modules
DROP POLICY IF EXISTS "Admin manage modules" ON modules;
CREATE POLICY "Authenticated users manage modules" ON modules
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2B: Allow editing Past Papers from ANY viewable batch
DROP POLICY IF EXISTS "Edit own batch papers" ON past_paper_structures;
CREATE POLICY "Edit all viewable batch papers" ON past_paper_structures
  FOR ALL USING (
    batch_number = ANY(
      get_viewable_batches(
        (SELECT b.batch_number FROM profiles p JOIN batches b ON b.id = p.batch_id WHERE p.id = auth.uid())
      )
    )
  );

-- 2C: Allow editing CAs from ANY viewable batch
DROP POLICY IF EXISTS "Edit own batch CAs" ON continuous_assessments;
CREATE POLICY "Edit all viewable batch CAs" ON continuous_assessments
  FOR ALL USING (
    batch_number = ANY(
      get_viewable_batches(
        (SELECT b.batch_number FROM profiles p JOIN batches b ON b.id = p.batch_id WHERE p.id = auth.uid())
      )
    )
  );

-- 2D: Allow uploading papers for any viewable batch
DROP POLICY IF EXISTS "Upload own batch papers" ON past_paper_downloads;
CREATE POLICY "Upload papers for viewable batches" ON past_paper_downloads
  FOR ALL USING (
    batch_number = ANY(
      get_viewable_batches(
        (SELECT b.batch_number FROM profiles p JOIN batches b ON b.id = p.batch_id WHERE p.id = auth.uid())
      )
    )
  );

-- ============ FIX 3: Verify Everything ============

-- Check batch assignment
SELECT 
  p.index_number,
  b.batch_number,
  b.batch_code,
  b.current_semester
FROM profiles p
JOIN batches b ON b.id = p.batch_id
WHERE p.index_number IN ('235550X', '245550X');

-- Check viewable batches for 245550X
SELECT get_viewable_batches(
  (SELECT b.batch_number FROM profiles p JOIN batches b ON b.id = p.batch_id WHERE p.index_number = '245550X')
) as viewable_batches;

-- Expected result: {23, 22, 21, 20}

-- Check all policies
SELECT 
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'modules',
    'module_content_versions',
    'past_paper_structures', 
    'continuous_assessments',
    'past_paper_downloads'
  )
ORDER BY tablename, policyname;

-- ============ SUCCESS MESSAGE ============
SELECT '
✅ ALL FIXES APPLIED!

After running this:
1. Logout and login again as 245550X / test123
2. You should now see: B23✓ B22 B21 B20
3. Topics: Edit only YOUR batch (B23)
4. Past Papers & CAs: Edit ANY visible batch
5. MCQ toggle should work correctly

' as status;
