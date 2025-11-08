-- Sprint 2: Batch naming and cleanup migration
-- Run this on the database to add required columns

-- Add custom naming columns
ALTER TABLE batches ADD COLUMN IF NOT EXISTS custom_name VARCHAR(255);
ALTER TABLE batches ADD COLUMN IF NOT EXISTS name_customized BOOLEAN DEFAULT FALSE;

-- Add file size tracking
ALTER TABLE batches ADD COLUMN IF NOT EXISTS total_output_size BIGINT DEFAULT 0;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_batches_created_at ON batches(created_at);
CREATE INDEX IF NOT EXISTS idx_batches_name_customized ON batches(name_customized);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'batches'
ORDER BY ordinal_position;
