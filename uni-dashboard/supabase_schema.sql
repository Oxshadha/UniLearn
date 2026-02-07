-- =====================================================
-- UniLearn Database Schema - Batch-Versioned Content System
-- Run this to RESET and create all tables from scratch
-- =====================================================

-- DROP EXISTING (if any) - Use CASCADE to handle dependencies
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS can_edit_module(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_viewable_batches(int) CASCADE;
DROP FUNCTION IF EXISTS get_latest_batch_version(uuid, int) CASCADE;
DROP FUNCTION IF EXISTS can_edit_batch_content(uuid, int) CASCADE;

-- Drop tables (CASCADE handles policies automatically)
DROP TABLE IF EXISTS past_paper_downloads CASCADE;
DROP TABLE IF EXISTS continuous_assessments CASCADE;
DROP TABLE IF EXISTS past_paper_structures CASCADE;
DROP TABLE IF EXISTS module_content_versions CASCADE;
DROP TABLE IF EXISTS module_contents CASCADE;
DROP TABLE IF EXISTS edit_logs CASCADE;
DROP TABLE IF EXISTS modules CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS batches CASCADE;
DROP TABLE IF EXISTS degrees CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. DEGREES TABLE
-- =====================================================
CREATE TABLE degrees (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE, -- 'AI', 'IT', 'ITM'
  name text NOT NULL
);

-- =====================================================
-- 2. BATCHES TABLE
-- =====================================================
CREATE TABLE batches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_code text NOT NULL UNIQUE, -- 'AI_Batch_23'
  degree_id uuid REFERENCES degrees(id) ON DELETE CASCADE NOT NULL,
  batch_number int NOT NULL, -- 21, 22, 23, 24 (year number)
  current_semester int NOT NULL DEFAULT 1
);

-- =====================================================
-- 3. PROFILES (Users) - Extends Supabase Auth
-- =====================================================
CREATE TABLE profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  index_number text UNIQUE NOT NULL,
  full_name text,
  batch_id uuid REFERENCES batches(id) ON DELETE SET NULL,
  role text DEFAULT 'student' -- 'student', 'admin'
);

-- =====================================================
-- 4. MODULES (Global - No degree restriction)
-- =====================================================
CREATE TABLE modules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE, -- 'IN1621', 'CM2300'
  name text NOT NULL,
  year int NOT NULL DEFAULT 1, -- 1, 2, 3, 4
  semester int NOT NULL DEFAULT 1 -- 1 or 2
);

-- =====================================================
-- 5. MODULE CONTENT VERSIONS (Batch-Specific)
-- Each batch has their own version of module content
-- =====================================================
CREATE TABLE module_content_versions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id uuid REFERENCES modules(id) ON DELETE CASCADE NOT NULL,
  batch_number int NOT NULL,  -- e.g., 21, 22, 23, 24
  
  -- Content JSON (topics, subtopics, blocks)
  content_json jsonb DEFAULT '{
    "topics": [],
    "additionalNotes": ""
  }'::jsonb,
  
  -- Metadata
  lecturer_name text,
  cloned_from_batch int, -- Which batch this was cloned from
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  updated_by uuid REFERENCES profiles(id),
  
  -- Ensure one version per module per batch
  UNIQUE(module_id, batch_number)
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_module_content_versions_updated_at
  BEFORE UPDATE ON module_content_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. PAST PAPER STRUCTURES (Batch-Specific)
-- =====================================================
CREATE TABLE past_paper_structures (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id uuid REFERENCES modules(id) ON DELETE CASCADE NOT NULL,
  batch_number int NOT NULL,
  
  -- Structure JSON (mcq, essay, etc.)
  structure_json jsonb DEFAULT '{
    "totalQuestions": 0,
    "duration": 0,
    "hasMcqs": false,
    "mcqCount": 0,
    "mcqMarks": 0,
    "essayCount": 0,
    "essayMarks": 0,
    "essayQuestions": []
  }'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  updated_by uuid REFERENCES profiles(id),
  
  UNIQUE(module_id, batch_number)
);

CREATE TRIGGER update_past_paper_structures_updated_at
  BEFORE UPDATE ON past_paper_structures
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. CONTINUOUS ASSESSMENTS (Batch-Specific)
-- =====================================================
CREATE TABLE continuous_assessments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id uuid REFERENCES modules(id) ON DELETE CASCADE NOT NULL,
  batch_number int NOT NULL,
  ca_number int NOT NULL CHECK (ca_number IN (1, 2)),
  ca_type text NOT NULL CHECK (ca_type IN ('Written Exam', 'Presentation', 'MCQ Test', 'Practical', 'Video', 'Other')),
  ca_weight int NOT NULL CHECK (ca_weight IN (20, 30, 40, 50)),
  description text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(module_id, batch_number, ca_number)
);

CREATE TRIGGER update_continuous_assessments_updated_at
  BEFORE UPDATE ON continuous_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. PAST PAPER DOWNLOADS (Batch-Specific)
-- =====================================================
CREATE TABLE past_paper_downloads (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id uuid REFERENCES modules(id) ON DELETE CASCADE NOT NULL,
  batch_number int NOT NULL,
  year int NOT NULL CHECK (year BETWEEN 1 AND 4),
  download_url text NOT NULL,
  file_name text NOT NULL,
  uploaded_at timestamptz DEFAULT now(),
  uploaded_by uuid REFERENCES profiles(id)
);

-- =====================================================
-- 9. EDIT LOGS (Version History)
-- =====================================================
CREATE TABLE edit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_content_version_id uuid REFERENCES module_content_versions(id) ON DELETE CASCADE,
  edited_by uuid REFERENCES profiles(id),
  edited_by_index text NOT NULL,
  content_snapshot jsonb,
  edit_reason text DEFAULT 'Updated content',
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get batches a student can view (current + 3 senior)
CREATE OR REPLACE FUNCTION get_viewable_batches(student_batch int)
RETURNS int[] AS $$
BEGIN
  RETURN ARRAY[student_batch, student_batch - 1, student_batch - 2, student_batch - 3];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get the most recent updated batch for a module
CREATE OR REPLACE FUNCTION get_latest_batch_version(p_module_id uuid, student_batch int)
RETURNS int AS $$
DECLARE
  viewable_batches int[];
  latest_batch int;
BEGIN
  viewable_batches := get_viewable_batches(student_batch);
  
  SELECT batch_number INTO latest_batch
  FROM module_content_versions
  WHERE module_id = p_module_id
    AND batch_number = ANY(viewable_batches)
  ORDER BY updated_at DESC
  LIMIT 1;
  
  -- If no content exists, return student's own batch
  RETURN COALESCE(latest_batch, student_batch);
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can edit content for a specific batch
CREATE OR REPLACE FUNCTION can_edit_batch_content(p_module_id uuid, p_batch_number int)
RETURNS boolean AS $$
DECLARE
  user_batch_number int;
BEGIN
  -- Get user's batch number
  SELECT b.batch_number INTO user_batch_number
  FROM profiles p
  JOIN batches b ON b.id = p.batch_id
  WHERE p.id = auth.uid();
  
  -- Users can only edit their own batch's content
  RETURN user_batch_number = p_batch_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE degrees ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE past_paper_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE past_paper_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE edit_logs ENABLE ROW LEVEL SECURITY;

-- Degrees: Public Read
CREATE POLICY "Public read degrees" ON degrees
  FOR SELECT USING (true);

-- Batches: Public Read
CREATE POLICY "Public read batches" ON batches
  FOR SELECT USING (true);

-- Profiles: Users can read all, update only own
CREATE POLICY "Public read profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Modules: Public Read, Admins can modify
CREATE POLICY "Public read modules" ON modules
  FOR SELECT USING (true);

CREATE POLICY "Admin manage modules" ON modules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Module Content Versions: Read if batch is viewable, Edit if own batch
CREATE POLICY "Read viewable batch content" ON module_content_versions
  FOR SELECT USING (
    batch_number = ANY(
      get_viewable_batches(
        (SELECT b.batch_number FROM profiles p JOIN batches b ON b.id = p.batch_id WHERE p.id = auth.uid())
      )
    )
  );

CREATE POLICY "Edit own batch content" ON module_content_versions
  FOR ALL USING (
    can_edit_batch_content(module_id, batch_number)
  );

-- Past Paper Structures: Same as content versions
CREATE POLICY "Read viewable batch papers" ON past_paper_structures
  FOR SELECT USING (
    batch_number = ANY(
      get_viewable_batches(
        (SELECT b.batch_number FROM profiles p JOIN batches b ON b.id = p.batch_id WHERE p.id = auth.uid())
      )
    )
  );

CREATE POLICY "Edit own batch papers" ON past_paper_structures
  FOR ALL USING (
    can_edit_batch_content(module_id, batch_number)
  );

-- Continuous Assessments: Same as content versions
CREATE POLICY "Read viewable batch CAs" ON continuous_assessments
  FOR SELECT USING (
    batch_number = ANY(
      get_viewable_batches(
        (SELECT b.batch_number FROM profiles p JOIN batches b ON b.id = p.batch_id WHERE p.id = auth.uid())
      )
    )
  );

CREATE POLICY "Edit own batch CAs" ON continuous_assessments
  FOR ALL USING (
    can_edit_batch_content(module_id, batch_number)
  );

-- Past Paper Downloads: Read viewable batches, Upload for own batch
CREATE POLICY "Read viewable batch downloads" ON past_paper_downloads
  FOR SELECT USING (
    batch_number = ANY(
      get_viewable_batches(
        (SELECT b.batch_number FROM profiles p JOIN batches b ON b.id = p.batch_id WHERE p.id = auth.uid())
      )
    )
  );

CREATE POLICY "Upload own batch papers" ON past_paper_downloads
  FOR INSERT WITH CHECK (
    can_edit_batch_content(module_id, batch_number)
  );

-- Edit Logs: Read own edits
CREATE POLICY "Read own edit logs" ON edit_logs
  FOR SELECT USING (edited_by = auth.uid());

-- =====================================================
-- INDEXES for Performance
-- =====================================================
CREATE INDEX idx_module_content_versions_module_batch ON module_content_versions(module_id, batch_number);
CREATE INDEX idx_module_content_versions_updated_at ON module_content_versions(updated_at DESC);
CREATE INDEX idx_past_paper_structures_module_batch ON past_paper_structures(module_id, batch_number);
CREATE INDEX idx_continuous_assessments_module_batch ON continuous_assessments(module_id, batch_number);
CREATE INDEX idx_past_paper_downloads_module_batch ON past_paper_downloads(module_id, batch_number);
CREATE INDEX idx_profiles_batch_id ON profiles(batch_id);

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Insert Degrees
INSERT INTO degrees (code, name) VALUES
  ('AI', 'Artificial Intelligence'),
  ('IT', 'Information Technology'),
  ('ITM', 'IT Management');

-- Insert Batches
INSERT INTO batches (batch_code, degree_id, batch_number, current_semester)
SELECT 
  'AI_Batch_' || batch_num,
  (SELECT id FROM degrees WHERE code = 'AI'),
  batch_num,
  CASE 
    WHEN batch_num = 24 THEN 3
    WHEN batch_num = 23 THEN 5
    WHEN batch_num = 22 THEN 7
    ELSE 8
  END
FROM unnest(ARRAY[21, 22, 23, 24]) AS batch_num;

-- Insert Sample Modules
INSERT INTO modules (code, name, year, semester) VALUES
  ('IN1621', 'Introduction to Programming', 1, 1),
  ('CM2300', 'Data Structures and Algorithms', 2, 1),
  ('CM2510', 'Database Management Systems', 2, 2),
  ('CM3100', 'Machine Learning Fundamentals', 3, 1);

-- =====================================================
-- Update Current Semesters (February 2026)
-- =====================================================
UPDATE batches SET current_semester = 1 WHERE batch_number = 25;
UPDATE batches SET current_semester = 2 WHERE batch_number = 24;
UPDATE batches SET current_semester = 3 WHERE batch_number = 23;
UPDATE batches SET current_semester = 5 WHERE batch_number = 22;
UPDATE batches SET current_semester = 7 WHERE batch_number = 21;

-- =====================================================
-- Admin Helper Function: Increment Semester
-- =====================================================
CREATE OR REPLACE FUNCTION increment_batch_semester(batch_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE batches 
  SET current_semester = current_semester + 1
  WHERE id = batch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_batch_semester(uuid) TO authenticated;

-- Done!
SELECT 'Schema deployed with batch versioning and semester management!' as status;


-- =====================================================
-- TRIGGER: Auto-create profile on user signup
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, index_number, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'index_number', 'UNKNOWN'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown User')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- MIGRATION NOTES
-- =====================================================
-- To migrate existing data from old schema:
/*
1. Export existing module_contents data
2. Determine appropriate batch_number for each record
3. Insert into module_content_versions with:
   - module_id (same)
   - batch_number (e.g., 23 for current active batch)
   - content_json (same structure)
   - created_by, updated_by from lecturer info

Example migration query:
INSERT INTO module_content_versions (module_id, batch_number, content_json, lecturer_name, created_by)
SELECT 
  mc.module_id,
  23, -- Current active batch
  mc.content_json,
  mc.lecturer_name,
  p.id
FROM old_module_contents mc
LEFT JOIN profiles p ON p.index_number = 'ADMIN'; -- or appropriate user
*/
