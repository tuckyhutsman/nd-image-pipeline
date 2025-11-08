# Archive/Unarchive Feature Implementation - Complete

## ✅ Changes Made

### 1. PipelineEditor.js - Added Archive/Unarchive Functionality

#### Imports Added:
```javascript
import ConfirmDialog from './ConfirmDialog';
```

#### State Added:
```javascript
const [confirmDialog, setConfirmDialog] = useState(null); // For confirmation dialogs
```

#### New Handler Functions:
- `handleArchive(pipeline)` - Archives a pipeline with confirmation
- `handleUnarchive(pipeline)` - Restores an archived pipeline with confirmation
- `handleDelete(pipeline)` - Updated to use confirmation dialog (was using window.confirm)

#### UI Changes:
**Active Tab - Shows:**
- Edit button (secondary)
- Archive button (warning - orange)

**Archived Tab - Shows:**
- Restore button (primary - blue)
- Delete button (danger - red)

#### ConfirmDialog Integration:
- Added at end of list view render
- Shows for Archive, Unarchive, and Delete actions
- Proper styling (danger for destructive, primary for restore)

### 2. PipelineEditor.css - Added Warning Button Style

```css
.btn-warning {
  background: #f59e0b;
  color: white;
}

.btn-warning:hover:not(:disabled) {
  background: #d97706;
}
```

### 3. App.js - Simplified to Always Use PipelineEditor

#### Removed:
```javascript
import PipelineList from './components/PipelineList';
```

#### Changed Render Logic:
**Before:**
```javascript
{activeTab === 'pipelines' && (
  editingPipelineId ? (
    <PipelineEditor ... />
  ) : (
    <PipelineList ... />
  )
)}
```

**After:**
```javascript
{activeTab === 'pipelines' && (
  <PipelineEditor 
    key={pipelineRefreshKey} 
    editPipelineId={editingPipelineId}
    onPipelineSaved={handlePipelineSaved}
    onBack={handleBackToList}
  />
)}
```

### 4. Files to Remove (Orphaned)

**These files are no longer used:**
- `/Users/robertcampbell/Developer/nd-image-pipeline/frontend/src/components/PipelineList.js`
- `/Users/robertcampbell/Developer/nd-image-pipeline/frontend/src/components/PipelineList.css`

**Removal Commands:**
```bash
cd /Users/robertcampbell/Developer/nd-image-pipeline/frontend/src/components

# Remove the orphaned files
rm PipelineList.js
rm PipelineList.css

# Or move to backup if you want to keep them
mkdir -p ../../../.backup_components
mv PipelineList.js ../../../.backup_components/
mv PipelineList.css ../../../.backup_components/
```

---

## API Endpoints Used

### Archive
```javascript
await apiClient.patch(`/pipelines/${pipeline.id}/archive`);
```

### Unarchive
```javascript
await apiClient.patch(`/pipelines/${pipeline.id}/unarchive`);
```

### Delete
```javascript
await apiClient.delete(`/pipelines/${pipeline.id}`);
```

---

## Testing Guide

### Test Archive Flow
1. Go to Manage Pipelines tab
2. Make sure you're on "Active" tab
3. Click "Archive" on any pipeline
4. Verify confirmation dialog appears with correct message
5. Click "Archive" in dialog
6. Verify:
   - Success message shows
   - Pipeline disappears from Active tab
   - Switch to Archived tab - pipeline should be there
   - Pipeline shows "Restore" and "Delete" buttons

### Test Unarchive/Restore Flow
1. Go to Manage Pipelines tab
2. Switch to "Archived" tab
3. Click "Restore" on archived pipeline
4. Verify confirmation dialog appears
5. Click "Restore" in dialog
6. Verify:
   - Success message shows
   - Pipeline disappears from Archived tab
   - Switch to Active tab - pipeline should be there
   - Pipeline shows "Edit" and "Archive" buttons

### Test Delete Flow (Archived Only)
1. Archive a pipeline first
2. Go to Archived tab
3. Click "Delete" on pipeline
4. Verify confirmation dialog shows "cannot be undone" warning
5. Click "Delete" in dialog
6. Verify:
   - Success message shows
   - Pipeline is completely removed
   - Does not appear in either tab

### Test Both Pipeline Types
- Test with Single Asset pipeline
- Test with Multi Asset pipeline
- Both should behave identically

### Test Error Handling
1. Disconnect from backend
2. Try to archive/restore/delete
3. Should show error message
4. Dialog should close
5. No state corruption

---

## Git Commit

```bash
cd /Users/robertcampbell/Developer/nd-image-pipeline

# Stage changes
git add frontend/src/components/PipelineEditor.js
git add frontend/src/components/PipelineEditor.css
git add frontend/src/App.js

# Remove orphaned files
git rm frontend/src/components/PipelineList.js
git rm frontend/src/components/PipelineList.css

# Commit
git commit -m "feat: Consolidate to single Pipeline Editor with archive functionality

- Add Archive/Unarchive functionality to PipelineEditor
- Add ConfirmDialog for all destructive actions (Archive, Delete)
- Add warning button style for Archive action
- Show contextual buttons based on Active/Archived tab
- Remove orphaned PipelineList component
- Simplify App.js to always use PipelineEditor
- Consolidate all pipeline management into unified interface

Features:
- Active tab: Edit + Archive buttons
- Archived tab: Restore + Delete buttons
- Confirmation dialogs for all destructive actions
- Templates + two-column layout always visible
- Complete archive/restore workflow with user feedback

Previous updates included:
- Active/Archived tab system
- Two-column layout (Single | Multi Asset)
- Output arrangement icons
- Dropdown filtering for selected pipelines
- Default view fix"

git push origin main
```

## Deploy

```bash
ssh root@[YOUR_LXC_IP] "cd /root/nd-image-pipeline && git pull origin main && docker compose down && docker compose build frontend && docker compose up -d && docker compose ps"
```

---

## Debug Reference

See `ARCHIVE_FEATURE_DEBUG_GUIDE.md` for:
- Complete API documentation
- Database schema
- State management details
- Common issues & solutions
- Testing checklist
- Code flow diagrams

---

## Summary

✅ **Archive/Unarchive functionality fully integrated into PipelineEditor**
✅ **All destructive actions use confirmation dialogs**
✅ **Contextual buttons based on Active/Archived state**
✅ **PipelineList component removed (no longer needed)**
✅ **Single unified interface for all pipeline management**
✅ **Complete debug documentation provided**

The consolidation is complete! PipelineEditor now has everything from PipelineList PLUS templates and better organization.
