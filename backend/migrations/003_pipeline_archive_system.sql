-- Sprint 3: Pipeline Archive System Migration
-- Adds archive functionality and template protection to pipelines

-- Add archive columns
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE;
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;

-- Mark existing Quick Start pipelines as protected templates
-- These cannot be archived or deleted
UPDATE pipelines 
SET is_template = TRUE 
WHERE name IN ('Quick Start Print', 'Quick Start Web', 'Quick Start Print+Web');

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pipelines_archived ON pipelines(archived);
CREATE INDEX IF NOT EXISTS idx_pipelines_is_template ON pipelines(is_template);

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'pipelines'
ORDER BY ordinal_position;
