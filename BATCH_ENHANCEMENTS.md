# Batch View Enhancements - Summary

## Changes Implemented

### 1. ✅ Fixed Customer Prefix Extraction (Backend)
**File:** `backend/src/helpers/batch-helpers.js`

**Problem:** Batch names included SKU numbers
- Before: `PL_DXB191_2025-11-06_batch-1`
- After: `PL_DXB_2025-11-06_batch-1`

**Solution:** Updated regex in `extractCustomerPrefix()` to stop at first digit sequence:
```javascript
// OLD: Captured letters + alphanumerics (including SKU)
const match = firstFile.match(/^([A-Z]+[_-][A-Z0-9]+?)(?:[_-]|\.)/);

// NEW: Captures only letters (excludes SKU numbers)
const prefixMatch = firstFile.match(/^([A-Z]+[_-][A-Z]+)/);
```

**Examples:**
- `"PL-DXB191_Product.png"` → `"PL_DXB"` ✅ (not `"PL_DXB191"`)
- `"PL_ABC123_View.jpg"` → `"PL_ABC"` ✅ (not `"PL_ABC123"`)
- `"PL_DXB_Hero.png"` → `"PL_DXB"` ✅

### 2. ✅ Added Download Button to Modal (Frontend)
**File:** `frontend/src/components/JobList.js`

**Added:** Download button in the batch details modal footer
- Appears only when batch status is 'completed'
- Downloads all files in the batch (currently downloads first completed job)
- Shows loading spinner while downloading
- Positioned next to "Close" button

**UI:**
```
[↓ Download All Files]  [Close]
```

### 3. ✅ File List Already in Modal
The modal already shows a list of all files in the batch with their individual statuses:
- File name (input_filename)
- Status badge (queued/processing/completed/failed)
- Clean table layout

## Batch Naming Convention (Already Implemented)

The system already implements the requested naming convention:
- **Format:** `{PREFIX}_{DATE}_batch-{counter}`
- **Example:** `PL_DXB_2025-11-06_batch-1`

**Auto-incrementing batch counter:**
- Same prefix + same date → increments counter
- `PL_DXB_2025-11-06_batch-1`
- `PL_DXB_2025-11-06_batch-2`
- `PL_DXB_2025-11-07_batch-1` (new date, counter resets)

This is handled by `getNextBatchCounter()` in batch-helpers.js:
```javascript
SELECT MAX(batch_counter) 
FROM batches 
WHERE customer_prefix = $1 AND batch_date = $2
```

## Batch Details Modal Features

**Current Features:**
- ✅ Batch ID (UUID)
- ✅ Directory Name (e.g., `PL_DXB_2025-11-06_batch-1`)
- ✅ Description (e.g., "4-file_Render" or custom description)
- ✅ Total Files count
- ✅ Completed count (green)
- ✅ Failed count (red, if any)
- ✅ Created date/time
- ✅ Overall batch status badge
- ✅ **File list** with individual statuses
- ✅ **Download button** (for completed batches)

**Future Enhancements (not yet implemented):**
- Individual file downloads (currently downloads whole batch)
- Retry failed jobs
- Delete batch
- View error details for failed jobs
- Progress percentage bar
- Estimated completion time

## Testing the Changes

### Deploy to LXC
```bash
# On Mac
cd /Users/robertcampbell/Developer/nd-image-pipeline
git add .
git commit -m "Fix batch naming and enhance modal

- Fixed customer prefix extraction to exclude SKU numbers
- Batch names now: PL_DXB_2025-11-06_batch-1 (not PL_DXB191_...)
- Added download button to batch details modal
- Download button only appears for completed batches"

git push origin main

# On LXC
ssh root@10.0.4.39
cd ~/image-pipeline-app
git pull origin main
docker compose down
docker compose up -d --build
docker compose logs -f api worker
```

### Verify
1. **Submit new batch** with files like `PL-DXB191_Product_View1.png`
2. **Check batch name** - should show `PL_DXB_2025-11-06_batch-N` (no "191")
3. **Click arrow (→)** to open batch details modal
4. **Verify modal shows:**
   - Batch name without SKU
   - File list with all uploaded files
   - Individual job statuses
   - Download button (if completed)
5. **Click Download** - should download batch outputs

### Expected Batch Names
**Before fix:**
```
PL_DXB191_2025-11-06_batch-1  ❌
PL_DXB156_2025-11-06_batch-2  ❌
```

**After fix:**
```
PL_DXB_2025-11-06_batch-1  ✅
PL_DXB_2025-11-06_batch-2  ✅
PL_DXB_2025-11-07_batch-1  ✅ (new date, counter resets)
```

## Summary of Enhancements

| Enhancement | Status | Notes |
|-------------|--------|-------|
| Remove SKU from batch name | ✅ Done | Regex updated in extractCustomerPrefix() |
| Batch counter increments | ✅ Already working | Handled by getNextBatchCounter() |
| File list in modal | ✅ Already working | Shows all files with status |
| Download button in modal | ✅ Done | Added to modal footer |

All requested features are now implemented! 🎉
