-- UniLearn safe incremental migration
-- Paste this file into Supabase SQL Editor and run it.
-- Do NOT run the full supabase_schema.sql file in production, because that file contains destructive DROP statements.

BEGIN;

-- =====================================================
-- 1. Add module soft-delete fields
-- =====================================================
ALTER TABLE modules
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS purge_after timestamptz;

CREATE INDEX IF NOT EXISTS idx_modules_deleted_at ON modules(deleted_at);
CREATE INDEX IF NOT EXISTS idx_modules_purge_after ON modules(purge_after);

-- =====================================================
-- 2. Add soft-delete fields for batch-owned content tables
-- =====================================================
ALTER TABLE module_content_versions
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS purge_after timestamptz;

ALTER TABLE past_paper_structures
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS purge_after timestamptz;

ALTER TABLE continuous_assessments
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS purge_after timestamptz;

ALTER TABLE past_paper_downloads
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS purge_after timestamptz;

CREATE INDEX IF NOT EXISTS idx_module_content_versions_deleted_at ON module_content_versions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_module_content_versions_purge_after ON module_content_versions(purge_after);
CREATE INDEX IF NOT EXISTS idx_past_paper_structures_deleted_at ON past_paper_structures(deleted_at);
CREATE INDEX IF NOT EXISTS idx_past_paper_structures_purge_after ON past_paper_structures(purge_after);
CREATE INDEX IF NOT EXISTS idx_continuous_assessments_deleted_at ON continuous_assessments(deleted_at);
CREATE INDEX IF NOT EXISTS idx_continuous_assessments_purge_after ON continuous_assessments(purge_after);
CREATE INDEX IF NOT EXISTS idx_past_paper_downloads_deleted_at ON past_paper_downloads(deleted_at);
CREATE INDEX IF NOT EXISTS idx_past_paper_downloads_purge_after ON past_paper_downloads(purge_after);

ALTER TABLE continuous_assessments
  DROP CONSTRAINT IF EXISTS continuous_assessments_module_id_batch_number_ca_number_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_continuous_assessments_active_unique
  ON continuous_assessments(module_id, batch_number, ca_number)
  WHERE deleted_at IS NULL;

-- =====================================================
-- 3. Add notifications tables
-- =====================================================
CREATE TABLE IF NOT EXISTS batch_notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_number int NOT NULL,
  module_id uuid REFERENCES modules(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('save', 'clone', 'module_created', 'module_deleted', 'module_restored')),
  message text NOT NULL,
  actor_id uuid REFERENCES profiles(id),
  actor_index text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_reads (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id uuid REFERENCES batch_notifications(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  read_at timestamptz DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

ALTER TABLE batch_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_batch_notifications_batch_created_at
  ON batch_notifications(batch_number, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_reads_user_notification
  ON notification_reads(user_id, notification_id);

-- =====================================================
-- 4. Resource-specific permission helper for past papers
-- =====================================================
CREATE OR REPLACE FUNCTION can_manage_past_papers(p_target_batch int)
RETURNS boolean AS $$
DECLARE
  user_batch_number int;
BEGIN
  SELECT b.batch_number INTO user_batch_number
  FROM profiles p
  JOIN batches b ON b.id = p.batch_id
  WHERE p.id = auth.uid();

  RETURN user_batch_number = p_target_batch
    OR user_batch_number = p_target_batch + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. Update viewability helper to allow all-batch read access
-- =====================================================
CREATE OR REPLACE FUNCTION get_viewable_batches(student_batch int)
RETURNS int[] AS $$
DECLARE
  all_batches int[];
BEGIN
  SELECT COALESCE(array_agg(batch_number ORDER BY batch_number DESC), ARRAY[]::int[])
  INTO all_batches
  FROM batches;

  RETURN all_batches;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 6. Extend edit_logs for the batch-versioned content model
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
-- 7. Update policies
-- =====================================================
DROP POLICY IF EXISTS "Read own edit logs" ON edit_logs;
DROP POLICY IF EXISTS "Read viewable edit logs" ON edit_logs;
DROP POLICY IF EXISTS "Insert own edit logs" ON edit_logs;
DROP POLICY IF EXISTS "Read viewable batch content" ON module_content_versions;
DROP POLICY IF EXISTS "Read viewable batch papers" ON past_paper_structures;
DROP POLICY IF EXISTS "Read viewable batch CAs" ON continuous_assessments;
DROP POLICY IF EXISTS "Read viewable batch downloads" ON past_paper_downloads;
DROP POLICY IF EXISTS "Upload own batch papers" ON past_paper_downloads;
DROP POLICY IF EXISTS "Manage allowed batch papers" ON past_paper_downloads;
DROP POLICY IF EXISTS "Read own batch notifications" ON batch_notifications;
DROP POLICY IF EXISTS "Insert own batch notifications" ON batch_notifications;
DROP POLICY IF EXISTS "Read own notification reads" ON notification_reads;
DROP POLICY IF EXISTS "Insert own notification reads" ON notification_reads;

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

CREATE POLICY "Read viewable batch content" ON module_content_versions
  FOR SELECT USING (
    deleted_at IS NULL
    AND batch_number = ANY(
      get_viewable_batches(
        (
          SELECT b.batch_number
          FROM profiles p
          JOIN batches b ON b.id = p.batch_id
          WHERE p.id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Read viewable batch papers" ON past_paper_structures
  FOR SELECT USING (
    deleted_at IS NULL
    AND batch_number = ANY(
      get_viewable_batches(
        (
          SELECT b.batch_number
          FROM profiles p
          JOIN batches b ON b.id = p.batch_id
          WHERE p.id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Read viewable batch CAs" ON continuous_assessments
  FOR SELECT USING (
    deleted_at IS NULL
    AND batch_number = ANY(
      get_viewable_batches(
        (
          SELECT b.batch_number
          FROM profiles p
          JOIN batches b ON b.id = p.batch_id
          WHERE p.id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Read viewable batch downloads" ON past_paper_downloads
  FOR SELECT USING (
    deleted_at IS NULL
    AND batch_number = ANY(
      get_viewable_batches(
        (
          SELECT b.batch_number
          FROM profiles p
          JOIN batches b ON b.id = p.batch_id
          WHERE p.id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Manage allowed batch papers" ON past_paper_downloads
  FOR ALL USING (
    can_manage_past_papers(batch_number)
  )
  WITH CHECK (
    can_manage_past_papers(batch_number)
  );

CREATE POLICY "Read own batch notifications" ON batch_notifications
  FOR SELECT USING (
    batch_number = (
      SELECT b.batch_number
      FROM profiles p
      JOIN batches b ON b.id = p.batch_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Insert own batch notifications" ON batch_notifications
  FOR INSERT WITH CHECK (
    actor_id = auth.uid()
    AND batch_number = (
      SELECT b.batch_number
      FROM profiles p
      JOIN batches b ON b.id = p.batch_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Read own notification reads" ON notification_reads
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Insert own notification reads" ON notification_reads
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 8. Add indexes for faster history lookups
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_edit_logs_version_id ON edit_logs(module_content_version_id);
CREATE INDEX IF NOT EXISTS idx_edit_logs_created_at ON edit_logs(created_at DESC);

-- =====================================================
-- 9. Transactional save RPC
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
  v_module_deleted_at timestamptz;
  v_module_code text;
  v_module_name text;
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

  SELECT semester, deleted_at, code, name
  INTO v_module_semester, v_module_deleted_at, v_module_code, v_module_name
  FROM modules
  WHERE id = p_module_id;

  IF v_module_semester IS NULL OR v_module_deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Module not found';
  END IF;

  IF v_user_current_semester < v_module_semester THEN
    RAISE EXCEPTION 'This module is locked until your batch reaches semester %', v_module_semester;
  END IF;

  SELECT content_json, lecturer_name
  INTO v_existing_content_json, v_existing_lecturer_name
  FROM module_content_versions
  WHERE module_id = p_module_id
    AND batch_number = p_batch_number
  ORDER BY deleted_at NULLS FIRST
  LIMIT 1;

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
    updated_by = EXCLUDED.updated_by,
    deleted_at = NULL,
    deleted_by = NULL,
    purge_after = NULL
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
      updated_by = EXCLUDED.updated_by,
      deleted_at = NULL,
      deleted_by = NULL,
      purge_after = NULL;
  END IF;

  IF p_continuous_assessments IS NOT NULL THEN
    UPDATE continuous_assessments
    SET
      deleted_at = now(),
      deleted_by = v_user_id,
      purge_after = now() + interval '7 days'
    WHERE module_id = p_module_id
      AND batch_number = p_batch_number
      AND deleted_at IS NULL;

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

  INSERT INTO batch_notifications (
    batch_number,
    module_id,
    event_type,
    message,
    actor_id,
    actor_index,
    metadata
  )
  VALUES (
    p_batch_number,
    p_module_id,
    'save',
    'Module ' || COALESCE(v_module_code, 'UNKNOWN') || ' updated by ' || v_user_index,
    v_user_id,
    v_user_index,
    jsonb_build_object(
      'moduleCode', v_module_code,
      'moduleName', v_module_name,
      'action', 'save'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'moduleContentVersionId', v_saved_version_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. Transactional clone RPC
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
  v_module_deleted_at timestamptz;
  v_module_code text;
  v_module_name text;
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

  IF p_from_batch >= v_user_batch_number THEN
    RAISE EXCEPTION 'You can only clone from a senior batch';
  END IF;

  SELECT semester, deleted_at, code, name
  INTO v_module_semester, v_module_deleted_at, v_module_code, v_module_name
  FROM modules
  WHERE id = p_module_id;

  IF v_module_semester IS NULL OR v_module_deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Module not found';
  END IF;

  IF v_user_current_semester < v_module_semester THEN
    RAISE EXCEPTION 'This module is locked until your batch reaches semester %', v_module_semester;
  END IF;

  SELECT *
  INTO v_source_content
  FROM module_content_versions
  WHERE module_id = p_module_id
    AND batch_number = p_from_batch
    AND deleted_at IS NULL;

  SELECT *
  INTO v_source_paper
  FROM past_paper_structures
  WHERE module_id = p_module_id
    AND batch_number = p_from_batch
    AND deleted_at IS NULL;

  SELECT EXISTS (
    SELECT 1
    FROM continuous_assessments
    WHERE module_id = p_module_id
      AND batch_number = p_from_batch
      AND deleted_at IS NULL
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
    updated_by = EXCLUDED.updated_by,
    deleted_at = NULL,
    deleted_by = NULL,
    purge_after = NULL
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
      updated_by = EXCLUDED.updated_by,
      deleted_at = NULL,
      deleted_by = NULL,
      purge_after = NULL;
  END IF;

  UPDATE continuous_assessments
  SET
    deleted_at = now(),
    deleted_by = v_user_id,
    purge_after = now() + interval '7 days'
  WHERE module_id = p_module_id
    AND batch_number = p_to_batch
    AND deleted_at IS NULL;

  FOR v_source_ca IN
    SELECT *
    FROM continuous_assessments
    WHERE module_id = p_module_id
      AND batch_number = p_from_batch
      AND deleted_at IS NULL
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

  INSERT INTO batch_notifications (
    batch_number,
    module_id,
    event_type,
    message,
    actor_id,
    actor_index,
    metadata
  )
  VALUES (
    p_to_batch,
    p_module_id,
    'clone',
    'Module ' || COALESCE(v_module_code, 'UNKNOWN') || ' cloned from batch ' || p_from_batch || ' by ' || v_user_index,
    v_user_id,
    v_user_index,
    jsonb_build_object(
      'moduleCode', v_module_code,
      'moduleName', v_module_name,
      'action', 'clone',
      'fromBatch', p_from_batch,
      'toBatch', p_to_batch
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'moduleContentVersionId', v_cloned_version_id,
    'clonedFrom', p_from_batch,
    'clonedTo', p_to_batch
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 11. Purge helper for records past the 7-day restore window
-- =====================================================
CREATE OR REPLACE FUNCTION purge_expired_modules()
RETURNS int AS $$
DECLARE
  v_deleted_count int;
BEGIN
  WITH deleted_modules AS (
    DELETE FROM modules
    WHERE deleted_at IS NOT NULL
      AND purge_after IS NOT NULL
      AND purge_after <= now()
    RETURNING 1
  ),
  deleted_content AS (
    DELETE FROM module_content_versions
    WHERE deleted_at IS NOT NULL
      AND purge_after IS NOT NULL
      AND purge_after <= now()
    RETURNING 1
  ),
  deleted_papers AS (
    DELETE FROM past_paper_structures
    WHERE deleted_at IS NOT NULL
      AND purge_after IS NOT NULL
      AND purge_after <= now()
    RETURNING 1
  ),
  deleted_cas AS (
    DELETE FROM continuous_assessments
    WHERE deleted_at IS NOT NULL
      AND purge_after IS NOT NULL
      AND purge_after <= now()
    RETURNING 1
  ),
  deleted_downloads AS (
    DELETE FROM past_paper_downloads
    WHERE deleted_at IS NOT NULL
      AND purge_after IS NOT NULL
      AND purge_after <= now()
    RETURNING 1
  )
  SELECT
    (SELECT COUNT(*) FROM deleted_modules) +
    (SELECT COUNT(*) FROM deleted_content) +
    (SELECT COUNT(*) FROM deleted_papers) +
    (SELECT COUNT(*) FROM deleted_cas) +
    (SELECT COUNT(*) FROM deleted_downloads)
  INTO v_deleted_count;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION purge_expired_modules() TO authenticated;

COMMIT;
