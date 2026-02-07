-- ========================================
-- UNIVERSAL FIX - Works for ALL Batches
-- B20, B21, B22, B23, B24, B25, B26, B27...
-- ========================================

-- ============ UPDATE RLS POLICIES ============

-- 1. Allow ALL authenticated users to create modules
DROP POLICY IF EXISTS "Admin manage modules" ON modules;
CREATE POLICY "Authenticated users manage modules" ON modules
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Past Papers: Allow editing from ANY viewable batch
--    Example: B24 can edit B24, B23, B22, B21
--             B23 can edit B23, B22, B21, B20
DROP POLICY IF EXISTS "Edit own batch papers" ON past_paper_structures;
CREATE POLICY "Edit all viewable batch papers" ON past_paper_structures
  FOR ALL USING (
    batch_number = ANY(
      get_viewable_batches(
        (SELECT b.batch_number FROM profiles p JOIN batches b ON b.id = p.batch_id WHERE p.id = auth.uid())
      )
    )
  );

-- 3. CAs: Allow editing from ANY viewable batch
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

-- Test with current user (works for ANY batch)
SELECT 
  'Your batch info:' as info,
  p.index_number,
  b.batch_number,
  b.batch_code
FROM profiles p
JOIN batches b ON b.id = p.batch_id
WHERE p.id = auth.uid();

-- Check what batches current user can see
SELECT 
  'You can view these batches:' as info,
  get_viewable_batches(
    (SELECT b.batch_number FROM profiles p JOIN batches b ON b.id = p.batch_id WHERE p.id = auth.uid())
  ) as viewable_batches;

-- Example outputs:
-- B20 sees: {20, 19, 18, 17}
-- B21 sees: {21, 20, 19, 18}
-- B22 sees: {22, 21, 20, 19}
-- B23 sees: {23, 22, 21, 20}
-- B24 sees: {24, 23, 22, 21}
-- B25 sees: {25, 24, 23, 22}
-- etc...

SELECT '
✅ UNIVERSAL FIX APPLIED!

This works for ALL batches (past, present, future):
- B20, B21, B22, B23, B24, B25, B26, B27...

Each batch can:
1. View their own batch + 3 senior batches
2. Edit topics ONLY in their own batch
3. Edit PP/CA in ANY visible batch
4. Auto-clone when clicking Edit Mode with no content

Frontend auto-clone works for:
- B24 clones from B23
- B23 clones from B22
- B25 clones from B24
- B99 clones from B98
- etc...

' as status;
