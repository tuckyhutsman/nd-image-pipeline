# JobSubmit.js - Update Instructions for File Input & Batch Features

## Fix 1: Add Click-to-Open File Manager to Drop Zone

Replace the drop zone JSX with:

```jsx
const fileInputRef = useRef(null);

// In the JSX, update the drop zone:
<div
  className="drop-zone"
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
  onClick={() => fileInputRef.current?.click()}
  style={{
    cursor: 'pointer',
    backgroundColor: isDragging ? '#e3f2fd' : 'white',
  }}
>
  <div className="drop-zone-content">
    <div className="drop-zone-icon">📁</div>
    <h3>Drop images here</h3>
    <p>or click to browse your computer</p>
    <small>Supported: PNG, JPEG, WebP, TIFF</small>
  </div>
  
  {/* Hidden file input */}
  <input
    ref={fileInputRef}
    type="file"
    multiple
    accept="image/*"
    onChange={(e) => {
      const files = Array.from(e.target.files || []);
      handleFiles(files);
    }}
    style={{ display: 'none' }}
  />
</div>
```

**Add to CSS (JobSubmit.css)**:
```css
.drop-zone {
  cursor: pointer;
  transition: all 0.3s;
}

.drop-zone:hover {
  background-color: #f5f5f5;
  border-color: #007bff;
}

.drop-zone:active {
  background-color: #e3f2fd;
}
```

---

## Fix 2: Exclude Input Files from Output ZIP

In the worker (`backend/src/worker.js`), when creating ZIP, only include outputs:

```javascript
// In processJob function, when creating ZIP:
const outputDir = path.join(OUTPUT_PATH, job_id);
const files = await fs.readdir(outputDir);

// Filter out input files
const outputFiles = files.filter(file => !file.startsWith('input_'));

// Only add output files to ZIP
for (const file of outputFiles) {
  // Add to ZIP
}
```

Or in the download route, exclude input files:
```javascript
app.get('/jobs/:id/download', async (req, res) => {
  const jobDir = path.join(OUTPUT_PATH, req.params.id);
  const files = await fs.readdir(jobDir);
  
  // Exclude input files
  const outputFiles = files.filter(f => !f.startsWith('input_'));
  
  // Create ZIP with only output files
  // ...
});
```

---

## Fix 3: Group Jobs by Batch in View Jobs Tab

This requires changes to both backend and frontend.

### Backend: Add batch_id to jobs table

```sql
ALTER TABLE jobs ADD COLUMN batch_id UUID;
ALTER TABLE jobs ADD COLUMN batch_name VARCHAR(255);
ALTER TABLE jobs ADD COLUMN batch_total INT;
```

### Backend: Group jobs in API response

```javascript
app.get('/jobs', async (req, res) => {
  const result = await db.query(`
    SELECT 
      batch_id,
      batch_name,
      COUNT(*) as total_files,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_files,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_files,
      SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing_files,
      MIN(created_at) as created_at,
      MAX(updated_at) as updated_at,
      JSON_AGG(JSON_BUILD_OBJECT(
        'id', id,
        'file_name', file_name,
        'status', status
      )) as files
    FROM jobs
    WHERE batch_id IS NOT NULL
    GROUP BY batch_id, batch_name
    ORDER BY created_at DESC
  `);
  
  res.json(result.rows);
});
```

### Frontend: Update JobList.js to show batches

```jsx
// Show batch-level view
{batches.map((batch) => (
  <div key={batch.batch_id} className="batch-item">
    <div className="batch-header">
      <h4>{batch.batch_name}</h4>
      <span className="batch-status">
        {batch.completed_files}/{batch.total_files} ✓
      </span>
    </div>
    
    <div className="batch-files">
      {batch.completed_files === batch.total_files && (
        <button className="btn btn-primary">
          ⬇️ Download All ({batch.total_files} files)
        </button>
      )}
    </div>
    
    {/* Optionally expand to show individual files */}
    {expandedBatch === batch.batch_id && (
      <div className="batch-details">
        {batch.files.map(file => (
          <div key={file.id} className="batch-file">
            {file.file_name} - {file.status}
          </div>
        ))}
      </div>
    )}
  </div>
))}
```

---

## CSS for Batch View (JobList.css)

```css
.batch-item {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 12px;
  background: white;
}

.batch-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.batch-header h4 {
  margin: 0;
  color: #333;
}

.batch-status {
  background: #e3f2fd;
  color: #1976d2;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.batch-files {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.batch-details {
  background: #f9f9f9;
  border-top: 1px solid #e0e0e0;
  padding: 12px;
  border-radius: 4px;
}

.batch-file {
  padding: 8px;
  font-size: 13px;
  color: #666;
}

.batch-file::before {
  content: "📄 ";
}
```

---

## Implementation Priority

### High Priority (Quick Wins)
1. ✅ Click file input - 15 minutes
2. ✅ Transparency controls - 30 minutes
3. ✅ Page refresh on save - 5 minutes

### Medium Priority
4. ⏳ Exclude input from ZIP - 30 minutes

### Lower Priority (Requires Schema Change)
5. ⏳ Batch grouping - 2 hours (requires DB migration + UI changes)

---

## Quick Implementation Order

**Session 1 (1 hour)**:
1. Add click-to-file-manager to drop zone
2. Fix transparency UI with better labels
3. Add page refresh after pipeline save

**Session 2 (1.5 hours)**:
4. Exclude input files from downloads
5. Basic single-file download working

**Session 3 (2 hours)**:
6. Add batch_id to jobs table
7. Implement batch grouping in API
8. Update UI to show batch view
9. Implement batch download endpoint
