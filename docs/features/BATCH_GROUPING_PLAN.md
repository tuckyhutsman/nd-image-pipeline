# Batch Grouping System - Implementation Plan

**Status**: Starting November 5, 2025  
**Scope**: Core machinery + UI layer + complementary features  
**Total Estimate**: 3-4 hours

---

## Requirements Finalized

### Batch Identifier
- UUID (auto-generated)
- No inherent data, but paired with rich metadata

### Batch Creation Trigger
- All files submitted together in one "Submit" action
- Each batch = one API submission event

### Batch Metadata to Track

**Immediate (MVP)**
- `batch_id`: UUID (primary key)
- `total_files`: Count of files in batch
- `total_pipelines`: Count of unique pipelines (for multi-asset support)
- `total_size`: Sum of all input file sizes
- `status`: queued | processing | completed | failed
- `pipeline_id`: Primary pipeline used (may have multiple in future)
- `customer_prefix`: Extracted from filenames (e.g., "PL_ABC")
- `base_directory_name`: Constructed name (e.g., "PL_ABC_3-view_Render_2025-11-05")
- `created_at`: Timestamp
- `completed_at`: Timestamp (nullable)

**Future (Post-MVP)**
- `dropbox_directory_id`: Dropbox path for auto-upload
- `monday_item_id`: Monday.com board reference
- `auto_upload_enabled`: Flag for Dropbox sync
- `monday_sync_enabled`: Flag for Monday.com sync

### Customer Prefix Extraction Logic

```
Input filenames:
  - "PL_DXB191_GI_Defense_V1_SF102_Front.png"
  - "PL_DXB191_GI_Defense_V1_SF102_Back.png"
  - "PL_DXB191_GI_Defense_V1_SF102_Side.png"

Extract: "PL_DXB191"

Construct batch directory:
  - Customer: PL_DXB191
  - Job description: 3-view_Render (inferred from filenames)
  - Date: 2025-11-05
  - Result: "PL_DXB191_3-view_Render_2025-11-05"
```

---

## Implementation Phases

### Phase 1: Database Migration (30 min) 🗄️

**New Table: `batches`**
```sql
CREATE TABLE batches (
  id UUID PRIMARY KEY,
  customer_prefix VARCHAR(20),
  base_directory_name VARCHAR(255),
  total_files INTEGER,
  total_pipelines INTEGER,
  total_size BIGINT,
  status VARCHAR(50),
  pipeline_id INTEGER REFERENCES pipelines(id),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  -- Future fields
  dropbox_directory_id VARCHAR(255),
  monday_item_id VARCHAR(255),
  auto_upload_enabled BOOLEAN DEFAULT FALSE,
  monday_sync_enabled BOOLEAN DEFAULT FALSE
);

-- Add batch_id foreign key to jobs table
ALTER TABLE jobs ADD COLUMN batch_id UUID REFERENCES batches(id);
```

**Migration Strategy**
- Create batches table
- For existing jobs: Group by approximate created_at time + pipeline_id
- Create batch records for groups
- Populate batch_id on all job records

### Phase 2: API Refactoring (45 min) 🔌

**New/Updated Endpoints**

1. `/api/batches` - GET
   - Returns list of all batches with summaries
   - Response: `{ batches: [{ id, customer_prefix, base_directory_name, total_files, status, created_at, completed_at }] }`

2. `/api/batches/{batch_id}` - GET
   - Returns full batch with all jobs nested
   - Response: `{ batch: { ...metadata, jobs: [...] } }`

3. `/api/batches/{batch_id}/download` - GET
   - Download entire batch as ZIP
   - Filename: `{base_directory_name}.zip`

4. `/api/jobs` - GET (MODIFIED)
   - Now returns jobs grouped by batch
   - Response: `{ batches: [{ batch_metadata, jobs: [...] }] }`
   - Supports query params: `?filter=status&sort=created_at&search=customer_prefix`

5. `/api/jobs` - POST (MODIFIED)
   - Create batch on initial submission
   - Generate `batch_id`, `customer_prefix`, `base_directory_name`
   - Return `batch_id` to frontend

6. `/api/jobs/batch` - POST (MODIFIED)
   - Same as single but for multiple files
   - All files in submission share same `batch_id`

**Helper Functions to Create**
- `extractCustomerPrefix(filenames)` - Parse "PL_ABC" from filenames
- `generateBaseDirName(prefix, filenames, date)` - Construct batch directory name
- `calculateTotalSize(files)` - Sum file sizes
- `groupJobsByBatch(jobs)` - Transform flat jobs into nested structure

### Phase 3: Frontend UI Update (45 min) 🎨

**JobList.js Changes**
- Change data structure from flat job list to batches
- Display batch as collapsible row
- Show: `{base_directory_name} | {total_files} files | {status} | {created_at}`
- On expand: Show individual job rows
- Add batch-level actions: Download, Delete, Details

**New Components/Features**
- BatchRow component - Displays batch summary
- BatchJobsList component - Shows jobs within batch
- Batch details modal (redesigned)

### Phase 4: Complementary Features (30 min) ✨

**Batch Download**
- Button on batch row
- Downloads: `{base_directory_name}.zip`
- Contains all output files from all jobs in batch

**Filtering/Sorting**
- Filter by status: queued, processing, completed, failed
- Filter by customer: PL_ABC, PL_DXB, etc.
- Sort by: created_at, total_files, status
- Search by: customer_prefix, base_directory_name

**Job Details Modal Redesign**
- Show batch context at top
- List all files in batch
- Individual file details expandable

### Phase 5: Polish & Testing (30 min) 💎

- Test batch creation on submit
- Test grouping of existing jobs
- Test filtering/sorting
- Test batch download
- Verify customer prefix extraction works with edge cases

---

## Files to Modify/Create

### Backend
- `backend/src/routes/jobs.js` - Add batch grouping logic
- NEW: `backend/src/routes/batches.js` - Batch-specific endpoints
- NEW: `backend/src/helpers/batch-helpers.js` - Prefix extraction, naming logic
- `backend/src/server.js` - Register batch routes

### Frontend
- `frontend/src/components/JobList.js` - Batch display
- NEW: `frontend/src/components/BatchRow.js` - Batch summary row
- NEW: `frontend/src/components/BatchJobsList.js` - Jobs within batch
- `frontend/src/components/JobList.css` - Batch styling

### Database
- NEW: Migration file for batches table

---

## Implementation Order

1. **Database**: Create batches table, migration
2. **Backend Helpers**: Prefix extraction, directory naming
3. **Backend Routes**: Batch CRUD and grouping logic
4. **API Integration**: Update jobs endpoints
5. **Frontend Components**: Batch display logic
6. **UI Refinement**: Styling, interactions
7. **Testing**: Full workflow validation

---

## Questions Before Starting

1. Should we keep the existing JobList UI structure mostly intact and add batches, or completely redesign from scratch?

2. For the `base_directory_name`, the format you suggested is: `{customer_prefix}_{job_description}_{date}`
   - How should we extract "job_description" (e.g., "3-view_Render")?
   - Should we look for common patterns in filenames?
   - Or should users optionally name their batch when submitting?

3. For existing jobs in the database (before batches existed), should we:
   - Auto-group them by pipeline + created_at window?
   - Leave them ungrouped?
   - Mark them separately?

4. Ready to start Phase 1 (database) now? 🚀

