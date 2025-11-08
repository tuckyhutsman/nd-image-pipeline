# Diagnostic: Check Pipeline ID 6

## The Problem
Jobs submitted to Pipeline ID 6 are failing with:
```
✗ Error processing job: Processing failed: Cannot read properties of undefined (reading 'type')
```

This suggests that Pipeline ID 6's configuration is incomplete or malformed.

## Root Cause Analysis

The worker code tries to access `pipelineConfig.format.type` when processing single-asset pipelines. For a Multi-Asset Pipeline, it should:
1. Look up the component pipelines
2. For each component, process through `processSingleAsset()`
3. Each component pipeline needs a proper `config` with `format.type`

## The Issue

Pipeline ID 6 is a **Multi-Asset Pipeline**, which means:
- Its `config` field contains a multi-asset configuration (components, outputArrangement, etc.)
- It does NOT have `format`, `sizing`, `color` etc. directly in its config
- Instead, those settings come from the **component pipelines** it references

However, when the worker processes a multi-asset job, it's calling `processSingleAsset()` with the component pipeline's config. If the component pipeline config is missing or doesn't have a `format` field, we get this error.

## How to Diagnose

Connect to your PostgreSQL database and run:

```sql
-- Check Pipeline 6's configuration
SELECT id, name, pipeline_type, config::text 
FROM pipelines 
WHERE id = 6;

-- Check if Pipeline 6 has components
SELECT 
  pc.id,
  pc.parent_pipeline_id,
  pc.component_pipeline_id,
  pc.order_index,
  p.name as component_name,
  p.config::text as component_config
FROM pipeline_components pc
JOIN pipelines p ON p.id = pc.component_pipeline_id
WHERE pc.parent_pipeline_id = 6
ORDER BY pc.order_index;
```

## Expected Results

### For Multi-Asset Pipeline (ID 6):
```json
{
  "type": "multi_asset",
  "description": "Product Assets",
  "components": [1, 2, 3],  // Array of component pipeline IDs
  "outputArrangement": "flat"
}
```

### For Component Pipelines (IDs 1, 2, 3, etc.):
Each should have:
```json
{
  "type": "single_asset",
  "suffix": "_web",
  "sizing": { ... },
  "format": {
    "type": "png",  // <-- THIS IS WHAT'S MISSING!
    "quality": 85,
    "compression": 66
  },
  "color": { ... },
  "transparency": { ... }
}
```

## Fix Options

### Option 1: Delete and Recreate Pipeline 6
If the pipeline configuration is corrupted, delete it and recreate it through the UI.

### Option 2: Manual Database Fix
If you can identify which component pipeline is missing the `format` field, you can update it directly:

```sql
-- Example: Fix pipeline 1's config to include format
UPDATE pipelines
SET config = jsonb_set(
  config::jsonb,
  '{format}',
  '{"type": "png", "quality": 85, "compression": 66}'::jsonb
)
WHERE id = 1;
```

### Option 3: Check Frontend Submission
The issue might be in how the Multi-Asset Pipeline editor submits the data. Check that when you save a Multi-Asset Pipeline, it's properly storing references to complete Single-Asset Pipelines, not partial configs.

## Quick Test Query

To find pipelines missing format configuration:

```sql
SELECT id, name, pipeline_type,
  CASE 
    WHEN config::jsonb ? 'format' THEN 'HAS format'
    ELSE 'MISSING format'
  END as format_status
FROM pipelines
WHERE pipeline_type = 'single';
```

## About That Other Error

You also have this error repeating in your logs:
```
FATAL:  database "pipeline_user" does not exist
```

This is happening thousands of times. Something (likely a health check or monitoring script) is trying to connect to a database called `pipeline_user` which doesn't exist. Check:
1. Your docker-compose.yml environment variables
2. Any monitoring/health check scripts
3. PgAdmin or other DB tools that might be configured incorrectly
