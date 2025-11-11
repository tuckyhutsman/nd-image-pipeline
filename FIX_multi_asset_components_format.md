# Multi-Asset Pipeline Components Fix

## The Problem

After fixing the `pipeline_type` issue, the Multi-Asset Pipeline jobs were still failing with:
```
Pipeline type: multi_asset  ← Correct!
Stage 1: Processing through multi_asset pipeline...
✗ Error: Cannot read properties of undefined (reading 'type')
```

The worker was correctly identifying the pipeline as multi-asset, but failing when trying to fetch component pipelines.

## Root Cause

**Frontend-Backend Data Format Mismatch**

The frontend was sending components in the wrong format:
```javascript
// Frontend sent:
config: {
  components: [
    { ref: 1, order: 1 },
    { ref: 2, order: 2 }
  ]
}

// Backend expected:
components: [
  { pipeline_id: 1, custom_suffix: null },
  { pipeline_id: 2, custom_suffix: null }
]
```

The backend API (pipelines.js) was looking for `component.pipeline_id`, but the frontend was sending `component.ref`. This meant **zero component rows were being inserted** into the `pipeline_components` table!

## The Fix

Changed the Multi-Asset Pipeline save payload to:
1. Send `components` as a **top-level field** (not inside config)
2. Transform the internal `{ ref, order }` format to the API's expected `{ pipeline_id, custom_suffix }` format
3. Keep only metadata (`description`, `outputArrangement`) in the `config` JSON

**Before:**
```javascript
config: {
  type: PIPELINE_TYPES.MULTI_ASSET,
  description: multiAssetForm.description,
  components: multiAssetForm.components,  // Wrong format, wrong place!
  outputArrangement: multiAssetForm.outputArrangement,
}
```

**After:**
```javascript
components: multiAssetForm.components.map(comp => ({
  pipeline_id: parseInt(comp.ref),  // Convert ref → pipeline_id
  custom_suffix: comp.custom_suffix || null
})),
config: {
  type: PIPELINE_TYPES.MULTI_ASSET,
  description: multiAssetForm.description,
  outputArrangement: multiAssetForm.outputArrangement,
  // NO components here anymore
}
```

## What This Fixes

1. ✅ Components will now be inserted into `pipeline_components` table
2. ✅ Worker will find component pipelines when processing multi-asset jobs
3. ✅ Each input file will generate multiple output files (one per component)
4. ✅ Multi-Asset Pipeline jobs will complete successfully

## Database State

**Current Problem:**
Your existing Pipeline 6 has NO components in the database:
```sql
SELECT * FROM pipeline_components WHERE parent_pipeline_id = 6;
-- Returns 0 rows!
```

**Solution:**
After deploying this fix, you'll need to:
1. Delete the broken Pipeline 6
2. Create a NEW Multi-Asset Pipeline through the UI
3. The new one will have components properly inserted

## Testing Steps

1. **Deploy the fix**
2. **Delete Pipeline 6** (it's broken - no components)
3. **Create a new Multi-Asset Pipeline:**
   - Go to "Manage Pipelines"
   - Click "+ Multi Asset"
   - Add 2-3 Single Asset Pipelines
   - Save
4. **Verify in database:**
   ```sql
   SELECT pc.*, p.name 
   FROM pipeline_components pc
   JOIN pipelines p ON p.id = pc.component_pipeline_id
   WHERE pc.parent_pipeline_id = [new_pipeline_id];
   ```
5. **Submit a test batch** with the new pipeline
6. **Watch worker logs** - should see:
   ```
   Pipeline type: multi_asset
   Multi-Asset: Fetching component pipelines...
   Multi-Asset: Processing through N components...
   → Component 1/N: [pipeline name]
     ✓ [output file]
   ✓ Multi-Asset complete: N outputs
   ✓ Job completed
   ```

## Files Changed

- `frontend/src/components/PipelineEditor.js` - Line 399-407

## Git Commit

```bash
git add frontend/src/components/PipelineEditor.js

git commit -m "Fix Multi-Asset Pipeline component data format mismatch

- Transform internal component format (ref/order) to API format (pipeline_id/custom_suffix)
- Move components array from config to top-level field in API payload
- Ensures components are properly inserted into pipeline_components table
- Fixes 'Cannot read properties of undefined' error when processing multi-asset jobs

Previous issue: Frontend sent components in config with 'ref' field, but API expected
top-level 'components' array with 'pipeline_id' field. This caused zero component
rows to be inserted, making multi-asset pipelines fail during processing."
```

## Why The Existing Pipeline 6 Won't Work

Even after this fix, Pipeline 6 is already in the database **without any components**. You can't retroactively add components to it because the frontend stores components in the internal format (`{ ref, order }`), not the database format.

**Easiest solution:** Delete it and create a fresh one after deploying the fix.
