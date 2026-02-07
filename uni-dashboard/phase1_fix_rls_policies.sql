-- =====================================================
-- Phase 1: Fix RLS Policies for Batch Versioning
-- Run this in Supabase SQL Editor
-- =====================================================

-- ============ STEP 1: Drop Old Restrictive Policies ============

DROP POLICY IF EXISTS "Edit own batch papers" ON past_paper_structures;
DROP POLICY IF EXISTS "Edit own batch CAs" ON continuous_assessments;
DROP POLICY IF EXISTS "Admin manage modules" ON modules;
DROP POLICY IF EXISTS "Upload own batch papers" ON past_paper_downloads;

-- ============ STEP 2: Create New Permissive Policies ============

-- PAST PAPERS: Allow editing ANY viewable batch
-- Reason: These are shared resources - any batch can update past paper info
CREATE POLICY "Edit all viewable batch papers" ON past_paper_structures
  FOR ALL USING (
    batch_number = ANY(
      get_viewable_batches(
        (SELECT b.batch_number FROM profiles p JOIN batches b ON b.id = p.batch_id WHERE p.id = auth.uid())
      )
    )
  )
  WITH CHECK (
    batch_number = ANY(
      get_viewable_batches(
        (SELECT b.batch_number FROM profiles p JOIN batches b ON b.id = p.batch_id WHERE p.id = auth.uid())
      )
    )
  );

-- CONTINUOUS ASSESSMENTS: Allow editing ANY viewable batch  
-- Reason: CA info is shared - any batch can update
CREATE POLICY "Edit all viewable batch CAs" ON continuous_assessments
  FOR ALL USING (
    batch_number = ANY(
      get_viewable_batches(
        (SELECT b.batch_number FROM profiles p JOIN batches b ON b.id = p.batch_id WHERE p.id = auth.uid())
      )
    )
  )
  WITH CHECK (
   batch_number = ANY(
      get_viewable_batches(
        (SELECT b.batch_number FROM profiles p JOIN batches b ON b.id = p.batch_id WHERE p.id = auth.uid())
      )
    )
  );

-- PAST PAPER DOWNLOADS: Allow uploading for ANY viewable batch
CREATE POLICY "Upload papers for viewable batches" ON past_paper_downloads
  FOR ALL USING (
    batch_number = ANY(
      get_viewable_batches(
        (SELECT b.batch_number FROM profiles p JOIN batches b ON b.id = p.batch_id WHERE p.id = auth.uid())
      )
    )
  );

-- MODULES: Allow all authenticated users to create/manage modules
-- Reason: Any student can add a new module to the system
CREATE POLICY "Authenticated users manage modules" ON modules
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============ STEP 3: Verify Policies ============

-- Check current policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'module_content_versions',
    'past_paper_structures', 
    'continuous_assessments',
    'past_paper_downloads',
    'modules'
  )
ORDER BY tablename, policyname;

-- Success message
SELECT 'RLS Policies updated successfully! Topics=own batch only, PP/CA=all viewable batches' as status;
