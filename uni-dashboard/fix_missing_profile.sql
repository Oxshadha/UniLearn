-- =====================================================
-- Fix: Create missing profile for user 235550X
-- =====================================================

-- Step 1: Find the user's auth ID
SELECT id, email, raw_user_meta_data 
FROM auth.users 
WHERE raw_user_meta_data->>'index_number' = '235550X'
   OR email ILIKE '%235550%';

-- Step 2: Manually create the profile
-- Replace 'USER_ID_HERE' with the actual ID from step 1
INSERT INTO profiles (id, index_number, full_name, batch_id)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'index_number', '235550X'),
  COALESCE(u.raw_user_meta_data->>'full_name', 'Student 235550X'),
  (SELECT id FROM batches WHERE batch_number = 23 LIMIT 1)
FROM auth.users u
WHERE u.raw_user_meta_data->>'index_number' = '235550X'
   OR u.email ILIKE '%235550%'
ON CONFLICT (id) DO UPDATE SET
  batch_id = (SELECT id FROM batches WHERE batch_number = 23 LIMIT 1);

-- Step 3: Verify it worked
SELECT 
  p.index_number,
  p.full_name,
  b.batch_number,
  b.batch_code
FROM profiles p
LEFT JOIN batches b ON b.id = p.batch_id
WHERE p.index_number = '235550X';

-- If it shows batch_number = 23, SUCCESS!
