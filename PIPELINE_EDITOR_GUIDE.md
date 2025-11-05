# Pipeline Editor - User Guide

## Overview
The Pipeline Editor is a visual interface for creating and managing image processing workflows. Each pipeline defines a series of operations that will be applied to uploaded images.

## Getting Started

### 1. Access the Pipeline Editor
- Open the application at `http://localhost:3000`
- Click the **"Manage Pipelines"** tab in the top navigation
- You'll see the Pipeline Editor interface

### 2. Create Your First Pipeline

#### Step 1: Click "+ Create New Pipeline"
- If a form isn't already visible, click the blue button in the header
- The form will appear above the pipeline list

#### Step 2: Fill in Basic Information
- **Pipeline Name** (required): Give your pipeline a descriptive name
  - Example: "Product Photos - Web Thumbnails"
  - Example: "Social Media - Instagram"
  
- **Type**: Choose between:
  - **Single Asset**: Process one image at a time
  - **Multi Asset**: Process multiple images in a batch

- **Customer ID**: Optional identifier for organizing pipelines
  - Default is "default"
  - Could be client name or project identifier

#### Step 3: Add Processing Operations
Click the green **"+ Add Operation"** button to add steps to your pipeline.

### 3. Operation Types & Parameters

#### Resize
Use this to scale images to specific dimensions.

**Parameters:**
- **Width (px)**: Target width in pixels
- **Height (px)**: Target height in pixels
- **Fit Mode**: How to handle aspect ratio
  - `Cover`: Image fills the box, may crop
  - `Contain`: Full image visible, may have letterbox
  - `Fill`: Stretch to fill
  - `Inside`: Scale down only
  - `Outside`: Scale up only

**Example:** Resize to 800x600 with "contain" mode

#### Crop
Extract a specific rectangular region from the image.

**Parameters:**
- **X Offset (px)**: Distance from left edge
- **Y Offset (px)**: Distance from top edge
- **Width (px)**: Width of crop area
- **Height (px)**: Height of crop area

**Example:** Crop starting at (100, 50) with 400x300 size

#### Format Convert
Convert image to a different file format.

**Parameters:**
- **Output Format**: Target format
  - JPEG (good compression, no transparency)
  - PNG (lossless, supports transparency)
  - WebP (modern, excellent compression)
  - AVIF (next-gen, best compression)
  - TIFF (professional/archival)

- **Quality (1-100)**: Compression quality
  - Lower = smaller file, lower quality
  - Higher = larger file, better quality
  - Recommended: 75-85 for JPEG/WebP

**Example:** Convert to WebP at 80% quality

#### Color Adjust
Modify color properties of the image.

**Parameters:** (Configurable as needed)
- Brightness
- Contrast
- Saturation
- Hue shift

#### Watermark
Add text or image watermark to output.

**Parameters:** (Configurable as needed)
- Watermark image/text
- Position
- Opacity
- Scale

#### Thumbnail
Generate small preview version quickly.

**Parameters:**
- **Size (px)**: Thumbnail dimension (typically 150-300px)

**Example:** Create 200x200px thumbnails

#### Optimize
Reduce file size while maintaining quality.

**Parameters:**
- **Optimization Level**
  - Low: Faster processing
  - Balanced: Good balance of speed and size
  - High: Best compression, slower processing

- **Remove Metadata**: Strip EXIF and other metadata

### 4. Configure Operations

For each operation you add:

1. **Select Operation Type** from the dropdown
2. **Fill in Parameters** specific to that operation
3. **Enable/Disable** using the checkbox (toggle without deleting)
4. **Remove** using the red button (if no longer needed)

### 5. Preview Your Pipeline

The pipeline displays as **numbered steps**:
- Step 1 → Step 2 → Step 3 → Result

### 6. Save Your Pipeline

Click **"Create Pipeline"** to save your new pipeline.

If editing an existing pipeline, click **"Update Pipeline"** instead.

### 7. View Existing Pipelines

Your created pipelines appear in a grid below the form showing:
- Pipeline name
- Number of operations
- Customer ID
- Creation date
- All configured operations listed

### 8. Edit or Delete Pipelines

For each pipeline card:
- **Edit**: Click the blue "Edit" button to modify
  - The form above will populate with the pipeline's current configuration
  - Make changes and click "Update Pipeline"
  
- **Delete**: Click the red "Delete" button
  - Confirm when prompted
  - The pipeline will be removed permanently

## Example Pipeline Configurations

### Example 1: Web Thumbnail Pipeline
```
Name: Product Photos - Web Thumbnails
Type: Single Asset
Operations:
  1. Resize: 300x300, Fit: Cover
  2. Format Convert: WebP, Quality: 75
  3. Optimize: High, Remove Metadata: Yes
```

### Example 2: Social Media - Instagram
```
Name: Instagram Posts
Type: Multi Asset
Operations:
  1. Resize: 1080x1080, Fit: Cover
  2. Color Adjust: Increase saturation 10%
  3. Format Convert: JPEG, Quality: 85
```

### Example 3: Archive Format
```
Name: Archive Master Copy
Type: Single Asset
Operations:
  1. Format Convert: TIFF
  2. Color Adjust: Normalize colors
  3. Optimize: Low (preserve quality)
```

### Example 4: Mobile Optimization
```
Name: Mobile Optimized
Type: Multi Asset
Operations:
  1. Resize: 600x600, Fit: Inside
  2. Format Convert: WebP, Quality: 70
  3. Optimize: High, Remove Metadata: Yes
```

## Tips & Best Practices

### Organization
- Use descriptive names that indicate output purpose
- Include target platform/use (e.g., "-Web", "-Social", "-Print")
- Group related pipelines with consistent naming

### Performance
- Order operations for efficiency:
  1. Resize early (reduces data)
  2. Format convert middle (may depend on prior steps)
  3. Optimize last (final size reduction)

### Quality vs. Size
- **Lower quality** (60-70): Best for web thumbnails, thumbnails
- **Medium quality** (75-85): General web use
- **High quality** (90+): Print, professional work

### Format Selection
- **JPEG**: Best for photographs, fast web
- **PNG**: Need transparency or lossless quality
- **WebP**: Modern web, best compression
- **AVIF**: Future-proof, experimental support
- **TIFF**: Archival, professional print

### Testing
1. Create a test pipeline first
2. Submit 2-3 test images
3. Download and review results
4. Adjust parameters as needed
5. Duplicate and refine for variations

## Troubleshooting

### Form Won't Save
- Verify pipeline name is not empty
- Confirm at least one operation is added
- Check browser console for error messages

### Parameters Not Appearing
- Ensure operation type is selected
- Reload the page if UI seems stuck
- Try a different operation type

### Can't Edit Pipeline
- Use the "Edit" button, not clicking the pipeline name
- Form should populate automatically
- Click "Update Pipeline" when done (not "Create Pipeline")

### Pipeline Deleted by Mistake
- Confirm deletion is permanent
- Create backup/screenshots of important pipelines
- Note configuration details for recreation

## Advanced Usage

### Duplicating Pipelines
1. Edit a pipeline
2. Change the name
3. Click "Create Pipeline" (instead of Update)
4. This creates a copy

### Operation Order Matters
- Operations execute in order from top to bottom
- Order affects output quality and performance
- Example: Resize before Format Convert is usually better

### Enable/Disable Without Deleting
Use the "Enabled" checkbox to:
- Test pipeline variations
- Quick A/B comparisons
- Temporarily disable without losing configuration

## Next Steps

Once pipelines are created:
1. Go to **"Submit Job"** tab
2. Select your pipeline
3. Upload images
4. Monitor progress in **"View Jobs"** tab
5. Download results when complete

---

**Need Help?** Check the IMPLEMENTATION_STATUS.md for technical details or see README.md for system setup.
