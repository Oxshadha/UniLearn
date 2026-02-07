-- ========================================
-- UNIVERSAL FIX - Safe Version (No Errors)  
-- ========================================

-- ============ SKIP Module Policy (already exists) ============
-- The "Authenticated users manage modules" policy already exists
-- So we'll skip it and only update PP/CA policies

-- ============ UPDATE ONLY PP & CA POLICIES ============

-- Past Papers: Drop OLD policy if exists, create NEW one
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

-- CAs: Drop OLD policy if exists, create NEW one
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

-- ============ VERIFICATION ============

SELECT 
  'Policies updated! Test by:' as step,
  '1. Refresh browser' as action_1,
  '2. Click Edit Mode on empty module' as action_2,
  '3. Should auto-clone senior batch' as action_3;

-- Check current user's viewable batches
SELECT 
  'Your viewable batches:' as info,
  get_viewable_batches(
    (SELECT b.batch_number FROM profiles p JOIN batches b ON b.id = p.batch_id WHERE p.id = auth.uid())
  ) as batches;

SELECT '✅ DONE! System ready for all batches.' as status;
