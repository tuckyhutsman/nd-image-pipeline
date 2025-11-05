# PipelineEditor.js - Update Instructions for All Fixes

## Fix 1: Hide Transparency for Non-Transparent Formats

In the "TRANSPARENCY & BACKGROUND" section, replace with:

```jsx
<div className="form-section">
  <h3>Transparency & Background</h3>

  {/* Only show transparency controls for formats that support it */}
  {['png', 'png8', 'webp'].includes(singleAssetForm.format.type) ? (
    <>
      <div className="form-group">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={singleAssetForm.transparency.preserve}
            onChange={(e) => setSingleAssetForm({
              ...singleAssetForm,
              transparency: {...singleAssetForm.transparency, preserve: e.target.checked}
            })}
          />
          <span className="toggle-text">
            {singleAssetForm.transparency.preserve 
              ? '✓ Preserve transparency from input file' 
              : '○ Replace transparency with background color'}
          </span>
        </label>
      </div>

      {!singleAssetForm.transparency.preserve && (
        <div className="form-group">
          <label>Background Color (replaces transparent areas)</label>
          <div className="color-picker-group">
            <input
              type="color"
              value={singleAssetForm.transparency.background}
              onChange={(e) => setSingleAssetForm({
                ...singleAssetForm,
                transparency: {...singleAssetForm.transparency, background: e.target.value}
              })}
              className="color-picker"
            />
            <input
              type="text"
              value={singleAssetForm.transparency.background}
              onChange={(e) => setSingleAssetForm({
                ...singleAssetForm,
                transparency: {...singleAssetForm.transparency, background: e.target.value}
              })}
              placeholder="#FFFFFF"
              className="color-text"
            />
          </div>
          <small>Hex color in active ICC profile. Default: #FFFFFF (white)</small>
        </div>
      )}

      <div className="transparency-info">
        {singleAssetForm.transparency.preserve 
          ? '✓ Transparent areas will be preserved in the output file'
          : `○ Transparent areas will be replaced with ${singleAssetForm.transparency.background}`}
      </div>
    </>
  ) : (
    <div className="format-note">
      <strong>ℹ️ {singleAssetForm.format.type === 'jpeg' ? 'JPEG' : singleAssetForm.format.type.toUpperCase()} does not support transparency.</strong>
      {singleAssetForm.format.type === 'jpeg' && (
        <>
          <p>Any transparent areas in the input will be replaced with a solid background color.</p>
          <div className="form-group">
            <label>Background Color (default for transparent areas)</label>
            <div className="color-picker-group">
              <input
                type="color"
                value={singleAssetForm.transparency.background}
                onChange={(e) => setSingleAssetForm({
                  ...singleAssetForm,
                  transparency: {...singleAssetForm.transparency, background: e.target.value}
                })}
                className="color-picker"
              />
              <input
                type="text"
                value={singleAssetForm.transparency.background}
                onChange={(e) => setSingleAssetForm({
                  ...singleAssetForm,
                  transparency: {...singleAssetForm.transparency, background: e.target.value}
                })}
                placeholder="#FFFFFF"
                className="color-text"
              />
            </div>
            <small>Hex color. Default: #FFFFFF (white)</small>
          </div>
        </>
      )}
    </div>
  )}
</div>
```

---

## Fix 2: Add Page Refresh After Pipeline Save

In `handleSaveSingleAsset` function, after `fetchPipelines()`, add:

```javascript
// After line: fetchPipelines();
// Add this:
setTimeout(() => {
  // Refresh entire page to update pipeline dropdowns
  window.location.reload();
}, 1500);
```

Or better (without full page reload), add callback to refetch pipelines in parent App.js:

```javascript
// In PipelineEditor component, add prop:
const [onPipelineChange, setOnPipelineChange] = useState(() => {});

// After successful save:
if (onPipelineChange) {
  onPipelineChange();
}
```

Then in App.js, pass:
```jsx
<PipelineEditor onPipelineChange={() => {
  // Trigger refresh in JobSubmit component's pipeline list
  // This requires lifting state or using context
}} />
```

**Simpler solution**: Just reload page after pipeline save:
```javascript
setTimeout(() => window.location.reload(), 1500);
```

---

## Fix 3: Update CSS for New Transparency UI

Add to PipelineEditor.css:

```css
/* Toggle label styling */
.toggle-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 10px;
  background: #f9f9f9;
  border-radius: 4px;
  margin-bottom: 15px;
  transition: background 0.3s;
}

.toggle-label:hover {
  background: #f0f0f0;
}

.toggle-label input[type="checkbox"] {
  margin-right: 12px;
  cursor: pointer;
}

.toggle-text {
  font-weight: 500;
  color: #333;
  user-select: none;
}

/* Color picker group */
.color-picker-group {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 8px;
}

.color-picker {
  width: 50px;
  height: 40px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.color-text {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: monospace;
  font-size: 14px;
}

/* Transparency info box */
.transparency-info {
  background: #e8f4f8;
  border-left: 4px solid #0099cc;
  padding: 10px;
  border-radius: 4px;
  font-size: 13px;
  color: #0055aa;
  margin-top: 10px;
}

/* Format note for non-transparent formats */
.format-note {
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  padding: 12px;
  border-radius: 4px;
  font-size: 13px;
  color: #856404;
}

.format-note strong {
  display: block;
  margin-bottom: 8px;
  color: #724e07;
}

.format-note p {
  margin: 8px 0;
}
```

---

## Summary of Required Changes

1. ✅ Replace "TRANSPARENCY & BACKGROUND" section with new code above
2. ✅ Add CSS classes to PipelineEditor.css
3. ✅ Add page reload after successful pipeline save
4. ✅ Test transparency toggle shows/hides correctly per format
