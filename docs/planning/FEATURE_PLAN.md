# Feature Implementation Plan

## Phase 1: Batch Management (Immediate)

### A. Manual Delete Functionality
**Backend:**
- ✅ DELETE `/api/batches/:batch_id` - Already exists in batches.js
- Need to add: DELETE `/api/jobs/:job_id` for individual job deletion

**Frontend:**
- Add delete button with confirmation in batch table row (3-dot menu)
- Add delete button for individual jobs in detail modal
- Show confirmation dialog before deletion
- Refresh list after deletion

### B. Custom Batch Names
**Backend:**
- Add `custom_name` column to batches table
- Add `name_customized` boolean column
- Add PATCH `/api/batches/:batch_id/name` endpoint

**Frontend:**
- Editable batch name in detail modal
- "Reset Name" button (only shown if customized)
- Display custom name in table if set, otherwise show auto-generated name

### C. Automatic Cleanup
**Backend:**
- Create cleanup job/cron service
- Configuration: retention period (e.g., 30 days)
- Delete batches older than retention period
- Exclude batches with custom names (user wants to keep)
- Log cleanup actions

**Settings:**
- Add cleanup configuration to env variables
- `BATCH_RETENTION_DAYS=30`
- `AUTO_CLEANUP_ENABLED=true`

---

## Phase 2: Pipeline/Template Archive System

### A. Database Schema Changes
**Add to pipelines table:**
```sql
ALTER TABLE pipelines ADD COLUMN archived BOOLEAN DEFAULT FALSE;
ALTER TABLE pipelines ADD COLUMN archived_at TIMESTAMP;
ALTER TABLE pipelines ADD COLUMN is_quick_start BOOLEAN DEFAULT FALSE;
```

### B. Backend API Updates
**New endpoints:**
- PATCH `/api/pipelines/:id/archive` - Archive pipeline
- PATCH `/api/pipelines/:id/unarchive` - Unarchive pipeline
- GET `/api/pipelines?archived=true` - List archived pipelines
- GET `/api/pipelines?archived=false` - List active pipelines (default)

**Protection:**
- Quick Start templates cannot be archived
- Return 400 error if attempting to archive Quick Start

### C. Frontend UI
**Manage Pipelines Tab:**
- Tab switcher: "Active Templates" | "Archived Templates"
- 3-dot menu (⋮) on each pipeline card with options:
  - Edit
  - Duplicate
  - Archive / Unarchive
  - Delete (only for non-Quick Start, with confirmation)

**Visual indicators:**
- Quick Start badge on templates
- Archived templates shown in greyed-out state
- Cannot select archived templates for job submission

---

## Phase 3: UI Polish & Enhancements

### A. Download Button with File Size
**Features:**
- Calculate total size of batch outputs
- Display size in button: "↓ Download (8.2 MB)"
- Use monospace font for size
- Size in subtle white opacity
- Uniform button width (use CSS min-width)
- Smart units: KB for <1500 KB, MB for >=1500 KB

**Implementation:**
```javascript
formatFileSize(bytes) {
  const kb = bytes / 1024;
  if (kb < 1500) {
    return `${Math.round(kb)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}
```

**API:**
- Add `total_output_size` to batch response
- Calculate during job completion
- Store in batches table

### B. Dark Mode
**Implementation:**
- Use CSS custom properties (variables)
- Add dark mode toggle in header
- Store preference in localStorage
- Apply `.dark-mode` class to body
- Update all components to respect theme

**Color scheme:**
```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --text-primary: #212529;
  --text-secondary: #6c757d;
  --border-color: #dee2e6;
}

.dark-mode {
  --bg-primary: #1e1e1e;
  --bg-secondary: #2d2d2d;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --border-color: #404040;
}
```

---

## Implementation Order

### Sprint 1 (Today):
1. ✅ Add delete batch functionality
2. ✅ Add delete job functionality
3. ✅ Add 3-dot menu to batch rows
4. ✅ Confirmation dialogs

### Sprint 2 (Next):
1. Custom batch names (editable field + reset button)
2. Download button with file size
3. Monospace styling for sizes

### Sprint 3 (Following):
1. Database schema for archive system
2. Archive/unarchive API endpoints
3. Frontend tab switcher (Active | Archived)
4. 3-dot menu for pipelines

### Sprint 4 (Polish):
1. Dark mode implementation
2. Automatic cleanup cron job
3. Cleanup configuration UI

---

## Database Migration Script

```sql
-- Phase 2: Archive system
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS is_quick_start BOOLEAN DEFAULT FALSE;

-- Mark existing Quick Start templates
UPDATE pipelines SET is_quick_start = TRUE WHERE name LIKE 'Quick Start%';

-- Phase 3: Batch naming and cleanup
ALTER TABLE batches ADD COLUMN IF NOT EXISTS custom_name VARCHAR(255);
ALTER TABLE batches ADD COLUMN IF NOT EXISTS name_customized BOOLEAN DEFAULT FALSE;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS total_output_size BIGINT DEFAULT 0;

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_batches_created_at ON batches(created_at);
CREATE INDEX IF NOT EXISTS idx_batches_name_customized ON batches(name_customized);
```

---

## Notes

**Quick Start Templates:**
- Protected from archiving and deletion
- Always visible
- Badge indicator
- Created during initial setup or migration

**Batch Retention Logic:**
- Batches with custom names are NEVER auto-deleted
- Only auto-generated names are eligible for cleanup
- Completed batches older than retention period
- Failed batches older than 7 days (shorter retention)

**File Size Calculation:**
- Calculate on job completion
- Sum all output file sizes
- Update batch.total_output_size
- Display in human-readable format

**3-Dot Menu Pattern:**
- Use across app for context actions
- Consistent placement (right side of cards/rows)
- Opens dropdown with actions
- Closes on click outside or action selection
