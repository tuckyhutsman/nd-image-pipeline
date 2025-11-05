# Batch Grouping System - Phase 1 Complete ✅

**Date**: November 5, 2025  
**Status**: Phase 1 (Core Machinery) - READY FOR TESTING

---

## What's Been Implemented

### 🗄️ **Database Layer**

**File**: `backend/migrations/001_add_batch_grouping.sql`

**Schema Changes**:
- New `batches` table with complete batch metadata
- `batch_id` foreign key added to `jobs` table
- Automatic triggers to update batch status based on job updates
- Optimized indexes for filtering/sorting queries

**Key Tables**:

```sql
batches
├── id (UUID) - Primary key
├── customer_prefix - "PL_DXB" (extracted from filenames)
├── batch_date - "2025-11-05"
├── batch_counter - 1, 2, 3...
├── base_directory_name - "PL_DXB_2025-11-05_batch-1"
├── render_description - "3-view Render" (user-provided)
├── total_files, total_pipelines, total_size
├── status - queued|processing|completed|failed
├── created_at, updated_at, completed_at
└── dropbox_directory_id, monday_item_id (future use)

jobs
├── id
├── batch_id (NEW - links to batch)
├── pipeline_id
├── status
├── file_name
├── ... (existing fields)
```

**Triggers**:
- `trigger_batches_updated_at` - Auto-updates `batches.updated_at`
- `trigger_batch_status_on_job_update` - Auto-updates batch status when jobs complete

---

### 🔧 **Backend Helpers**

**File**: `backend/src/helpers/batch-helpers.js`

Core functions for batch management:

```javascript
extractCustomerPrefix(filenames)        // "PL-DXB191_..." → "PL_DXB"
getNextBatchCounter(db, prefix, date)   // Gets batch-1, batch-2, etc.
generateBaseDirName(prefix, date, num)  // "PL_DXB_2025-11-05_batch-1"
calculateTotalSize(files)               // Sum of file sizes
inferRenderDescription(fileCount)       // "3-file_Render" auto-generation
createBatch(db, {...})                  // Main batch creation logic
getBatchWithJobs(db, batchId)           // Fetch batch + nested jobs
getAllBatches(db, {...})                // Query with filtering/sorting
getBatchStats(db)                       // Dashboard statistics
updateBatchStatus(db, batchId, status)  // Update batch status
```

---

### 📡 **API Endpoints**

**File**: `backend/src/routes/batches.js` (NEW)

**Batch Endpoints**:
```
GET    /api/batches                    List all batches (filterable, sortable)
GET    /api/batches/stats              Batch statistics for dashboard
GET    /api/batches/:batch_id          Get batch with nested jobs
GET    /api/batches/:batch_id/download Download entire batch as ZIP
DELETE /api/batches/:batch_id          Delete batch and all jobs
```

**File**: `backend/src/routes/jobs.js` (UPDATED)

**Updated Job Endpoints**:
```
GET    /api/jobs                       List batches (grouped view, not individual jobs)
GET    /api/jobs/batch/:batch_id       Get all jobs in a batch
GET    /api/jobs/:id                   Get specific job
GET    /api/jobs/:id/download          Download single job output
POST   /api/jobs                       Submit single job (creates batch)
POST   /api/jobs/batch                 Submit batch of jobs (creates batch)
GET    /api/jobs/stats/dashboard       Queue statistics
```

**Key Changes**:
- Single jobs now create individual batches
- Batch submissions group multiple files together
- Both endpoints create `batches` records automatically
- Jobs automatically linked to parent batch via `batch_id`

---

## Data Flow

### Single Job Submission

```
User submits 1 file
    ↓
POST /api/jobs
    ↓
Create Batch {
  customer_prefix: extracted from filename
  batch_date: today
  batch_counter: auto-incremented
  base_directory_name: "PL_DXB_2025-11-05_batch-1"
  render_description: user input or auto-generated
}
    ↓
Create Job linked to Batch
    ↓
Queue job
    ↓
Return { job_id, batch_id, status }
```

### Batch Job Submission

```
User submits 3 files with description "3-view Render"
    ↓
POST /api/jobs/batch
    ↓
Create Batch {
  customer_prefix: extracted
  render_description: "3-view Render"
  total_files: 3
  status: queued
}
    ↓
Create 3 Jobs all linked to same Batch
    ↓
Queue all 3 jobs
    ↓
Return { batch_id, job_ids: [...], status }
```

### Batch Status Updates

```
Job 1 completes → Batch status: processing
Job 2 completes → Batch status: processing
Job 3 completes → Batch status: completed (auto via trigger)
    ↓
Trigger fires and sets completed_at timestamp
```

---

## Core Machinery Benefits

This foundation enables all downstream features:

### ✅ **Batch Grouping in UI** (Phase 2)
- Load batches from `/api/batches`
- Display as collapsible rows
- Expand to see individual jobs

### ✅ **Batch Download** (Phase 2)
- Single endpoint: `GET /api/batches/:batch_id/download`
- Returns ZIP with all completed outputs
- File naming: base_directory_name.zip

### ✅ **Job Filtering** (Phase 2)
- Filter by status: `/api/batches?status=completed`
- Filter by customer: `/api/batches?customer_prefix=PL_DXB`
- Sort by: created_at, total_files, status

### ✅ **Search** (Phase 2)
- Query by batch name in frontend
- Sort by date, file count, status
- Pagination support built-in

---

## Key Features

### Batch Identification

```javascript
// Example batch creation
base_directory_name: "PL_DXB_2025-11-05_batch-1"
render_description: "3-view Render"
customer_prefix: "PL_DXB"

// Easy for Dropbox/Monday integration:
// dropbox_path = `/Renders/${customer_prefix}/2025-11-05/${render_description}/`
// monday_column = `${base_directory_name}`
```

### Automatic Status Tracking

Batch status automatically managed by database triggers:
- **queued** - All jobs waiting
- **processing** - At least one job running
- **completed** - All jobs done (success/failure)
- **failed** - Explicitly marked failed

### Graceful Filtering

All filters are optional:
```javascript
// Get all batches
GET /api/batches

// Get specific customer's batches
GET /api/batches?customer_prefix=PL_DXB

// Get failed batches
GET /api/batches?status=failed

// Get completed batches for customer, sorted by date
GET /api/batches?customer_prefix=PL_DXB&status=completed&sort_by=batch_date
```

---

## Migration Path

### Step 1: Run Migration (Dev/LXC)

```bash
# Using psql
psql -U postgres -d nd_image_pipeline < backend/migrations/001_add_batch_grouping.sql

# OR via backend initialization (add to server.js startup):
const fs = require('fs');
const migration = fs.readFileSync('backend/migrations/001_add_batch_grouping.sql', 'utf8');
await global.db.query(migration);
```

### Step 2: Clear Old Data (Optional)

```bash
# Delete pre-batch jobs (per your decision)
psql -U postgres -d nd_image_pipeline -c "DELETE FROM jobs WHERE batch_id IS NULL;"
```

### Step 3: Test

```bash
# Verify tables exist
psql -U postgres -d nd_image_pipeline -c "\dt batches, jobs"

# Check indexes
psql -U postgres -d nd_image_pipeline -c "\di"
```

---

## API Response Examples

### GET /api/batches

```json
{
  "data": [
    {
      "id": "uuid",
      "customer_prefix": "PL_DXB",
      "batch_date": "2025-11-05",
      "batch_counter": 1,
      "base_directory_name": "PL_DXB_2025-11-05_batch-1",
      "render_description": "3-view Render",
      "total_files": 3,
      "status": "completed",
      "created_at": "2025-11-05T14:30:00Z",
      "completed_at": "2025-11-05T14:45:00Z"
    }
  ],
  "total": 15,
  "limit": 50,
  "offset": 0
}
```

### GET /api/batches/:batch_id

```json
{
  "id": "uuid",
  "base_directory_name": "PL_DXB_2025-11-05_batch-1",
  "render_description": "3-view Render",
  "customer_prefix": "PL_DXB",
  "total_files": 3,
  "status": "completed",
  "jobs": [
    {
      "id": "job-uuid-1",
      "file_name": "PL_DXB_Front.png",
      "status": "completed",
      "created_at": "2025-11-05T14:30:00Z"
    },
    {
      "id": "job-uuid-2",
      "file_name": "PL_DXB_Side.png",
      "status": "completed",
      "created_at": "2025-11-05T14:31:00Z"
    },
    {
      "id": "job-uuid-3",
      "file_name": "PL_DXB_Back.png",
      "status": "completed",
      "created_at": "2025-11-05T14:32:00Z"
    }
  ]
}
```

### POST /api/jobs/batch

```json
Request:
{
  "pipeline_id": 1,
  "files": [
    { "file_name": "image1.png", "file_data": "base64..." },
    { "file_name": "image2.png", "file_data": "base64..." }
  ],
  "batch_description": "3-view Render"
}

Response:
{
  "batch_id": "uuid",
  "base_directory_name": "PL_DXB_2025-11-05_batch-1",
  "job_count": 2,
  "job_ids": ["job-id-1", "job-id-2"],
  "status": "queued"
}
```

---

## Testing Checklist

### Database
- [ ] Migration runs without errors
- [ ] `batches` table exists with all columns
- [ ] `batch_id` added to `jobs` table
- [ ] Indexes created for performance
- [ ] Triggers created and functional

### API - Batch Creation
- [ ] Single job creates batch automatically
- [ ] Batch submission creates batch with multiple jobs
- [ ] Customer prefix extracted correctly
- [ ] Batch counter incremented per day
- [ ] Base directory name formatted correctly
- [ ] Render description auto-generated if empty

### API - Batch Queries
- [ ] GET /api/batches returns all batches
- [ ] GET /api/batches?status=completed filters correctly
- [ ] GET /api/batches/:batch_id returns batch with jobs
- [ ] GET /api/batches?customer_prefix=PL_DXB filters
- [ ] Sorting by created_at, total_files, status

### API - Batch Download
- [ ] GET /api/batches/:batch_id/download returns ZIP
- [ ] ZIP filename is base_directory_name.zip
- [ ] All job output files included
- [ ] input_* files excluded
- [ ] Proper content headers set

### Status Management
- [ ] New batches start as "queued"
- [ ] Batch becomes "processing" when first job starts
- [ ] Batch becomes "completed" when all jobs done
- [ ] Timestamps (created_at, completed_at) correct
- [ ] Batch status auto-updated by triggers

---

## Performance Notes

- **Indexes optimized** for common queries (customer, date, status)
- **Batch statistics** can be cached for dashboard
- **Pagination** supports large result sets
- **ZIP generation** streams to avoid memory issues
- **Database triggers** efficient (minimal overhead)

---

## Next: Phase 2

Ready to build:
1. **Frontend - JobList Redesign** (1 hour)
   - Display batches instead of individual jobs
   - Collapsible rows to show jobs
   - Batch summary info

2. **Frontend - Batch Download** (30 min)
   - Add download button per batch
   - ZIP name = base_directory_name.zip

3. **Frontend - Filtering & Sorting** (45 min)
   - Filter by status, customer, date
   - Sort options
   - Search functionality

---

## Files Created/Modified

```
✅ backend/migrations/001_add_batch_grouping.sql     (NEW - 100 lines)
✅ backend/src/helpers/batch-helpers.js              (NEW - 200 lines)
✅ backend/src/routes/batches.js                     (NEW - 150 lines)
✅ backend/src/routes/jobs.js                        (MODIFIED - +100 lines)
✅ backend/src/server.js                             (MODIFIED - register batches route)
```

---

Phase 1 Complete! 🎉 Core machinery is solid and ready for Phase 2 UI work.

