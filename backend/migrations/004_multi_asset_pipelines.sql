-- Migration 004: Multi-Asset Pipeline System
-- Adds support for pipelines that consist of multiple component pipelines
-- Implements automatic protection for referenced pipelines

-- Add pipeline type column
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS pipeline_type VARCHAR(20) DEFAULT 'single';
-- Values: 'single' (normal pipeline) or 'multi-asset' (composite pipeline)

-- Add protection tracking
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS is_protected BOOLEAN DEFAULT FALSE;
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS protection_reason TEXT;
-- is_protected: TRUE if pipeline is referenced by multi-asset pipeline(s) or is a template
-- protection_reason: Human-readable explanation (e.g., "Referenced by 2 multi-asset pipelines")

-- Create pipeline_components junction table
-- Links multi-asset pipelines to their component pipelines
CREATE TABLE IF NOT EXISTS pipeline_components (
  id SERIAL PRIMARY KEY,
  
  -- The multi-asset pipeline that contains this component
  parent_pipeline_id INTEGER NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  
  -- The component pipeline to execute
  component_pipeline_id INTEGER NOT NULL REFERENCES pipelines(id) ON DELETE RESTRICT,
  -- RESTRICT prevents deletion of component if it's referenced
  
  -- Display order in UI and execution
  order_index INTEGER NOT NULL DEFAULT 0,
  
  -- Optional: Override output suffix for this component
  -- If NULL, uses component pipeline's name as suffix
  custom_suffix VARCHAR(50),
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Prevent adding same pipeline twice to same multi-asset pipeline
  UNIQUE(parent_pipeline_id, component_pipeline_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pipeline_components_parent ON pipeline_components(parent_pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_components_component ON pipeline_components(component_pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_type ON pipelines(pipeline_type);
CREATE INDEX IF NOT EXISTS idx_pipelines_protected ON pipelines(is_protected);

-- Update existing template pipelines to be protected
UPDATE pipelines 
SET is_protected = TRUE, 
    protection_reason = 'System template pipeline'
WHERE is_template = TRUE;

-- Function to update protection status
-- Called whenever pipeline_components are added/removed
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

-- Triggers to maintain protection status
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

-- Add component_id to jobs table to track which component generated each output
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS component_id INTEGER REFERENCES pipeline_components(id);
CREATE INDEX IF NOT EXISTS idx_jobs_component_id ON jobs(component_id);

-- Verify migration
SELECT 
  'Multi-asset pipeline system created' as status,
  (SELECT COUNT(*) FROM pipeline_components) as component_count,
  (SELECT COUNT(*) FROM pipelines WHERE is_protected = TRUE) as protected_pipelines;
