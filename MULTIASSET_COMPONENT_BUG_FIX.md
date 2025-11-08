# Multi-Asset Component Selector - Bug Fix

## Issues Identified

### Issue 1: Dropdown Not Filtering Selected Pipelines
**Problem:** Already-selected pipelines still appear in dropdown  
**Root Cause:** Type mismatch between `comp.ref` and `p.id` (string vs number)

**Current Code (Line 1195):**
```javascript
{singleAssetPipelines
  .filter(p => !multiAssetForm.components.find(c => c.ref === p.id))
  .map(p => (
    <option key={p.id} value={p.id}>{p.name}</option>
  ))}
```

**Fix:** Convert both to strings for comparison:
```javascript
{singleAssetPipelines
  .filter(p => !multiAssetForm.components.find(c => String(c.ref) === String(p.id)))
  .map(p => (
    <option key={p.id} value={p.id}>{p.name}</option>
  ))}
```

### Issue 2: "Unknown Pipeline" Displayed in Selected Components
**Problem:** Pipeline lookup fails, shows "Unknown Pipeline"  
**Root Cause:** Same type mismatch - `comp.ref` (string) vs `p.id` (number)

**Current Code (Line 1215):**
```javascript
const pipeline = singleAssetPipelines.find(p => p.id === comp.ref);
```

**Fix:** Convert both to strings for comparison:
```javascript
const pipeline = singleAssetPipelines.find(p => String(p.id) === String(comp.ref));
```

## Why This Happens

When `addComponent(singleAssetId)` is called:
1. `singleAssetId` comes from `e.target.value` (from <select>)
2. HTML select values are **always strings**
3. But `p.id` from the API is a **number**
4. `comp.ref = singleAssetId` stores the **string** value
5. Later comparisons fail: `"123" === 123` → `false`

## Solution

Use string conversion for all ID comparisons to ensure consistency.

## Files Changed
- `PipelineEditor.js` - Lines 1195 and 1215

## Testing
After fix:
1. Select a pipeline from dropdown → Should disappear from list
2. Select another pipeline → Should also disappear
3. Check "Selected Components" → Should show actual names
4. Reorder components → Should work properly
5. Remove component → Should reappear in dropdown
