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
  notes TEXT,
  config JSONB NOT NULL,
  pipeline_type VARCHAR(20) DEFAULT 'single',
  is_active BOOLEAN DEFAULT TRUE,
  archived BOOLEAN DEFAULT FALSE,
  is_template BOOLEAN DEFAULT FALSE,
  is_protected BOOLEAN DEFAULT FALSE,
  protection_reason TEXT,
  archived_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pipelines_active ON pipelines(is_active);
CREATE INDEX idx_pipelines_name ON pipelines(name);
CREATE INDEX idx_pipelines_archived ON pipelines(archived);
CREATE INDEX idx_pipelines_is_template ON pipelines(is_template);
CREATE INDEX idx_pipelines_type ON pipelines(pipeline_type);
CREATE INDEX idx_pipelines_protected ON pipelines(is_protected);
CREATE INDEX idx_pipelines_notes_search ON pipelines USING gin(to_tsvector('english', notes));

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
  custom_name VARCHAR(255),
  name_customized BOOLEAN DEFAULT FALSE,

  -- Statistics
  total_files INTEGER NOT NULL DEFAULT 0,
  total_pipelines INTEGER NOT NULL DEFAULT 1,
  total_size BIGINT NOT NULL DEFAULT 0,
  total_output_size BIGINT DEFAULT 0,
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
CREATE INDEX idx_batches_name_customized ON batches(name_customized);

-- ====================
-- PIPELINE COMPONENTS TABLE
-- ====================
-- Links multi-asset pipelines to their component pipelines
CREATE TABLE IF NOT EXISTS pipeline_components (
  id SERIAL PRIMARY KEY,

  -- The multi-asset pipeline that contains this component
  parent_pipeline_id INTEGER NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,

  -- The component pipeline to execute
  component_pipeline_id INTEGER NOT NULL REFERENCES pipelines(id) ON DELETE RESTRICT,

  -- Display order in UI and execution
  order_index INTEGER NOT NULL DEFAULT 0,

  -- Optional: Override output suffix for this component
  custom_suffix VARCHAR(50),

  created_at TIMESTAMP DEFAULT NOW(),

  -- Prevent adding same pipeline twice to same multi-asset pipeline
  UNIQUE(parent_pipeline_id, component_pipeline_id)
);

CREATE INDEX idx_pipeline_components_parent ON pipeline_components(parent_pipeline_id);
CREATE INDEX idx_pipeline_components_component ON pipeline_components(component_pipeline_id);

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
  worker_id VARCHAR(255),

  -- Component tracking for multi-asset pipelines
  component_id INTEGER REFERENCES pipeline_components(id)
);

CREATE INDEX idx_jobs_batch_id ON jobs(batch_id);
CREATE INDEX idx_jobs_pipeline_id ON jobs(pipeline_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX idx_jobs_worker_id ON jobs(worker_id);
CREATE INDEX idx_jobs_component_id ON jobs(component_id);

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

-- Update pipeline protection status when components are added/removed
CREATE OR REPLACE FUNCTION update_pipeline_protection()
RETURNS TRIGGER AS $$
BEGIN
  -- Update protection for the component pipeline
  UPDATE pipelines SET
    is_protected = EXISTS (
      SELECT 1 FROM pipeline_components
      WHERE component_pipeline_id = COALESCE(NEW.component_pipeline_id, OLD.component_pipeline_id)
    ) OR is_template = TRUE,
    protection_reason = CASE
      WHEN is_template = TRUE THEN 'System template pipeline'
      WHEN EXISTS (
        SELECT 1 FROM pipeline_components
        WHERE component_pipeline_id = COALESCE(NEW.component_pipeline_id, OLD.component_pipeline_id)
      ) THEN (
        SELECT 'Referenced by ' || COUNT(*) || ' multi-asset pipeline' ||
               CASE WHEN COUNT(*) > 1 THEN 's' ELSE '' END
        FROM pipeline_components
        WHERE component_pipeline_id = COALESCE(NEW.component_pipeline_id, OLD.component_pipeline_id)
      )
      ELSE NULL
    END
  WHERE id = COALESCE(NEW.component_pipeline_id, OLD.component_pipeline_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_protect_on_component_add ON pipeline_components;
CREATE TRIGGER trigger_protect_on_component_add
  AFTER INSERT ON pipeline_components
  FOR EACH ROW
  EXECUTE FUNCTION update_pipeline_protection();

DROP TRIGGER IF EXISTS trigger_unprotect_on_component_remove ON pipeline_components;
CREATE TRIGGER trigger_unprotect_on_component_remove
  AFTER DELETE ON pipeline_components
  FOR EACH ROW
  EXECUTE FUNCTION update_pipeline_protection();

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
