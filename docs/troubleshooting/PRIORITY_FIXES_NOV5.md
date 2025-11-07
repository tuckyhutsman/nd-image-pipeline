# Priority Updates - Nov 5, 2025

## 1. Format-Specific Optimizations (mozjpeg, pngcrush, etc.)

**Status**: Already abstracted into compression/quality sliders ✅

These are handled automatically by the worker based on compression/quality values:

```javascript
// JPEG
mozjpeg: true  // Always enabled when quality slider is used

// PNG
// Higher compression (90-100) = aggressive optimization
// Uses oxipng level settings

// WebP
// Compression slider controls optimization level
```

**Why no UI toggle?**
- These are implementation details, not user concerns
- Quality/Compression sliders achieve the same effect
- Different formats have different optimization tools
- User just needs to know: "higher = smaller file"

✅ **This is correct behavior - no change needed**

---

## 2. Transparency Checkbox Visibility

**Issue**: PNG doesn't have transparency, but checkbox shows  
**Fix**: Hide transparency controls for formats that don't support it

---

## 3. Background Color Labeling

**Current**: Confusing toggle between preserve/override  
**Fix**: Better labeling with clear on/off states

---

## 4. Page Refresh After Pipeline Save

**Issue**: Pipelines don't appear in Submit Job dropdown until manual refresh  
**Fix**: Add automatic page refresh or re-fetch pipelines

---

## 5. File Input Drop Zone

**Issue**: Can't click to open OS file manager  
**Fix**: Add hidden file input + click handler

---

## 6. Input File in Downloads

**Issue**: Input files are packaged with outputs  
**Fix**: Exclude input files from output ZIP

---

## 7. Job Batch Grouping

**Issue**: Each file shown separately in View Jobs  
**Fix**: Group by batch, single download with full structure

Let me implement all these fixes...
