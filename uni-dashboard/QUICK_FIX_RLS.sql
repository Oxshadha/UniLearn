-- ================================
-- QUICK FIX: Deploy ALL necessary changes at once
-- Run this in Supabase SQL Editor
-- ================================

-- 1. Fix Modules RLS Policy
DROP POLICY IF EXISTS "Admin manage modules" ON modules;
CREATE POLICY "Authenticated users manage modules" ON modules
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Fix Past Papers RLS - Allow editing ANY viewable batch
DROP POLICY IF EXISTS "Edit own batch papers" ON past_paper_structures;
CREATE POLICY "Edit all viewable batch papers" ON past_paper_structures
  FOR ALL USING (
    batch_number = ANY(
      get_viewable_batches(
        (SELECT b.batch_number FROM profiles p JOIN batches b ON b.id = p.batch_id WHERE p.id = auth.uid())
      )
    )
  );

-- 3. Fix CA RLS - Allow editing ANY viewable batch
DROP POLICY IF EXISTS "Edit own batch CAs" ON continuous_assessments;
CREATE POLICY "Edit all viewable batch CAs" ON continuous_assessments
  FOR ALL USING (
    batch_number = ANY(
      get_viewable_batches(
        (SELECT b.batch_number FROM profiles p JOIN batches b ON b.id = p.batch_id WHERE p.id = auth.uid())
      )
    )
  );

SELECT 'RLS Policies updated! Topics=own batch only, PP/CA=all viewable batches' as status;
