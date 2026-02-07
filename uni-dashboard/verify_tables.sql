-- Quick verification: Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'degrees',
  'batches',
  'profiles',
  'modules',
  'module_content_versions',
  'past_paper_structures', 
  'continuous_assessments',
  'past_paper_downloads',
  'edit_logs'
)
ORDER BY table_name;
