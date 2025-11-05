# Quick Reference: Quality vs Compression

## The Confusion: SOLVED ✨

### Before (Confusing)
- "Quality" - undefined, could mean lossy or lossless?
- "Compression" - undefined, 1-9 scale, PNG-only?
- Users didn't know what to adjust

### After (Crystal Clear)
- **Quality (Lossy)** - Detail loss in JPEG/WebP. 0-100 scale.
- **Compression (Lossless)** - File size optimization in PNG. 0-100 scale.
- **Format-specific** - Only relevant controls shown per format.

---

## Visual Guide

### PNG (Lossless)
```
No Detail Loss
Compression Slider: 0-100
├─ 0 = No compression, fast, larger file
├─ 50 = Balanced approach
└─ 100 = Maximum compression, slow, smaller file

Example Settings:
- Web: Compression = 60 (balance speed & size)
- Print: Compression = 95 (smallest possible)
- Quick Preview: Compression = 10 (fast processing)
```

### JPEG (Lossy)
```
Detail Loss Possible
Quality Slider: 0-100
├─ 0 = Very lossy, tiny file, visible artifacts
├─ 60 = Web quality (good tradeoff)
├─ 85 = High quality
└─ 100 = Maximum detail, largest file

Example Settings:
- Web Hero: Quality = 75 (good balance)
- Print: Quality = 95 (maximum quality)
- Thumbnail: Quality = 50 (small file)
```

### WebP (Hybrid)
```
Supports Both Lossy & Lossless
Quality Slider: 0-100 (lossy compression)
Compression Slider: 0-100 (additional lossless optimization)

Example Settings:
- Default: Quality = 80, Compression = 60
- Maximum Size Reduction: Quality = 60, Compression = 90
- Maximum Quality: Quality = 95, Compression = 90
```

---

## Common Questions Answered

**Q: When should I use higher Quality?**
A: When you need to preserve detail (print, hero images). Lower quality for thumbnails/previews.

**Q: When should I use higher Compression?**
A: When file size matters (web delivery). Lower compression if processing speed is critical.

**Q: PNG or JPEG?**
A: PNG if you need transparency or lossless. JPEG if photos/lossy is acceptable.

**Q: What does "Lossy" mean?**
A: Information is discarded. Can't get it back. JPEG/WebP do this.

**Q: What does "Lossless" mean?**
A: File is just reorganized, no info lost. Can be decompressed perfectly. PNG does this.

---

## Cheat Sheet

| Need | Format | Setting |
|------|--------|---------|
| Web image | PNG | Compression = 60 |
| Web photo | JPEG | Quality = 75 |
| Print | PNG | Compression = 95 |
| Thumbnail | JPEG | Quality = 50 |
| Modern web | WebP | Quality = 80 |
| Size matters | PNG8 | Compression = 100 |

---

## In the Worker (Behind the Scenes)

### PNG Compression Formula
```
0-100 scale → compression level 0-9
compression_level = (value / 100) * 9
```

### JPEG Quality Formula  
```
0-100 scale → quality 0-100
// Direct mapping
quality = value
// With mozjpeg optimization for best compression
```

### WebP Hybrid
```
Quality = 0-100 (lossy)
Compression = 0-100 (lossless optimization on top)
Both applied for maximum flexibility
```

---

## Field Visibility Logic

```
If format == 'png' or 'png8':
  → Show Compression slider ONLY
  → Hide Quality slider

If format == 'jpeg':
  → Show Quality slider ONLY
  → Hide Compression slider

If format == 'webp':
  → Show BOTH sliders
  → Quality for lossy, Compression for lossless

If format == 'png8':
  → Show Compression slider ONLY
  → Extra info: "indexed palette, max 256 colors"
```

---

## Real World Examples

### Example 1: Web Hero Image (16:9, 2000px)
```
Format: JPEG
Quality: 80           ← Good balance for web
Aspect Ratio: 16:9
Width: 2000px
DPI: 72               ← Web standard
Result: Sharp, optimized hero image ~150-200KB
```

### Example 2: Print Asset (High Res)
```
Format: PNG
Compression: 95       ← Smallest file possible
Aspect Ratio: None    ← Native
DPI: 300              ← Print resolution
Result: Full quality PNG, larger file but lossless
```

### Example 3: Web Thumbnail
```
Format: JPEG
Quality: 50           ← Very compressed
Width: 150px
Result: Tiny file, acceptable for thumbnails
```

### Example 4: Transparency Needed
```
Format: PNG
Compression: 70       ← Balance quality & size
Transparency: True    ← Keep transparent areas
Result: PNG with alpha channel, losslessly compressed
```

---

## Troubleshooting

**Problem: JPEG file is too large**
→ Lower the Quality slider (default might be too high)

**Problem: PNG file is too large**
→ Raise the Compression slider (higher = more compression)

**Problem: Image looks fuzzy/blocky**
→ Raise the Quality slider (0-100, currently too low)

**Problem: Image processing takes forever**
→ Lower the Compression slider (trade processing time for file size)

**Problem: Transparency is lost**
→ Format must be PNG, not JPEG. Check "Preserve Transparency" checkbox.

---

## One More Thing

The **0-100 scale** is intentionally unified across formats so you don't have to think about "compression level 6 vs 7" - you think in terms of percentages everyone understands:

- 0 = Minimum (fast/maximum loss)
- 50 = Balanced (middle ground)
- 100 = Maximum (slow/maximum quality)

This makes presets portable and intuitive! 🎯
