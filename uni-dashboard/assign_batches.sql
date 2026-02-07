-- =====================================================
-- Smart Batch Assignment Based on Index Number
-- Assigns users to correct batch from their index
-- =====================================================

-- Assign users to batches based on index number
-- Index format: XXYYYYZ where XX = batch number

-- B25 students (index starts with 25)
UPDATE profiles 
SET batch_id = (SELECT id FROM batches WHERE batch_number = 25 LIMIT 1)
WHERE index_number LIKE '25%' AND batch_id IS NULL;

-- B24 students (index starts with 24)
UPDATE profiles 
SET batch_id = (SELECT id FROM batches WHERE batch_number = 24 LIMIT 1)
WHERE index_number LIKE '24%' AND batch_id IS NULL;

-- B23 students (index starts with 23)
UPDATE profiles 
SET batch_id = (SELECT id FROM batches WHERE batch_number = 23 LIMIT 1)
WHERE index_number LIKE '23%' AND batch_id IS NULL;

-- B22 students (index starts with 22)
UPDATE profiles 
SET batch_id = (SELECT id FROM batches WHERE batch_number = 22 LIMIT 1)
WHERE index_number LIKE '22%' AND batch_id IS NULL;

-- B21 students (index starts with 21)
UPDATE profiles 
SET batch_id = (SELECT id FROM batches WHERE batch_number = 21 LIMIT 1)
WHERE index_number LIKE '21%' AND batch_id IS NULL;

-- Verify assignments
SELECT 
  p.index_number,
  p.full_name,
  b.batch_number,
  b.batch_code,
  CASE 
    WHEN b.current_semester <= 2 THEN 'Year 1'
    WHEN b.current_semester <= 4 THEN 'Year 2'
    WHEN b.current_semester <= 6 THEN 'Year 3'
    WHEN b.current_semester <= 8 THEN 'Year 4'
    ELSE 'Graduated'
  END as year_level
FROM profiles p
LEFT JOIN batches b ON b.id = p.batch_id
ORDER BY b.batch_number DESC, p.index_number;

-- Summary
SELECT 
  b.batch_number,
  COUNT(p.id) as student_count
FROM batches b
LEFT JOIN profiles p ON p.batch_id = b.id
GROUP BY b.batch_number
ORDER BY b.batch_number DESC;
