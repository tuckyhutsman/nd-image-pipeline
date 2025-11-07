# TODO: Multi-Asset Pipeline Component Selector

## Status
Partially implemented - Framework complete, component selection UI needed

## What's Done
✅ Multi-asset pipeline form structure
✅ Output arrangement radio buttons with descriptions
✅ Save/delete flow
✅ API integration points

## What's Needed

### 1. Component Selection UI (High Priority)

In the "Pipeline Components" section of multi-asset form, implement:

```jsx
// Show available single-asset pipelines
<div className="components-selector">
  <h4>Available Single-Asset Pipelines</h4>
  <select 
    onChange={(e) => {
      // Add selected pipeline to components list
    }}
  >
    <option>-- Select a pipeline --</option>
    {singleAssetPipelines.map(p => (
      <option key={p.id} value={p.id}>{p.name}</option>
    ))}
  </select>
</div>

// Show selected components with reordering
<div className="selected-components">
  {multiAssetForm.components.map((comp, idx) => (
    <div className="component-item" key={comp.ref}>
      <span>{pipelines.find(p => p.id === comp.ref)?.name}</span>
      <button onClick={() => moveUp(idx)}>↑</button>
      <button onClick={() => moveDown(idx)}>↓</button>
      <button onClick={() => removeComponent(comp.ref)}>✕</button>
    </div>
  ))}
</div>
```

### 2. Data Fetching
```javascript
// In useEffect, also fetch single-asset pipelines
const [singleAssetPipelines, setSingleAssetPipelines] = useState([]);

// When adding multi-asset form, load single-asset pipelines:
const fetchSingleAssetPipelines = async () => {
  try {
    const response = await axios.get(`${API_URL}/pipelines?type=single_asset`);
    setSingleAssetPipelines(response.data);
  } catch (err) {
    console.error('Error loading pipelines:', err);
  }
};
```

### 3. Component Management Functions
```javascript
const addComponent = (singleAssetId) => {
  const newComponent = {
    ref: singleAssetId,
    order: multiAssetForm.components.length + 1,
  };
  setMultiAssetForm({
    ...multiAssetForm,
    components: [...multiAssetForm.components, newComponent]
  });
};

const removeComponent = (ref) => {
  setMultiAssetForm({
    ...multiAssetForm,
    components: multiAssetForm.components.filter(c => c.ref !== ref)
  });
};

const moveComponentUp = (index) => {
  if (index === 0) return;
  const newComponents = [...multiAssetForm.components];
  [newComponents[index], newComponents[index - 1]] = [newComponents[index - 1], newComponents[index]];
  setMultiAssetForm({
    ...multiAssetForm,
    components: newComponents.map((c, i) => ({...c, order: i + 1}))
  });
};

const moveComponentDown = (index) => {
  if (index === multiAssetForm.components.length - 1) return;
  const newComponents = [...multiAssetForm.components];
  [newComponents[index], newComponents[index + 1]] = [newComponents[index + 1], newComponents[index]];
  setMultiAssetForm({
    ...multiAssetForm,
    components: newComponents.map((c, i) => ({...c, order: i + 1}))
  });
};
```

### 4. Save Handler
```javascript
const handleSaveMultiAsset = async (e) => {
  e.preventDefault();
  
  if (!multiAssetForm.name.trim()) {
    setError('Pipeline name is required');
    return;
  }

  if (multiAssetForm.components.length === 0) {
    setError('Multi-asset pipeline must have at least one component');
    return;
  }

  setLoading(true);
  setError('');

  try {
    const payload = {
      name: multiAssetForm.name,
      customer_id: 'default',
      config: {
        type: PIPELINE_TYPES.MULTI_ASSET,
        description: multiAssetForm.description,
        components: multiAssetForm.components,
        outputArrangement: multiAssetForm.outputArrangement,
      },
    };

    if (editingId) {
      await axios.put(`${API_URL}/pipelines/${editingId}`, payload);
      setSuccess('Pipeline updated');
    } else {
      await axios.post(`${API_URL}/pipelines`, payload);
      setSuccess('Pipeline created');
    }

    setMultiAssetForm({
      name: '',
      description: '',
      components: [],
      outputArrangement: 'flat',
    });

    setEditingId(null);
    setMode('list');
    fetchPipelines();
    setTimeout(() => setSuccess(''), 3000);
  } catch (err) {
    setError('Error saving pipeline: ' + err.message);
  } finally {
    setLoading(false);
  }
};
```

### 5. CSS for Component Items
```css
.components-selector {
  margin-bottom: 20px;
}

.components-selector select {
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.selected-components {
  display: grid;
  gap: 10px;
  margin-top: 15px;
}

.component-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.component-item span {
  flex: 1;
  font-weight: 500;
}

.component-item button {
  padding: 6px 10px;
  margin-left: 8px;
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.component-item button:hover {
  background: #e0e0e0;
}

.component-item button:last-child {
  background: #ffebee;
  color: #c62828;
}

.component-item button:last-child:hover {
  background: #ffcdd2;
}
```

---

## Integration Checklist

- [ ] Add `fetchSingleAssetPipelines()` to component mount
- [ ] Implement component selector UI
- [ ] Add move up/down functions
- [ ] Add remove component button
- [ ] Update save handler for multi-asset
- [ ] Add validation for required components
- [ ] Add CSS for component items
- [ ] Test component selection flow
- [ ] Test component reordering
- [ ] Verify multi-asset pipeline creation
- [ ] Test editing multi-asset pipelines

---

## Example Multi-Asset Pipeline Structure

After saving, the database will contain:

```javascript
{
  id: "multi-asset-uuid",
  name: "Product Assets",
  customer_id: "default",
  config: {
    type: "multi_asset",
    description: "Generates web, social, and print versions",
    outputArrangement: "by_asset_type",
    components: [
      { ref: "web-asset-uuid", order: 1 },
      { ref: "social-asset-uuid", order: 2 },
      { ref: "print-asset-uuid", order: 3 }
    ]
  }
}
```

When a job is submitted with this pipeline and an input file:
- File is validated (Stage 0)
- Processed through component 1 (Web) → `filename_web.png`
- Processed through component 2 (Social) → `filename_social.jpg`
- Processed through component 3 (Print) → `filename_print.png`
- Outputs arranged based on `outputArrangement` setting
- User downloads all as ZIP or individual files

---

**Estimated Time**: 1-2 hours to fully implement
**Complexity**: Medium - mostly UI and state management
