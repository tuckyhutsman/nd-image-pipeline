# Slider Hint System - Dynamic Algorithm Feedback
## Data-Driven Color Scheme

**Date**: November 5, 2025  
**Status**: ✅ Complete - Ready to Integrate into PipelineEditor

---

## Philosophy: Colors Reflect Processing Intensity

🟢 **Green** = Fast, lightweight processing  
🔵 **Blue** = Balanced, moderate processing  
🟠 **Orange** = Intensive processing  
🔴 **Red** = Maximum processing effort, slowest but smallest files

This aligns with real-world conventions:
- Traffic lights: Green = go fast, Red = stop/caution
- Performance: Green = good/efficient, Red = resource-intensive
- Processing: Green = quick, Red = slow but thorough

---

## Algorithmic Transitions by Format

Based on audit of `backend/src/worker.js`:

### **PNG (24-bit)** - 3 Distinct Algorithms

```
0-70:   🟢 GREEN         Sharp built-in compression (levels 1-9)
71-85:  🔵 BLUE          pngcrush with -max flag
86-100: 🟠 ORANGE-RED    pngcrush with -brute flag
```

**Color Scheme:** Green → Blue → Orange-Red (3 colors)

### **PNG8 (Indexed Color)** - 2 Distinct Algorithms

```
0-60:   🟢 GREEN         Sharp indexed palette
61-100: 🔴 RED           pngquant color reduction
```

**Color Scheme:** Green → Red (2 colors)

### **JPEG** - 4 Distinct Quantization Strategies

```
0-29:   🟢 GREEN         Most aggressive (quantTable=4, optimizeScans=off)
30-60:  🔵 BLUE          Aggressive (quantTable=3, optimizeScans=on)
61-85:  🟠 ORANGE        Balanced (quantTable=2)
86-100: 🔴 RED           High quality (quantTable=1)
```

**Color Scheme:** Green → Blue → Orange → Red (4 colors)

### **WebP** - 1 Algorithm, 6 Effort Levels

```
0-16:   🟢 GREEN         Effort 0 (fastest)
17-33:  🟢 LT GREEN      Effort 1-2
34-50:  🔵 BLUE          Effort 3
51-66:  🟠 ORANGE        Effort 4
67-83:  🟠 RED-ORANGE    Effort 5
84-100: 🔴 RED           Effort 6 (slowest)
```

**Color Scheme:** Green → Blue → Orange → Red (gradient, 6 steps)

---

## Files Created

### ✅ `/frontend/src/utils/sliderHints.js`
Configuration file with hint ranges for each format:

```javascript
export const PNG_COMPRESSION_HINTS = { ranges: [...] };
export const PNG8_COMPRESSION_HINTS = { ranges: [...] };
export const JPEG_QUALITY_HINTS = { ranges: [...] };
export const JPEG_COMPRESSION_HINTS = { ranges: [...] };
export const WEBP_QUALITY_HINTS = { ranges: [...] };
export const WEBP_COMPRESSION_HINTS = { ranges: [...] };

export function getSliderHint(value, hintConfig);
export function interpolateSliderColor(value, hintConfig);
```

### ✅ `/frontend/src/components/SliderWithHint.js`
Reusable React component:

```jsx
<SliderWithHint
  value={compressionValue}
  onChange={handleChange}
  label="Compression (Lossless) — 0-100"
  hintConfig={PNG_COMPRESSION_HINTS}
/>
```

**Features:**
- Dynamic color feedback (Green → Red gradient)
- Algorithm name in monospace font
- Performance badge ("fastest" ↔ "slowest/smallest")
- Numeric display in rounded box
- Smooth transitions
- Responsive design

### ✅ `/frontend/src/components/SliderWithHint.css`
Styling with:
- Gradient slider: `linear-gradient(to right, #00AA44 0%, #0066CC 50%, #FF3333 100%)`
- Custom thumb (white with colored border)
- Animated feedback
- Dark mode support

### ✅ `/frontend/src/components/JobSubmit.js`
Fixed HTTP 400 error:
- Parse `pipeline_id` as integer: `parseInt(selectedPipeline, 10)`
- Correct API path: `/api/jobs` and `/api/jobs/batch`
- Proper error handling

---

## Integration into PipelineEditor

To complete the slider system, update `PipelineEditor.js`:

```javascript
// Add imports
import SliderWithHint from './SliderWithHint';
import {
  PNG_COMPRESSION_HINTS,
  PNG8_COMPRESSION_HINTS,
  JPEG_QUALITY_HINTS,
  JPEG_COMPRESSION_HINTS,
  WEBP_QUALITY_HINTS,
  WEBP_COMPRESSION_HINTS,
} from '../utils/sliderHints';

// Replace existing sliders with SliderWithHint components:

// For PNG 24-bit
{singleAssetForm.format.type === 'png' && (
  <SliderWithHint
    value={singleAssetForm.format.compression}
    onChange={(value) => setSingleAssetForm({
      ...singleAssetForm,
      format: { ...singleAssetForm.format, compression: value }
    })}
    label="Compression (Lossless) — 0-100"
    hintConfig={PNG_COMPRESSION_HINTS}
  />
)}

// For PNG8
{singleAssetForm.format.type === 'png8' && (
  <SliderWithHint
    value={singleAssetForm.format.compression}
    onChange={(value) => setSingleAssetForm({...})}
    label="Compression (Indexed Color) — 0-100"
    hintConfig={PNG8_COMPRESSION_HINTS}
  />
)}

// For JPEG - Quality slider
{singleAssetForm.format.type === 'jpeg' && (
  <>
    <SliderWithHint
      value={singleAssetForm.format.quality}
      onChange={(value) => setSingleAssetForm({...})}
      label="Quality (Lossy) — 0-100"
      hintConfig={JPEG_QUALITY_HINTS}
    />
    <SliderWithHint
      value={singleAssetForm.format.compression}
      onChange={(value) => setSingleAssetForm({...})}
      label="Compression (Optimization) — 0-100"
      hintConfig={JPEG_COMPRESSION_HINTS}
    />
  </>
)}

// For WebP - Quality and Effort sliders
{singleAssetForm.format.type === 'webp' && (
  <>
    <SliderWithHint
      value={singleAssetForm.format.quality}
      onChange={(value) => setSingleAssetForm({...})}
      label="Quality (Lossy) — 0-100"
      hintConfig={WEBP_QUALITY_HINTS}
    />
    <SliderWithHint
      value={singleAssetForm.format.compression}
      onChange={(value) => setSingleAssetForm({...})}
      label="Effort (Processing Time) — 0-100"
      hintConfig={WEBP_COMPRESSION_HINTS}
    />
  </>
)}
```

---

## Visual Design

| Element | Description |
|---------|-------------|
| **Slider Track** | Gradient background: Green → Blue → Red |
| **Thumb** | White circle with colored border matching current color |
| **Value Box** | Rounded rectangle, numeric value in current color |
| **Algorithm Label** | Monospace font (Courier), colored, weight varies |
| **Tradeoff Badge** | Pill-shaped, colored border + background, uppercase text |

**Font Weights:**
- Regular (400): For most labels and quality sliders
- Semibold (600): For compression sliders showing quantization/effort levels

---

## Benefits

✅ **Data-Driven**: Colors reflect actual algorithmic transitions in worker.js  
✅ **Intuitive**: Green = fast/efficient, Red = slow/intensive (like traffic lights)  
✅ **Informative**: Users see algorithm name + performance tradeoff  
✅ **Professional**: Cohesive design with smooth transitions  
✅ **Accessible**: Color + text convey information redundantly  

---

## Testing

Once integrated into PipelineEditor:

1. **PNG Compression**
   - Move slider from 0→100
   - Should see: Green (Sharp) → Blue (pngcrush) → Orange-Red (pngcrush-brute)

2. **JPEG Compression**
   - Should transition through 4 colors with quantTable info

3. **WebP Effort**
   - Should smoothly transition through 6 levels

4. **Submit Job**
   - No more HTTP 400 errors
   - Batch/single submission both work

---

## Deployment Commands

To push changes to production:

```bash
# On dev machine
git add .
git commit -m "feat: implement data-driven slider hint system with corrected color scheme"
git push origin main

# On LXC production
cd /opt/nd-image-pipeline
git pull origin main
docker compose down
docker compose up -d --build
docker compose logs -f
```

---

## Summary

✅ **Corrected Color Philosophy**: Green (fast) → Red (slow) reflects real-world conventions  
✅ **Data-Driven Design**: Color transitions match actual algorithmic changes  
✅ **4 Color Scheme for JPEG**: Most granular, 4 quantization strategies  
✅ **3 Color Scheme for PNG**: Sharp → pngcrush-max → pngcrush-brute  
✅ **2 Color Scheme for PNG8**: Sharp → pngquant  
✅ **6 Gradient for WebP**: Single algorithm, 6 effort levels  
✅ **JobSubmit Fixed**: HTTP 400 error resolved  

**Next Step:** Integrate SliderWithHint into PipelineEditor! 🚀
