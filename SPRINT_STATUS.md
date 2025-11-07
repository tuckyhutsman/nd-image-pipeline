# Sprint 1: Complete ✅

## Completed Features

### 1. Delete Functionality
- ✅ Backend: DELETE `/api/jobs/:id` endpoint
- ✅ Backend: DELETE `/api/batches/:batch_id` endpoint (already existed)
- ✅ Frontend: Delete batch button with confirmation
- ✅ Frontend: Delete individual jobs from modal with confirmation
- ✅ Reusable ConfirmDialog component
- ✅ Auto-refresh after deletions

### 2. 3-Dot Menu System
- ✅ Reusable DropdownMenu component
- ✅ React Portal rendering (no layout shifts)
- ✅ Fixed positioning above all UI elements (z-index: 10000)
- ✅ Scroll-aware positioning
- ✅ Click-outside-to-close behavior
- ✅ Integrated in batch rows and job rows

### 3. UI Improvements
- ✅ Responsive modal width (800px max, 90% viewport)
- ✅ Better spacing in modal for 3-dot menus
- ✅ Professional confirmation dialogs
- ✅ Smooth animations

---

# Sprint 2: Next Up 🚀

## Features to Implement

### 1. Custom Batch Names
**Backend:**
```sql
-- Add columns to batches table
ALTER TABLE batches ADD COLUMN custom_name VARCHAR(255);
ALTER TABLE batches ADD COLUMN name_customized BOOLEAN DEFAULT FALSE;
```

**API Endpoints:**
- PATCH `/api/batches/:id/name` - Update custom name
```json
{
  "custom_name": "Client Review - Round 2"
}
```

**Frontend:**
- Editable batch name field in detail modal
- "Reset Name" button (only shown if customized)
- Display custom_name if set, otherwise base_directory_name
- Save button with validation

**UI Flow:**
1. User clicks on batch name in modal → becomes editable input
2. User types new name → "Save" and "Cancel" buttons appear
3. Save → sends PATCH request, updates display
4. "Reset Name" button → clears custom_name, shows auto-generated name

### 2. Download Button with File Size
**Backend:**
```sql
-- Add to batches table
ALTER TABLE batches ADD COLUMN total_output_size BIGINT DEFAULT 0;
```

**Update worker.js:**
- Calculate file sizes on job completion
- Update batch.total_output_size

**Frontend:**
```javascript
// Format file size
formatFileSize(bytes) {
  const kb = bytes / 1024;
  if (kb < 1500) {
    return `${Math.round(kb)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}
```

**Button Style:**
```
↓ Download
   8.2 MB      <- monospace, subtle white opacity
```

**CSS:**
```css
.download-btn {
  min-width: 140px; /* Uniform width */
  display: flex;
  flex-direction: column;
  align-items: center;
}

.download-size {
  font-family: 'SF Mono', 'Courier New', monospace;
  font-size: 0.75rem;
  opacity: 0.7;
  margin-top: 2px;
}
```

### 3. Automatic Cleanup (Background Task)
**Backend:**
- Create `src/services/cleanup-service.js`
- Cron job: runs daily at 2 AM
- Delete batches where:
  - `name_customized = false` AND
  - `created_at < NOW() - INTERVAL '30 days'` AND
  - `status IN ('completed', 'failed')`
- Failed batches: shorter retention (7 days)
- Log all deletions

**Environment Variables:**
```
BATCH_RETENTION_DAYS=30
FAILED_BATCH_RETENTION_DAYS=7
AUTO_CLEANUP_ENABLED=true
CLEANUP_CRON_SCHEDULE="0 2 * * *"
```

---

# Sprint 3: Pipeline Archive System 📦

## Database Schema
```sql
ALTER TABLE pipelines ADD COLUMN archived BOOLEAN DEFAULT FALSE;
ALTER TABLE pipelines ADD COLUMN archived_at TIMESTAMP;
ALTER TABLE pipelines ADD COLUMN is_quick_start BOOLEAN DEFAULT FALSE;

-- Mark existing Quick Start templates
UPDATE pipelines SET is_quick_start = TRUE WHERE name LIKE '%Quick Start%';
```

## API Endpoints
- PATCH `/api/pipelines/:id/archive`
- PATCH `/api/pipelines/:id/unarchive`
- GET `/api/pipelines?archived=true`
- GET `/api/pipelines?archived=false` (default)

## Frontend
**Manage Pipelines Tab:**
```
┌─────────────────────────────────────┐
│ [ Active Templates ] [ Archived ]   │
├─────────────────────────────────────┤
│ ┌──────────────┐  ┌──────────────┐  │
│ │ Quick Start  │  │ My Template  │  │
│ │              │  │            ⋮ │  │
│ │   [Badge]    │  └──────────────┘  │
│ └──────────────┘                    │
└─────────────────────────────────────┘
```

**3-Dot Menu:**
- Edit
- Duplicate
- Archive / Unarchive
- Delete (disabled for Quick Start)

**Protections:**
- Quick Start templates cannot be archived
- Quick Start templates cannot be deleted
- Badge indicator on Quick Start templates
- Archived templates not selectable for new jobs

---

# Sprint 4: Dark Mode 🌙

## Implementation
**CSS Variables:**
```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --bg-tertiary: #f0f0f0;
  --text-primary: #212529;
  --text-secondary: #6c757d;
  --border-color: #dee2e6;
  --accent-color: #007bff;
  --success-color: #28a745;
  --danger-color: #dc3545;
  --warning-color: #ffc107;
}

body.dark-mode {
  --bg-primary: #1e1e1e;
  --bg-secondary: #2d2d2d;
  --bg-tertiary: #3d3d3d;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --border-color: #404040;
  --accent-color: #4dabf7;
  --success-color: #51cf66;
  --danger-color: #ff6b6b;
  --warning-color: #ffd43b;
}
```

**Toggle Component:**
```jsx
<button className="theme-toggle" onClick={toggleDarkMode}>
  {darkMode ? '☀️' : '🌙'}
</button>
```

**Storage:**
```javascript
localStorage.setItem('darkMode', darkMode ? 'true' : 'false');
```

---

# Priority Order

1. **Sprint 2** (2-3 hours)
   - Custom batch names
   - Download button with file sizes
   - Automatic cleanup service

2. **Sprint 3** (3-4 hours)
   - Pipeline archive system
   - Tab switcher UI
   - Protection logic for Quick Start

3. **Sprint 4** (1-2 hours)
   - Dark mode CSS variables
   - Toggle component
   - localStorage persistence

---

# Database Migration Script

```sql
-- Sprint 2: Batch naming and cleanup
ALTER TABLE batches ADD COLUMN IF NOT EXISTS custom_name VARCHAR(255);
ALTER TABLE batches ADD COLUMN IF NOT EXISTS name_customized BOOLEAN DEFAULT FALSE;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS total_output_size BIGINT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_batches_created_at ON batches(created_at);
CREATE INDEX IF NOT EXISTS idx_batches_name_customized ON batches(name_customized);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);

-- Sprint 3: Pipeline archive system
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS is_quick_start BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_pipelines_archived ON pipelines(archived);

-- Mark existing Quick Start templates
UPDATE pipelines SET is_quick_start = TRUE WHERE name LIKE '%Quick Start%';
```

Run on LXC:
```bash
docker exec -it pipeline-db psql -U pipeline_user -d pipeline_db -f /path/to/migration.sql
```
