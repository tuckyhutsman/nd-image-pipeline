-- Image Processing Pipeline Database Schema
-- Initialization script for PostgreSQL 16
-- Run automatically by docker-entrypoint-initdb.d

-- Connect to the pipeline_db database
\c pipeline_db

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================
-- PIPELINES TABLE
-- ====================
CREATE TABLE IF NOT EXISTS pipelines (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pipelines_active ON pipelines(is_active);
CREATE INDEX idx_pipelines_name ON pipelines(name);

-- ====================
-- BATCHES TABLE
-- ====================
CREATE TABLE IF NOT EXISTS batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Batch identification
  customer_prefix VARCHAR(20) NOT NULL,
  batch_date DATE NOT NULL,
  batch_counter INTEGER NOT NULL,
  base_directory_name VARCHAR(255) NOT NULL,
  
  -- User input
  render_description VARCHAR(255),
  
  -- Statistics
  total_files INTEGER NOT NULL DEFAULT 0,
  total_pipelines INTEGER NOT NULL DEFAULT 1,
  total_size BIGINT NOT NULL DEFAULT 0,
  pipeline_id INTEGER REFERENCES pipelines(id),
  
  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'queued',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  
  -- Future integrations
  dropbox_directory_id VARCHAR(255),
  monday_item_id VARCHAR(255),
  auto_upload_enabled BOOLEAN DEFAULT FALSE,
  monday_sync_enabled BOOLEAN DEFAULT FALSE,
  
  -- Constraints
  UNIQUE(customer_prefix, batch_date, batch_counter)
);

CREATE INDEX idx_batches_customer_date ON batches(customer_prefix, batch_date);
CREATE INDEX idx_batches_status ON batches(status);
CREATE INDEX idx_batches_created_at ON batches(created_at DESC);
CREATE INDEX idx_batches_pipeline_id ON batches(pipeline_id);

-- ====================
-- JOBS TABLE
-- ====================
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Batch reference
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  
  -- Pipeline reference
  pipeline_id INTEGER REFERENCES pipelines(id),
  
  -- Input file info
  input_filename VARCHAR(255) NOT NULL,
  input_format VARCHAR(10),
  input_size BIGINT,
  input_width INTEGER,
  input_height INTEGER,
  input_base64 TEXT,
  
  -- Processing status
  status VARCHAR(50) NOT NULL DEFAULT 'queued',
  progress INTEGER DEFAULT 0,
  current_step VARCHAR(255),
  
  -- Output info
  output_directory VARCHAR(255),
  output_files JSONB,
  
  -- Performance metrics
  processing_time_ms INTEGER,
  queue_wait_time_ms INTEGER,
  
  -- Error tracking
  error_message TEXT,
  error_stack TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  failed_at TIMESTAMP,
  
  -- Metadata
  metadata JSONB,
  worker_id VARCHAR(255)
);

CREATE INDEX idx_jobs_batch_id ON jobs(batch_id);
CREATE INDEX idx_jobs_pipeline_id ON jobs(pipeline_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX idx_jobs_worker_id ON jobs(worker_id);

-- ====================
-- TRIGGERS
-- ====================

-- Update updated_at timestamp on batches
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

-- Update batch status based on job status
CREATE OR REPLACE FUNCTION update_batch_status_from_jobs()
RETURNS TRIGGER AS $$
BEGIN
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

-- Update updated_at timestamp on pipelines
CREATE OR REPLACE FUNCTION update_pipelines_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pipelines_updated_at ON pipelines;
CREATE TRIGGER trigger_pipelines_updated_at
  BEFORE UPDATE ON pipelines
  FOR EACH ROW
  EXECUTE FUNCTION update_pipelines_timestamp();

-- ====================
-- SEED DATA
-- ====================

-- Insert default pipeline (if needed for testing)
INSERT INTO pipelines (name, description, config) VALUES
  ('default-png', 'Default PNG optimization pipeline', '{"type": "single", "format": "png", "compression": 50}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Verify schema creation
SELECT 'Database schema initialized successfully' as status;
SELECT COUNT(*) as pipeline_count FROM pipelines;
