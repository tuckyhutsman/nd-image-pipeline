# UI Fixes for Multi-Asset Pipeline

## Three fixes needed:

### Fix 1: Output Organization Icons
In the OUTPUT_ARRANGEMENTS array (around line 72), add icons to each option.

**Change this:**
```javascript
const OUTPUT_ARRANGEMENTS = [
  {
    value: 'flat',
    label: 'Flat Directory',
    description: 'All outputs in single directory (PL_XXX_2025_11_05)',
  },
  ...
];
```

**To this:**
```javascript
const OUTPUT_ARRANGEMENTS = [
  {
    value: 'flat',
    label: 'Flat Directory',
    icon: '📁',
    description: 'All outputs in single directory',
  },
  {
    value: 'by_asset_type',
    label: 'By Asset Type',
    icon: '📂',
    description: 'Subdirectories for each asset type (_web, _hero, _highres)',
  },
  {
    value: 'by_input_file',
    label: 'By Input File',
    icon: '🗂️',
    description: 'Each input file gets its own subdirectory',
  },
];
```

Then update the JSX (around line 690) to display the icon:
```jsx
<div className="arrangement-label">
  <span className="arrangement-icon">{arr.icon}</span>
  <div className="arrangement-text">
    <strong>{arr.label}</strong>
    <small>{arr.description}</small>
  </div>
</div>
```

### Fix 2: Filter Dropdown
In the multi-asset form (around line 720), filter out already-selected pipelines:

**Find this line:**
```jsx
{singleAssetPipelines.map(p => (
  <option key={p.id} value={p.id}>{p.name}</option>
))}
```

**Replace with:**
```jsx
{singleAssetPipelines
  .filter(p => !multiAssetForm.components.find(c => c.ref === p.id))
  .map(p => (
    <option key={p.id} value={p.id}>{p.name}</option>
  ))}
```

### Fix 3: Split Pipeline List
In the list view (around line 615), segment pipelines by type.

**Find the pipelines section:**
```jsx
<div className="pipelines-section">
  <h3>Your Pipelines ({pipelines.length})</h3>
  ...
</div>
```

**Replace entire section with:**
```jsx
<div className="pipelines-section">
  <div className="pipelines-grid">
    {/* Single Asset Column */}
    <div className="pipeline-column">
      <h3>Single Asset Pipelines</h3>
      {pipelines.filter(p => {
        const config = typeof p.config === 'string' ? JSON.parse(p.config) : p.config;
        return config.type === PIPELINE_TYPES.SINGLE_ASSET;
      }).length === 0 ? (
        <p className="empty-message">No single-asset pipelines yet.</p>
      ) : (
        <div className="pipeline-list">
          {pipelines
            .filter(p => {
              const config = typeof p.config === 'string' ? JSON.parse(p.config) : p.config;
              return config.type === PIPELINE_TYPES.SINGLE_ASSET;
            })
            .map((pipeline) => {
              const config = typeof pipeline.config === 'string' ? JSON.parse(pipeline.config) : pipeline.config;
              return (
                <div key={pipeline.id} className="pipeline-item">
                  <div className="pipeline-info">
                    <h4>{pipeline.name}</h4>
                    {config.description && <p className="pipeline-desc">{config.description}</p>}
                  </div>
                  <div className="pipeline-actions">
                    <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(pipeline)}>
                      Edit
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(pipeline.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>

    {/* Multi Asset Column */}
    <div className="pipeline-column">
      <h3>Multi Asset Pipelines</h3>
      {pipelines.filter(p => {
        const config = typeof p.config === 'string' ? JSON.parse(p.config) : p.config;
        return config.type === PIPELINE_TYPES.MULTI_ASSET;
      }).length === 0 ? (
        <p className="empty-message">No multi-asset pipelines yet.</p>
      ) : (
        <div className="pipeline-list">
          {pipelines
            .filter(p => {
              const config = typeof p.config === 'string' ? JSON.parse(p.config) : p.config;
              return config.type === PIPELINE_TYPES.MULTI_ASSET;
            })
            .map((pipeline) => {
              const config = typeof pipeline.config === 'string' ? JSON.parse(pipeline.config) : pipeline.config;
              return (
                <div key={pipeline.id} className="pipeline-item">
                  <div className="pipeline-info">
                    <h4>{pipeline.name}</h4>
                    {config.description && <p className="pipeline-desc">{config.description}</p>}
                    {config.components && (
                      <p className="pipeline-meta">{config.components.length} components</p>
                    )}
                  </div>
                  <div className="pipeline-actions">
                    <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(pipeline)}>
                      Edit
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(pipeline.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  </div>
</div>
```

## CSS Changes Needed

Add to the END of `PipelineEditor.css`:

```css
/* Pipeline Grid Layout */
.pipelines-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  margin-top: 20px;
}

@media (max-width: 968px) {
  .pipelines-grid {
    grid-template-columns: 1fr;
  }
}

.pipeline-column {
  min-width: 0;
}

.pipeline-column h3 {
  font-size: 16px;
  color: var(--text-primary);
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid var(--border-color);
}

.pipeline-meta {
  color: var(--text-muted);
  font-size: 12px;
  margin: 5px 0 0 0;
}

/* Output Arrangement Icons */
.arrangement-label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.arrangement-icon {
  font-size: 24px;
  line-height: 1;
  flex-shrink: 0;
}

.arrangement-text {
  flex: 1;
}

.arrangement-text strong {
  display: block;
  margin-bottom: 5px;
  color: var(--text-primary);
}

.arrangement-text small {
  color: var(--text-secondary);
  font-size: 13px;
}
```

---

## Summary

- **Fix 1**: Add emoji icons to output arrangement options
- **Fix 2**: Filter dropdown to hide already-selected pipelines
- **Fix 3**: Split list view into two columns (Single | Multi Asset)

Apply these three fixes to resolve all the UI issues you identified!
