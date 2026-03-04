-- UniLearn safe incremental migration
-- Paste this file into Supabase SQL Editor and run it.
-- Do NOT run the full supabase_schema.sql file in production, because that file contains destructive DROP statements.

BEGIN;

-- =====================================================
-- 1. Extend edit_logs for the batch-versioned content model
-- =====================================================
ALTER TABLE edit_logs
  ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES modules(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS batch_number int,
  ADD COLUMN IF NOT EXISTS action_type text NOT NULL DEFAULT 'save';

ALTER TABLE edit_logs
  DROP CONSTRAINT IF EXISTS edit_logs_action_type_check;

ALTER TABLE edit_logs
  ADD CONSTRAINT edit_logs_action_type_check
  CHECK (action_type IN ('save', 'clone'));

-- =====================================================
-- 2. Update edit_logs policies
-- =====================================================
DROP POLICY IF EXISTS "Read own edit logs" ON edit_logs;
DROP POLICY IF EXISTS "Read viewable edit logs" ON edit_logs;
DROP POLICY IF EXISTS "Insert own edit logs" ON edit_logs;

CREATE POLICY "Read viewable edit logs" ON edit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM module_content_versions mcv
      WHERE mcv.id = edit_logs.module_content_version_id
        AND mcv.batch_number = ANY(
          get_viewable_batches(
            (
              SELECT b.batch_number
              FROM profiles p
              JOIN batches b ON b.id = p.batch_id
              WHERE p.id = auth.uid()
            )
          )
        )
    )
  );

CREATE POLICY "Insert own edit logs" ON edit_logs
  FOR INSERT WITH CHECK (edited_by = auth.uid());

-- =====================================================
-- 3. Add indexes for faster history lookups
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_edit_logs_version_id ON edit_logs(module_content_version_id);
CREATE INDEX IF NOT EXISTS idx_edit_logs_created_at ON edit_logs(created_at DESC);

-- =====================================================
-- 4. Transactional save RPC
-- =====================================================
CREATE OR REPLACE FUNCTION save_module_bundle(
  p_module_id uuid,
  p_batch_number int,
  p_content_json jsonb DEFAULT NULL,
  p_past_paper_structure jsonb DEFAULT NULL,
  p_continuous_assessments jsonb DEFAULT NULL,
  p_lecturer_name text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_user_batch_number int;
  v_user_current_semester int;
  v_user_index text;
  v_module_semester int;
  v_existing_content_json jsonb;
  v_existing_lecturer_name text;
  v_saved_version_id uuid;
  v_saved_content_json jsonb;
  v_ca jsonb;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT p.index_number, b.batch_number, b.current_semester
  INTO v_user_index, v_user_batch_number, v_user_current_semester
  FROM profiles p
  JOIN batches b ON b.id = p.batch_id
  WHERE p.id = v_user_id;

  IF v_user_batch_number IS NULL THEN
    RAISE EXCEPTION 'Profile is missing a valid batch assignment';
  END IF;

  IF v_user_batch_number <> p_batch_number THEN
    RAISE EXCEPTION 'You can only edit content for your own batch';
  END IF;

  SELECT semester
  INTO v_module_semester
  FROM modules
  WHERE id = p_module_id;

  IF v_module_semester IS NULL THEN
    RAISE EXCEPTION 'Module not found';
  END IF;

  IF v_user_current_semester < v_module_semester THEN
    RAISE EXCEPTION 'This module is locked until your batch reaches semester %', v_module_semester;
  END IF;

  SELECT content_json, lecturer_name
  INTO v_existing_content_json, v_existing_lecturer_name
  FROM module_content_versions
  WHERE module_id = p_module_id
    AND batch_number = p_batch_number;

  INSERT INTO module_content_versions (
    module_id,
    batch_number,
    content_json,
    lecturer_name,
    created_by,
    updated_by
  )
  VALUES (
    p_module_id,
    p_batch_number,
    COALESCE(
      p_content_json,
      v_existing_content_json,
      '{"topics":[],"additionalNotes":""}'::jsonb
    ),
    COALESCE(p_lecturer_name, v_existing_lecturer_name),
    v_user_id,
    v_user_id
  )
  ON CONFLICT (module_id, batch_number)
  DO UPDATE SET
    content_json = EXCLUDED.content_json,
    lecturer_name = EXCLUDED.lecturer_name,
    updated_by = EXCLUDED.updated_by
  RETURNING id, content_json
  INTO v_saved_version_id, v_saved_content_json;

  IF p_past_paper_structure IS NOT NULL THEN
    INSERT INTO past_paper_structures (
      module_id,
      batch_number,
      structure_json,
      created_by,
      updated_by
    )
    VALUES (
      p_module_id,
      p_batch_number,
      p_past_paper_structure,
      v_user_id,
      v_user_id
    )
    ON CONFLICT (module_id, batch_number)
    DO UPDATE SET
      structure_json = EXCLUDED.structure_json,
      updated_by = EXCLUDED.updated_by;
  END IF;

  IF p_continuous_assessments IS NOT NULL THEN
    DELETE FROM continuous_assessments
    WHERE module_id = p_module_id
      AND batch_number = p_batch_number;

    IF jsonb_typeof(p_continuous_assessments) = 'array' THEN
      FOR v_ca IN
        SELECT value FROM jsonb_array_elements(p_continuous_assessments)
      LOOP
        INSERT INTO continuous_assessments (
          module_id,
          batch_number,
          ca_number,
          ca_type,
          ca_weight,
          description
        )
        VALUES (
          p_module_id,
          p_batch_number,
          (v_ca->>'caNumber')::int,
          v_ca->>'type',
          (v_ca->>'weight')::int,
          v_ca->>'description'
        );
      END LOOP;
    END IF;
  END IF;

  INSERT INTO edit_logs (
    module_content_version_id,
    module_id,
    batch_number,
    edited_by,
    edited_by_index,
    action_type,
    content_snapshot,
    edit_reason
  )
  VALUES (
    v_saved_version_id,
    p_module_id,
    p_batch_number,
    v_user_id,
    v_user_index,
    'save',
    v_saved_content_json,
    'Saved module content'
  );

  RETURN jsonb_build_object(
    'success', true,
    'moduleContentVersionId', v_saved_version_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. Transactional clone RPC
-- =====================================================
CREATE OR REPLACE FUNCTION clone_module_bundle(
  p_module_id uuid,
  p_from_batch int,
  p_to_batch int
)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_user_batch_number int;
  v_user_current_semester int;
  v_user_index text;
  v_module_semester int;
  v_source_content module_content_versions%ROWTYPE;
  v_source_paper past_paper_structures%ROWTYPE;
  v_source_ca record;
  v_has_source_cas boolean := false;
  v_cloned_version_id uuid;
  v_cloned_content_json jsonb;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT p.index_number, b.batch_number, b.current_semester
  INTO v_user_index, v_user_batch_number, v_user_current_semester
  FROM profiles p
  JOIN batches b ON b.id = p.batch_id
  WHERE p.id = v_user_id;

  IF v_user_batch_number IS NULL THEN
    RAISE EXCEPTION 'Profile is missing a valid batch assignment';
  END IF;

  IF v_user_batch_number <> p_to_batch THEN
    RAISE EXCEPTION 'You can only clone to your own batch';
  END IF;

  SELECT semester
  INTO v_module_semester
  FROM modules
  WHERE id = p_module_id;

  IF v_module_semester IS NULL THEN
    RAISE EXCEPTION 'Module not found';
  END IF;

  IF v_user_current_semester < v_module_semester THEN
    RAISE EXCEPTION 'This module is locked until your batch reaches semester %', v_module_semester;
  END IF;

  SELECT *
  INTO v_source_content
  FROM module_content_versions
  WHERE module_id = p_module_id
    AND batch_number = p_from_batch;

  SELECT *
  INTO v_source_paper
  FROM past_paper_structures
  WHERE module_id = p_module_id
    AND batch_number = p_from_batch;

  SELECT EXISTS (
    SELECT 1
    FROM continuous_assessments
    WHERE module_id = p_module_id
      AND batch_number = p_from_batch
  )
  INTO v_has_source_cas;

  IF v_source_content.id IS NULL
     AND v_source_paper.id IS NULL
     AND NOT v_has_source_cas THEN
    RAISE EXCEPTION 'No source content found for the selected batch';
  END IF;

  INSERT INTO module_content_versions (
    module_id,
    batch_number,
    content_json,
    lecturer_name,
    cloned_from_batch,
    created_by,
    updated_by
  )
  VALUES (
    p_module_id,
    p_to_batch,
    COALESCE(
      v_source_content.content_json,
      '{"topics":[],"additionalNotes":""}'::jsonb
    ),
    v_source_content.lecturer_name,
    p_from_batch,
    v_user_id,
    v_user_id
  )
  ON CONFLICT (module_id, batch_number)
  DO UPDATE SET
    content_json = EXCLUDED.content_json,
    lecturer_name = EXCLUDED.lecturer_name,
    cloned_from_batch = EXCLUDED.cloned_from_batch,
    updated_by = EXCLUDED.updated_by
  RETURNING id, content_json
  INTO v_cloned_version_id, v_cloned_content_json;

  IF v_source_paper.id IS NOT NULL THEN
    INSERT INTO past_paper_structures (
      module_id,
      batch_number,
      structure_json,
      created_by,
      updated_by
    )
    VALUES (
      p_module_id,
      p_to_batch,
      v_source_paper.structure_json,
      v_user_id,
      v_user_id
    )
    ON CONFLICT (module_id, batch_number)
    DO UPDATE SET
      structure_json = EXCLUDED.structure_json,
      updated_by = EXCLUDED.updated_by;
  END IF;

  DELETE FROM continuous_assessments
  WHERE module_id = p_module_id
    AND batch_number = p_to_batch;

  FOR v_source_ca IN
    SELECT *
    FROM continuous_assessments
    WHERE module_id = p_module_id
      AND batch_number = p_from_batch
  LOOP
    INSERT INTO continuous_assessments (
      module_id,
      batch_number,
      ca_number,
      ca_type,
      ca_weight,
      description
    )
    VALUES (
      p_module_id,
      p_to_batch,
      v_source_ca.ca_number,
      v_source_ca.ca_type,
      v_source_ca.ca_weight,
      v_source_ca.description
    );
  END LOOP;

  INSERT INTO edit_logs (
    module_content_version_id,
    module_id,
    batch_number,
    edited_by,
    edited_by_index,
    action_type,
    content_snapshot,
    edit_reason
  )
  VALUES (
    v_cloned_version_id,
    p_module_id,
    p_to_batch,
    v_user_id,
    v_user_index,
    'clone',
    v_cloned_content_json,
    'Cloned from batch ' || p_from_batch
  );

  RETURN jsonb_build_object(
    'success', true,
    'moduleContentVersionId', v_cloned_version_id,
    'clonedFrom', p_from_batch,
    'clonedTo', p_to_batch
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- After this succeeds:
-- 1. Refresh your app.
-- 2. Test saving a module.
-- 3. Test cloning from a senior batch.
-- 4. Open the history pages and confirm logs appear.
