-- Migration 005: Add Notes Field to Pipelines
-- Adds a long-text notes field for recording usage details, technical info,
-- client preferences, and other documentation about each pipeline

-- Add notes column
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add index for searching notes (optional but useful)
CREATE INDEX IF NOT EXISTS idx_pipelines_notes_search ON pipelines USING gin(to_tsvector('english', notes));

-- Add a comment describing the column
COMMENT ON COLUMN pipelines.notes IS 'Long-form notes about pipeline usage, technical details, client preferences, etc.';

-- Verify
SELECT 
  'Notes field added to pipelines' as status,
  COUNT(*) as pipeline_count
FROM pipelines;
