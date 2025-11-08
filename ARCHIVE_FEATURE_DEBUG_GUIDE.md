# Archive/Unarchive Feature - Complete Debug Guide

## Overview
The archive feature allows pipelines to be hidden from active use without permanently deleting them. Archived pipelines can be restored (unarchived) at any time.

---

## Backend API Endpoints

### 1. Archive Pipeline
**Endpoint:** `PATCH /api/pipelines/:id/archive`
**Purpose:** Marks a pipeline as archived
**Request:** No body needed
**Response:** 
```json
{
  "message": "Pipeline archived",
  "pipeline": {
    "id": 123,
    "name": "My Pipeline",
    "archived": true,
    "archived_at": "2025-11-08T12:00:00Z"
  }
}
```

### 2. Unarchive Pipeline
**Endpoint:** `PATCH /api/pipelines/:id/unarchive`
**Purpose:** Restores an archived pipeline to active status
**Request:** No body needed
**Response:**
```json
{
  "message": "Pipeline unarchived",
  "pipeline": {
    "id": 123,
    "name": "My Pipeline",
    "archived": false,
    "archived_at": null
  }
}
```

### 3. Get All Pipelines
**Endpoint:** `GET /api/pipelines`
**Returns:** All pipelines including archived ones
**Response:**
```json
[
  {
    "id": 1,
    "name": "Active Pipeline",
    "archived": false,
    "archived_at": null,
    "created_at": "2025-11-01T10:00:00Z"
  },
  {
    "id": 2,
    "name": "Archived Pipeline",
    "archived": true,
    "archived_at": "2025-11-05T14:30:00Z",
    "created_at": "2025-11-01T10:00:00Z"
  }
]
```

---

## Database Schema

### pipelines table
```sql
CREATE TABLE pipelines (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  customer_id VARCHAR(255) NOT NULL,
  config JSONB NOT NULL,
  archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Key Fields:**
- `archived` (boolean): true = archived, false = active
- `archived_at` (timestamp): When pipeline was archived (null if active)

---

## Frontend Implementation

### State Management
```javascript
const [activeTab, setActiveTab] = useState('active'); // 'active' or 'archived'
const [confirmDialog, setConfirmDialog] = useState(null); // For confirmation modals
```

### Filtering Logic
```javascript
// Filter pipelines by active tab AND pipeline type
const matchesTab = activeTab === 'active' ? !p.archived : p.archived;
const matchesType = config.type === PIPELINE_TYPES.SINGLE_ASSET; // or MULTI_ASSET

return matchesTab && matchesType;
```

### Archive Function
```javascript
const handleArchive = async (pipeline) => {
  setConfirmDialog({
    title: 'Archive Pipeline?',
    message: `Archive "${pipeline.name}"? It will be hidden but can be restored.`,
    confirmText: 'Archive',
    confirmStyle: 'danger',
    onConfirm: async () => {
      try {
        await apiClient.patch(`/pipelines/${pipeline.id}/archive`);
        setSuccess('Pipeline archived');
        fetchPipelines(); // Refresh list
        setConfirmDialog(null);
      } catch (err) {
        setError('Error archiving: ' + err.message);
        setConfirmDialog(null);
      }
    },
  });
};
```

### Unarchive Function
```javascript
const handleUnarchive = async (pipeline) => {
  setConfirmDialog({
    title: 'Restore Pipeline?',
    message: `Restore "${pipeline.name}" to active pipelines?`,
    confirmText: 'Restore',
    confirmStyle: 'primary', // Not danger - this is safe
    onConfirm: async () => {
      try {
        await apiClient.patch(`/pipelines/${pipeline.id}/unarchive`);
        setSuccess('Pipeline restored');
        fetchPipelines(); // Refresh list
        setConfirmDialog(null);
      } catch (err) {
        setError('Error restoring: ' + err.message);
        setConfirmDialog(null);
      }
    },
  });
};
```

### Updated Delete Function (with confirmation)
```javascript
const handleDelete = async (pipeline) => {
  setConfirmDialog({
    title: 'Delete Pipeline?',
    message: `Permanently delete "${pipeline.name}"? This cannot be undone.`,
    confirmText: 'Delete',
    confirmStyle: 'danger',
    onConfirm: async () => {
      try {
        await apiClient.delete(`/pipelines/${pipeline.id}`);
        setSuccess('Pipeline deleted');
        fetchPipelines();
        setConfirmDialog(null);
      } catch (err) {
        setError('Error deleting: ' + err.message);
        setConfirmDialog(null);
      }
    },
  });
};
```

---

## UI Button Logic

### Active Tab (Show Archive & Edit)
```jsx
<div className="pipeline-actions">
  <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(pipeline)}>
    Edit
  </button>
  <button className="btn btn-sm btn-warning" onClick={() => handleArchive(pipeline)}>
    Archive
  </button>
</div>
```

### Archived Tab (Show Unarchive & Delete)
```jsx
<div className="pipeline-actions">
  <button className="btn btn-sm btn-primary" onClick={() => handleUnarchive(pipeline)}>
    Restore
  </button>
  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(pipeline)}>
    Delete
  </button>
</div>
```

---

## CSS Classes Needed

### Warning Button (for Archive)
```css
.btn-warning {
  background: #f59e0b;
  color: white;
}

.btn-warning:hover:not(:disabled) {
  background: #d97706;
}
```

---

## Common Issues & Debugging

### Issue 1: Archived pipelines still showing in Active tab
**Check:**
1. `pipeline.archived` field is properly set in database
2. Filter logic uses `!p.archived` for active tab
3. API is returning correct `archived` boolean value

**Debug:**
```javascript
console.log('Pipeline:', pipeline.name, 'Archived:', pipeline.archived);
console.log('Active tab:', activeTab, 'Should show:', activeTab === 'active' ? !pipeline.archived : pipeline.archived);
```

### Issue 2: Archive API call not working
**Check:**
1. API endpoint is correct: `/pipelines/${id}/archive` (not `/archive/pipelines/${id}`)
2. HTTP method is PATCH (not POST or PUT)
3. Backend route is registered
4. CORS allows PATCH requests

**Debug:**
```javascript
console.log('Archiving pipeline:', pipeline.id);
try {
  const response = await apiClient.patch(`/pipelines/${pipeline.id}/archive`);
  console.log('Archive response:', response.data);
} catch (err) {
  console.error('Archive error:', err.response?.data || err.message);
}
```

### Issue 3: Confirmation dialog not appearing
**Check:**
1. `confirmDialog` state is being set
2. ConfirmDialog component is imported
3. ConfirmDialog is rendered at bottom of component
4. `isOpen={!!confirmDialog}` prop is set

**Debug:**
```javascript
console.log('Setting confirm dialog:', confirmDialog);
```

### Issue 4: UI not refreshing after archive/unarchive
**Check:**
1. `fetchPipelines()` is called after successful API call
2. `pipelines` state is being updated
3. Filter logic is re-evaluated on state change

**Debug:**
```javascript
const fetchPipelines = async () => {
  try {
    const response = await apiClient.get('/pipelines');
    console.log('Fetched pipelines:', response.data);
    setPipelines(response.data);
  } catch (err) {
    console.error('Fetch error:', err);
  }
};
```

### Issue 5: Wrong buttons showing on wrong tabs
**Check:**
1. Conditional logic checks `activeTab` correctly
2. Button render logic: 
   - Active tab → Edit + Archive
   - Archived tab → Restore + Delete

**Debug:**
```javascript
console.log('Rendering buttons for tab:', activeTab);
console.log('Pipeline archived status:', pipeline.archived);
```

---

## Testing Checklist

### Archive Flow
- [ ] Click Archive button on active pipeline
- [ ] Confirmation dialog appears with correct message
- [ ] Click "Archive" in dialog
- [ ] Pipeline disappears from Active tab
- [ ] Pipeline appears in Archived tab
- [ ] Success message shows

### Unarchive Flow
- [ ] Switch to Archived tab
- [ ] Click Restore button on archived pipeline
- [ ] Confirmation dialog appears
- [ ] Click "Restore" in dialog
- [ ] Pipeline disappears from Archived tab
- [ ] Pipeline appears in Active tab
- [ ] Success message shows

### Delete Flow (Archived Only)
- [ ] Delete button only visible in Archived tab
- [ ] Click Delete on archived pipeline
- [ ] Confirmation dialog shows "cannot be undone" warning
- [ ] Click "Delete" in dialog
- [ ] Pipeline removed completely
- [ ] Success message shows

### Edge Cases
- [ ] Archive while editing → should return to list
- [ ] Multiple rapid archive clicks → should only archive once
- [ ] Archive with network error → shows error message
- [ ] Tab switching preserves filter state

---

## API Client Configuration

Make sure `apiClient` is configured to handle PATCH requests:

```javascript
// config/api.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
```

---

## Complete Code Flow Diagram

```
User clicks "Archive" button
    ↓
handleArchive(pipeline) called
    ↓
setConfirmDialog({ ... }) sets dialog state
    ↓
ConfirmDialog component renders
    ↓
User clicks "Archive" in dialog
    ↓
onConfirm() callback executed
    ↓
apiClient.patch('/pipelines/:id/archive') sent
    ↓
Backend updates database (archived=true, archived_at=NOW())
    ↓
Backend returns updated pipeline
    ↓
Frontend receives 200 response
    ↓
fetchPipelines() called to refresh list
    ↓
GET /pipelines returns all pipelines with updated archived status
    ↓
setPipelines() updates state
    ↓
React re-renders component
    ↓
Filter logic evaluates: activeTab === 'active' && !pipeline.archived
    ↓
Archived pipeline filtered out of active list
    ↓
Success message displays
    ↓
confirmDialog state cleared (modal closes)
```

---

This comprehensive guide should help debug any issues with the archive feature!
