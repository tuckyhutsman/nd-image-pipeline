# Batch Grouping System - Finalized Specifications

**Date**: November 5, 2025  
**Status**: Ready for implementation

---

## Finalized Decisions

### Q1: Job Description / Render Type - USER INPUT ✅

**Decision**: Ask user to name the batch when submitting

**Reasoning**:
- Edge cases make hard-coded parsing unreliable
- User knows best what they're rendering (3-view, side-panels, bottles, etc.)
- Future integration with Monday Design Queue can pull render type from there
- Keeps the system flexible and extensible

**Implementation**:
- Add optional text field to JobSubmit form: "Batch Name / Render Description"
- Example placeholder: "3-view Render" or "Hero Images" or "Social Media Assets"
- If left blank: Auto-generate from file count like "3-files_Render"
- Max 50 characters, alphanumeric + hyphens/underscores

---

### Q2: Batch Directory Name Format ✅

**Decision**: `{customer_prefix}_{date}_batch-{counter}`

**Format**: `PL_DXB_2025-11-05_batch-1`

**Examples**:
- First batch of the day: `PL_DXB_2025-11-05_batch-1`
- Second batch same day: `PL_DXB_2025-11-05_batch-2`
- Different customer: `PL_ABC_2025-11-05_batch-1`

**Benefits**:
- No product SKU (allows multiple products per batch ✓)
- Date-based organization (easy file browsing ✓)
- Counter for same-day batches (simple, readable ✓)
- Future-proof for Dropbox/Monday integration ✓

**Counter Logic**:
- Query existing batches for date
- Find max batch number
- Increment by 1

---

### Q3: Existing Pre-Batch Jobs ✅

**Decision**: Delete all existing jobs

**Reasoning**:
- Clean slate for new batch system
- Existing test data won't be grouped correctly
- LXC is development environment
- User has already tested with current data

**Migration**:
- Drop existing jobs (they had input/output files anyway)
- Create fresh batches table
- Start fresh when new system launches

---

## Updated Data Model

### Batches Table

```sql
CREATE TABLE batches (
  id UUID PRIMARY KEY,
  customer_prefix VARCHAR(20) NOT NULL,      -- "PL_DXB"
  batch_date DATE NOT NULL,                   -- 2025-11-05
  batch_counter INTEGER NOT NULL,             -- 1, 2, 3...
  base_directory_name VARCHAR(255) NOT NULL, -- "PL_DXB_2025-11-05_batch-1"
  render_description VARCHAR(255),            -- "3-view Render" (user input)
  total_files INTEGER NOT NULL,               -- 3
  total_pipelines INTEGER NOT NULL,           -- 1 (for now)
  total_size BIGINT NOT NULL,                 -- bytes
  status VARCHAR(50) NOT NULL,                -- queued|processing|completed|failed
  pipeline_id INTEGER REFERENCES pipelines(id),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  
  -- Future fields (unused for now)
  dropbox_directory_id VARCHAR(255),
  monday_item_id VARCHAR(255),
  auto_upload_enabled BOOLEAN DEFAULT FALSE,
  monday_sync_enabled BOOLEAN DEFAULT FALSE,
  
  UNIQUE(customer_prefix, batch_date, batch_counter)
);
```

### Jobs Table (Modified)

```sql
-- Add to existing jobs table:
ALTER TABLE jobs ADD COLUMN batch_id UUID REFERENCES batches(id) ON DELETE CASCADE;
ALTER TABLE jobs ADD INDEX idx_batch_id (batch_id);
```

---

## Implementation Phases (Updated)

### Phase 1: Database Setup (20 min)
- [ ] Create batches table
- [ ] Add batch_id to jobs table
- [ ] Create migration
- [ ] Delete existing jobs data (clean slate)

### Phase 2: Backend Helpers (30 min)
- [ ] `extractCustomerPrefix(filenames)` - Parse "PL_ABC" from filenames
- [ ] `getNextBatchCounter(prefix, date)` - Query and increment counter
- [ ] `generateBaseDirName(prefix, date, counter)` - Build "PL_ABC_2025-11-05_batch-1"
- [ ] `calculateTotalSize(files)` - Sum file sizes
- [ ] `inferRenderDescription(filenames)` - Optional auto-description fallback

### Phase 3: Backend API Refactoring (45 min)
- [ ] `/api/jobs` POST - Create batch on submission
- [ ] `/api/jobs/batch` POST - Batch submission with shared batch_id
- [ ] `/api/batches` GET - List all batches
- [ ] `/api/batches/{batch_id}` GET - Get batch with nested jobs
- [ ] `/api/batches/{batch_id}/download` GET - Download entire batch as ZIP
- [ ] Update `/api/jobs` GET - Return grouped by batch

### Phase 4: Frontend - Job Submit Form (20 min)
- [ ] Add "Batch Description" optional text field
- [ ] Show placeholder: "e.g., 3-view Render, Hero Images, Social Media"
- [ ] Validate: max 50 chars, alphanumeric + hyphens/underscores
- [ ] Pass to API on submission

### Phase 5: Frontend - Job List Redesign (45 min)
- [ ] Change JobList to display batches instead of individual jobs
- [ ] Batch row shows: `{base_directory_name} | {render_description} | {total_files} files | {status}`
- [ ] Collapsible to show individual jobs
- [ ] Batch-level actions: Download All, Details, Delete

### Phase 6: Filtering & Sorting (20 min)
- [ ] Filter by status, customer prefix, date
- [ ] Sort by created_at, total_files, status
- [ ] Search by batch name, description

### Phase 7: Batch Download (15 min)
- [ ] Add download button to batch row
- [ ] Downloads all output files in batch
- [ ] Filename: `{base_directory_name}.zip`

### Phase 8: Polish & Testing (30 min)
- [ ] Test batch creation
- [ ] Test customer prefix extraction
- [ ] Test batch counter logic
- [ ] Test full workflow: submit → process → download
- [ ] Test filtering and sorting

**Total Time**: 3-3.5 hours

---

## Files to Create/Modify

### Backend
- `backend/src/routes/batches.js` - NEW
- `backend/src/helpers/batch-helpers.js` - NEW
- `backend/src/routes/jobs.js` - MODIFY
- `backend/src/server.js` - MODIFY (register routes)

### Frontend
- `frontend/src/components/JobSubmit.js` - MODIFY (add batch description field)
- `frontend/src/components/JobList.js` - MODIFY (batch display)
- `frontend/src/components/BatchRow.js` - NEW
- `frontend/src/components/JobList.css` - MODIFY (batch styling)

### Database
- Migration script for schema changes

---

## Customer Prefix Extraction Logic

```javascript
// Examples:
extractCustomerPrefix("PL-DXB191_GI_Defense_V1_SF102_Front.png")
// Returns: "PL_DXB"

extractCustomerPrefix("PL_ABC123_Product_Name_View.jpg")
// Returns: "PL_ABC"

// Logic:
// 1. Take everything before first underscore or hyphen
// 2. If starts with "PL", keep it
// 3. Normalize hyphens to underscores
// 4. Take first 20 chars max
```

---

## Render Description Fallback

If user doesn't provide render description:

```javascript
// Auto-generate from file count
if (!renderDescription && totalFiles > 0) {
  renderDescription = `${totalFiles}-file_Render`;
  // Examples: "3-file_Render", "2-file_Render", "1-file_Render"
}
```

---

## Ready to Start! 🚀

**Next Step**: Phase 1 - Database Migration

Shall I start creating the migration and database setup code?

