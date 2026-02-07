-- Test if batch join is working for user 235550X
SELECT 
  p.id,
  p.index_number,
  p.batch_id,
  b.batch_number,
  b.batch_code
FROM profiles p
LEFT JOIN batches b ON b.id = p.batch_id
WHERE p.index_number = '235550X';

-- If this returns NULL for batch_number, the batch_id is wrong or batch doesn't exist
