-- ========================================
-- KEEP B24, DON'T REASSIGN - Just Fix RLS
-- ========================================

-- ============ ONLY FIX: Update RLS Policies ============

-- Allow authenticated users to create modules
DROP POLICY IF EXISTS "Admin manage modules" ON modules;
CREATE POLICY "Authenticated users manage modules" ON modules
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow editing Past Papers from ANY viewable batch
DROP POLICY IF EXISTS "Edit own batch papers" ON past_paper_structures;
CREATE POLICY "Edit all viewable batch papers" ON past_paper_structures
  FOR ALL USING (
    batch_number = ANY(
      get_viewable_batches(
        (SELECT b.batch_number FROM profiles p JOIN batches b ON b.id = p.batch_id WHERE p.id = auth.uid())
      )
    )
  );

-- Allow editing CAs from ANY viewable batch  
DROP POLICY IF EXISTS "Edit own batch CAs" ON continuous_assessments;
CREATE POLICY "Edit all viewable batch CAs" ON continuous_assessments
  FOR ALL USING (
    batch_number = ANY(
      get_viewable_batches(
        (SELECT b.batch_number FROM profiles p JOIN batches b ON b.id = p.batch_id WHERE p.id = auth.uid())
      )
    )
  );

-- ============ VERIFICATION ============

-- Check that 245550X is in B24 and can see B23, B22, B21
SELECT 
  'User 245550X batch:' as info,
  b.batch_number,
  b.batch_code
FROM profiles p
JOIN batches b ON b.id = p.batch_id
WHERE p.index_number = '245550X';

-- Check viewable batches for B24
SELECT 
  'B24 can see these batches:' as info,
  get_viewable_batches(24) as viewable_batches;

-- Expected: {24, 23, 22, 21}

SELECT '
✅ RLS FIXED!

Now B24 can:
1. View B23, B22, B21 content
2. Edit PP/CA for any visible batch
3. Auto-clone B23 when clicking Edit Mode

Frontend will auto-clone B23 content to B24 when you click "Edit Mode"!

' as status;
