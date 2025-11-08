-- Migration: Add Batch Grouping System
-- Date: 2025-11-05
-- Purpose: Create batches table and add batch_id to jobs for grouping

-- Create batches table
CREATE TABLE IF NOT EXISTS batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Batch identification
  customer_prefix VARCHAR(20) NOT NULL,              -- e.g., "PL_DXB"
  batch_date DATE NOT NULL,                          -- e.g., 2025-11-05
  batch_counter INTEGER NOT NULL,                    -- 1, 2, 3, etc.
  base_directory_name VARCHAR(255) NOT NULL,         -- e.g., "PL_DXB_2025-11-05_batch-1"
  
  -- User input
  render_description VARCHAR(255),                   -- e.g., "3-view Render" (user-provided)
  
  -- Statistics
  total_files INTEGER NOT NULL DEFAULT 0,            -- Number of input files
  total_pipelines INTEGER NOT NULL DEFAULT 1,        -- Number of pipelines used (1 for now)
  total_size BIGINT NOT NULL DEFAULT 0,              -- Total input size in bytes
  pipeline_id INTEGER REFERENCES pipelines(id),      -- Primary pipeline for batch
  
  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'queued',      -- queued, processing, completed, failed
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  
  -- Future integrations (for Dropbox/Monday)
  dropbox_directory_id VARCHAR(255),
  monday_item_id VARCHAR(255),
  auto_upload_enabled BOOLEAN DEFAULT FALSE,
  monday_sync_enabled BOOLEAN DEFAULT FALSE,
  
  -- Constraints
  UNIQUE(customer_prefix, batch_date, batch_counter)
);

-- Create index for efficient batch queries
CREATE INDEX IF NOT EXISTS idx_batches_customer_date 
  ON batches(customer_prefix, batch_date);

CREATE INDEX IF NOT EXISTS idx_batches_status 
  ON batches(status);

CREATE INDEX IF NOT EXISTS idx_batches_created_at 
  ON batches(created_at DESC);

-- Add batch_id column to jobs table
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES batches(id) ON DELETE CASCADE;

-- Create index for efficient batch-job lookups
CREATE INDEX IF NOT EXISTS idx_jobs_batch_id 
  ON jobs(batch_id);

-- Create index for job status filtering
CREATE INDEX IF NOT EXISTS idx_jobs_status 
  ON jobs(status);

-- Update jobs to reference pipelines properly (if needed)
CREATE INDEX IF NOT EXISTS idx_jobs_pipeline_id 
  ON jobs(pipeline_id);

-- Add created_at index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_jobs_created_at 
  ON jobs(created_at DESC);

-- Create trigger to update batches.updated_at
CREATE OR REPLACE FUNCTION update_batches_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_batches_updated_at ON batches;
CREATE TRIGGER trigger_batches_updated_at
  BEFORE UPDATE ON batches
  FOR EACH ROW
  EXECUTE FUNCTION update_batches_timestamp();

-- Create trigger to update batch status based on jobs
CREATE OR REPLACE FUNCTION update_batch_status_from_jobs()
RETURNS TRIGGER AS $$
BEGIN
  -- Update parent batch status
  IF NEW.batch_id IS NOT NULL THEN
    UPDATE batches SET 
      status = CASE
        WHEN NOT EXISTS (SELECT 1 FROM jobs WHERE batch_id = NEW.batch_id AND status NOT IN ('completed', 'failed'))
          THEN 'completed'
        WHEN EXISTS (SELECT 1 FROM jobs WHERE batch_id = NEW.batch_id AND status = 'processing')
          THEN 'processing'
        WHEN EXISTS (SELECT 1 FROM jobs WHERE batch_id = NEW.batch_id AND status = 'queued')
          THEN 'queued'
        ELSE 'completed'
      END,
      completed_at = CASE
        WHEN NOT EXISTS (SELECT 1 FROM jobs WHERE batch_id = NEW.batch_id AND status NOT IN ('completed', 'failed'))
          THEN NOW()
        ELSE completed_at
      END
    WHERE id = NEW.batch_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_batch_status_on_job_update ON jobs;
CREATE TRIGGER trigger_batch_status_on_job_update
  AFTER UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_batch_status_from_jobs();

-- Clean up old jobs (pre-batch era) - OPTIONAL
-- Uncomment to delete all existing jobs:
-- DELETE FROM jobs WHERE batch_id IS NULL;

-- Verify migration
SELECT 'Batch grouping system created successfully' as status;
