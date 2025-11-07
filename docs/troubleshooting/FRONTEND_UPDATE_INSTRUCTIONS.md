# PipelineEditor.js - Quality/Compression Update Instructions

## What to Change

In the "FORMAT & QUALITY" section (around line 700-730), replace the entire section with this code:

```jsx
<div className="form-section">
  <h3>Format & Quality</h3>

  <div className="form-group">
    <label>Format</label>
    <select
      value={singleAssetForm.format.type}
      onChange={(e) => setSingleAssetForm({
        ...singleAssetForm,
        format: {...singleAssetForm.format, type: e.target.value}
      })}
    >
      {IMAGE_FORMATS.map(fmt => (
        <option key={fmt.value} value={fmt.value}>{fmt.label}</option>
      ))}
    </select>
  </div>

  {/* Quality (Lossy) - shown for JPEG and WebP */}
  {['jpeg', 'webp'].includes(singleAssetForm.format.type) && (
    <div className="form-group">
      <div className="slider-header">
        <label>Quality (Lossy) — 0-100</label>
        <span className="slider-value">{singleAssetForm.format.quality}</span>
      </div>
      <input
        type="range"
        value={singleAssetForm.format.quality}
        onChange={(e) => setSingleAssetForm({
          ...singleAssetForm,
          format: {...singleAssetForm.format, quality: parseInt(e.target.value)}
        })}
        min="0"
        max="100"
        className="quality-slider"
      />
      <small>Higher = better quality, larger file. Controls lossy compression (detail loss).</small>
    </div>
  )}

  {/* Compression (Lossless) - shown for PNG and PNG8 */}
  {['png', 'png8'].includes(singleAssetForm.format.type) && (
    <div className="form-group">
      <div className="slider-header">
        <label>Compression (Lossless) — 0-100</label>
        <span className="slider-value">{singleAssetForm.format.compression}</span>
      </div>
      <input
        type="range"
        value={singleAssetForm.format.compression}
        onChange={(e) => setSingleAssetForm({
          ...singleAssetForm,
          format: {...singleAssetForm.format, compression: parseInt(e.target.value)}
        })}
        min="0"
        max="100"
        className="compression-slider"
      />
      <small>Higher = smaller file, slower processing. Controls lossless compression (no detail loss).</small>
    </div>
  )}

  {/* WebP supports both */}
  {singleAssetForm.format.type === 'webp' && (
    <div className="form-group">
      <div className="slider-header">
        <label>Lossless Compression — 0-100</label>
        <span className="slider-value">{singleAssetForm.format.compression}</span>
      </div>
      <input
        type="range"
        value={singleAssetForm.format.compression}
        onChange={(e) => setSingleAssetForm({
          ...singleAssetForm,
          format: {...singleAssetForm.format, compression: parseInt(e.target.value)}
        })}
        min="0"
        max="100"
        className="compression-slider"
      />
      <small>Additional lossless optimization (WebP already has lossy Quality above).</small>
    </div>
  )}

  {/* Format info box */}
  <div className="format-info-box">
    {singleAssetForm.format.type === 'png' && (
      <div>
        <strong>📌 PNG 24-bit</strong> — Lossless. Perfect for graphics with transparency. Compression slider controls file size.
      </div>
    )}
    {singleAssetForm.format.type === 'png8' && (
      <div>
        <strong>📌 PNG 8-bit</strong> — Indexed palette (max 256 colors). Smaller files. Great for simple graphics with transparency.
      </div>
    )}
    {singleAssetForm.format.type === 'jpeg' && (
      <div>
        <strong>📌 JPEG</strong> — Lossy compression (optimized with mozjpeg). No transparency. Quality slider controls detail preservation.
      </div>
    )}
    {singleAssetForm.format.type === 'webp' && (
      <div>
        <strong>📌 WebP</strong> — Modern format supporting both lossy and lossless. Best compatibility with modern browsers.
      </div>
    )}
  </div>
</div>
```

## Key Changes:

1. ✅ Quality and Compression now use range sliders instead of number inputs
2. ✅ Both are 0-100 scale (uniform across all formats)
3. ✅ Quality (Lossy) only shows for JPEG and WebP
4. ✅ Compression (Lossless) only shows for PNG and PNG8
5. ✅ WebP shows both sliders (supports both)
6. ✅ Format-specific info box explains each format
7. ✅ Clear labeling: "(Lossy)" and "(Lossless)" make the distinction unmistakable

## Template Updates Needed:

Also update the PRESET_TEMPLATES at the top. Change compression values from 1-9 scale to 0-100 scale:

```javascript
// Before (1-9 scale):
format: {
  type: 'png',
  quality: 85,
  compression: 6,  // 1-9 scale
}

// After (0-100 scale):
format: {
  type: 'png',
  quality: 85,
  compression: 66,  // 0-100 scale (6/9 * 100 ≈ 66)
}
```

All templates that use PNG should convert:
- compression: 6 → compression: 66 (web_standard, print_highres)
- compression: 9 → compression: 100 (print_highres template, already correct)
- compression: null → compression: 50 (social_square uses JPEG, so doesn't matter)

## CSS Already Updated:

The `.quality-slider`, `.compression-slider`, `.slider-header`, `.slider-value`, and `.format-info-box` styles are in the updated PipelineEditor.css file.
