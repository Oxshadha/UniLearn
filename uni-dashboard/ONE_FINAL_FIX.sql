-- ========================================
-- COMPLETE FIX - Run this ONCE and it's done
-- ========================================

-- 1. Fix user batch assignments
UPDATE profiles 
SET batch_id = (SELECT id FROM batches WHERE batch_number = 23 LIMIT 1)
WHERE index_number = '235550X';

UPDATE profiles 
SET batch_id = (SELECT id FROM batches WHERE batch_number = 24 LIMIT 1)
WHERE index_number = '245550X';

-- 2. Fix RLS policies for cross-batch editing
DROP POLICY IF EXISTS "Edit own batch papers" ON past_paper_structures;
DROP POLICY IF EXISTS "Edit all viewable batch papers" ON past_paper_structures;

CREATE POLICY "Edit all viewable batch papers" ON past_paper_structures
  FOR ALL USING (
    batch_number = ANY(
      get_viewable_batches(
        (SELECT b.batch_number FROM profiles p JOIN batches b ON b.id = p.batch_id WHERE p.id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Edit own batch CAs" ON continuous_assessments;
DROP POLICY IF EXISTS "Edit all viewable batch CAs" ON continuous_assessments;

CREATE POLICY "Edit all viewable batch CAs" ON continuous_assessments
  FOR ALL USING (
    batch_number = ANY(
      get_viewable_batches(
        (SELECT b.batch_number FROM profiles p JOIN batches b ON b.id = p.batch_id WHERE p.id = auth.uid())
      )
    )
  );

-- 3. Verify everything works
SELECT 'User batch:' as check, index_number, batch_id, 
       (SELECT batch_number FROM batches WHERE id = batch_id) as batch_number
FROM profiles WHERE index_number = '235550X';

SELECT 'Policies:' as check, policyname 
FROM pg_policies 
WHERE tablename = 'past_paper_structures' AND policyname LIKE '%viewable%';

SELECT '✅ ALL DONE! Now: 1. Logout 2. Clear cache (Cmd+Shift+R) 3. Login' as result;
