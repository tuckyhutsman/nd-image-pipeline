# Multi-Asset Pipeline Component Selection - Bug Fix

## Issues Fixed

### 1. Dropdown Not Filtering Selected Pipelines
**Problem**: The dropdown menu continued to show all Single Asset Pipelines even after they were added to the Multi-Asset Pipeline.

**Root Cause**: Type mismatch in the comparison. The `comp.ref` values (stored as strings from the select dropdown) were being compared with `p.id` values (numbers from the database) using strict equality (`===`).

**Fix**: Changed comparison to use type coercion by converting both values to strings:
```javascript
// Before:
.filter(p => !multiAssetForm.components.find(c => c.ref === p.id))

// After:
.filter(p => !multiAssetForm.components.find(c => String(c.ref) === String(p.id)))
```

**Location**: Line 1274 in `/frontend/src/components/PipelineEditor.js`

### 2. Selected Components Showing "Unknown Pipeline"
**Problem**: The "Selected Components" list showed "Unknown Pipeline" for all items instead of the actual pipeline names.

**Root Cause**: Same type mismatch issue. When looking up pipeline details, the code was comparing `p.id === comp.ref` with strict equality, which failed due to type mismatch.

**Fix**: Changed lookup to use type-safe string comparison:
```javascript
// Before:
const pipeline = singleAssetPipelines.find(p => p.id === comp.ref);

// After:
const pipeline = singleAssetPipelines.find(p => String(p.id) === String(comp.ref));
```

**Location**: Line 1288 in `/frontend/src/components/PipelineEditor.js`

## Expected Behavior After Fix

1. **Dropdown filtering**: When you add a Single Asset Pipeline to the Multi-Asset Pipeline, it should immediately disappear from the dropdown menu
2. **Component display**: Each selected component should show its actual pipeline name and suffix (e.g., "Web Standard → _web")
3. **Reordering UI**: The up/down arrows should work correctly, allowing you to reorder the pipeline components

## Testing Recommendations

1. Create a new Multi-Asset Pipeline
2. Add several Single Asset Pipelines to it
3. Verify that:
   - Each added pipeline disappears from the dropdown
   - The selected component list shows the correct pipeline names
   - The reorder buttons (↑↓) work as expected
   - The remove button (✕) works and returns the pipeline to the dropdown

## Technical Notes

This is a classic JavaScript type coercion issue. HTML `<select>` elements always return string values via `e.target.value`, while database IDs are typically stored as integers. The strict equality operator (`===`) won't match "5" with 5, causing the comparison to fail.

Using `String()` conversion ensures both sides are strings before comparison, making the equality check work correctly regardless of the original type.
