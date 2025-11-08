# Multi-Asset Pipeline Job Failure - Issue Summary

## Current Status
✅ Frontend UI fixes complete - dropdown filtering and component display now working  
❌ Backend worker failing to process Multi-Asset Pipeline jobs with error:
```
Cannot read properties of undefined (reading 'type')
```

## The Problem

When you submit a job with the newly created Multi-Asset Pipeline (ID 6), all 5 jobs fail immediately during processing.

From the logs:
```
pipeline-worker-1  | Processing job 6a5b1fb9-a221-422d-8cbc-f154288be455...
pipeline-worker-1  |   Pipeline: 6
pipeline-worker-1  |   File: PL-DXB104C_DetoxChocolate_V1_SF106_Front.png
pipeline-worker-1  |   Pipeline type: single  # <-- WRONG! Should be "multi-asset"
pipeline-worker-1  |   Stage 0: Validating and normalizing input...
pipeline-worker-1  |   Stage 0: Validation complete - applied corrections: none
pipeline-worker-1  |   Stage 1: Processing through single pipeline...  # <-- WRONG ROUTE!
pipeline-worker-1  | ✗ Error processing job: Processing failed: Cannot read properties of undefined (reading 'type')
```

## Root Cause

The worker is **incorrectly identifying Pipeline 6 as a "single" pipeline** instead of "multi-asset". This causes it to:
1. Try to process the job through the single-asset route
2. Access `pipelineConfig.format.type` directly
3. Fail because Multi-Asset Pipeline configs don't have a `format` field (their component pipelines do)

## Why Is This Happening?

There are two possible causes:

### Possibility 1: Pipeline Type Not Set Correctly in Database
The `pipeline_type` column in the `pipelines` table might be set to `'single'` instead of `'multi_asset'` for Pipeline ID 6.

**Check this with:**
```sql
SELECT id, name, pipeline_type FROM pipelines WHERE id = 6;
```

**Expected:** `pipeline_type` should be `'multi_asset'`  
**If wrong:** The frontend didn't set it correctly when creating the pipeline

### Possibility 2: Worker Query Issue
The worker might not be properly fetching the `pipeline_type` column, causing it to default to 'single'.

Looking at worker.js line 80-91:
```javascript
const pipelineResult = await db.query(
  'SELECT config, pipeline_type FROM pipelines WHERE id = $1',
  [pipeline_id]
);

// ...

const pipelineType = pipelineResult.rows[0].pipeline_type || 'single';
```

This code looks correct, BUT if the database query fails or returns NULL, it defaults to 'single'.

## Most Likely Issue: Frontend Not Setting Type

Looking at your PipelineEditor.js code (lines 425-460), when saving a Multi-Asset Pipeline:

```javascript
const payload = {
  name: multiAssetForm.name,
  customer_id: 'default',
  config: {
    type: PIPELINE_TYPES.MULTI_ASSET,  // This goes IN the config JSON
    description: multiAssetForm.description,
    components: multiAssetForm.components,
    outputArrangement: multiAssetForm.outputArrangement,
  },
};
```

**THE BUG:** The frontend is setting `config.type = "multi_asset"` but **NOT setting the database column `pipeline_type = "multi_asset"`**!

The `pipeline_type` column is a separate field in the database, not inside the JSON config. The frontend needs to explicitly set it.

## The Fix

Update PipelineEditor.js at line 435 to add the `pipeline_type` field:

```javascript
const payload = {
  name: multiAssetForm.name,
  customer_id: 'default',
  pipeline_type: 'multi_asset',  // <-- ADD THIS LINE
  config: {
    type: PIPELINE_TYPES.MULTI_ASSET,
    description: multiAssetForm.description,
    components: multiAssetForm.components,
    outputArrangement: multiAssetForm.outputArrangement,
  },
};
```

Similarly, for single-asset pipelines (line 385), make sure it's explicitly set:

```javascript
const payload = {
  name: singleAssetForm.name,
  customer_id: 'default',
  pipeline_type: 'single',  // <-- ADD THIS LINE if not already there
  config: {
    type: PIPELINE_TYPES.SINGLE_ASSET,
    ...singleAssetForm,
  },
};
```

## Quick Database Fix (Temporary)

If you want to test right now without rebuilding the frontend, fix the database directly:

```sql
-- Fix Pipeline 6 to be recognized as multi-asset
UPDATE pipelines 
SET pipeline_type = 'multi_asset' 
WHERE id = 6;

-- Verify
SELECT id, name, pipeline_type FROM pipelines WHERE id = 6;
```

Then retry your job submission - it should work!

## Verification Steps

After applying the fix:
1. The logs should show: `Pipeline type: multi-asset` (not "single")
2. The logs should show: `Stage 1: Processing through multi-asset pipeline...`
3. The logs should show: `Multi-Asset: Fetching component pipelines...`
4. Jobs should complete successfully

## Side Issue: "pipeline_user" Database Errors

You have thousands of these errors:
```
FATAL:  database "pipeline_user" does not exist
```

Something is trying to connect to the wrong database. Check your docker-compose.yml and any health check scripts.
