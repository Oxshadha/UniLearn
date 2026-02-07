-- Fix modules RLS policy - Allow authenticated users to create modules
-- Run this in Supabase SQL Editor

DROP POLICY IF EXISTS "Admin manage modules" ON modules;

CREATE POLICY "Authenticated users can manage modules" ON modules
  FOR ALL
  USING (true)
  WITH CHECK (true);
