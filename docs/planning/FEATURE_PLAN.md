# Feature Implementation Plan

## ✅ COMPLETED FEATURES

### Sprint 1: Batch Management ✅
- ✅ DELETE `/api/batches/:batch_id` endpoint
- ✅ DELETE `/api/jobs/:job_id` endpoint
- ✅ 3-dot menu with delete options
- ✅ Confirmation dialogs
- ✅ Batch delete functionality
- ✅ Job delete functionality

### Sprint 2: Custom Batch Names & File Sizes ✅
- ✅ `custom_name` and `name_customized` columns in batches table
- ✅ PATCH `/api/batches/:batch_id/name` endpoint
- ✅ Editable batch names in UI
- ✅ Download button with file size display
- ✅ `total_output_size` tracking

### Sprint 3: Pipeline Archive System ✅
- ✅ Database schema for archived pipelines
- ✅ PATCH `/api/pipelines/:id/archive` endpoint
- ✅ PATCH `/api/pipelines/:id/unarchive` endpoint
- ✅ Frontend tab switcher (Active | Archived)
- ✅ 3-dot menu for pipelines
- ✅ Template protection (is_template flag)

### Sprint 4: Dark Mode ✅
- ✅ CSS custom properties system
- ✅ Dark mode toggle in header
- ✅ localStorage persistence
- ✅ System preference detection
- ✅ All components using theme variables
- ✅ Smooth transitions between themes

### Sprint 4: Automatic Batch Cleanup ✅
- ✅ CleanupService class (`backend/src/services/cleanup.js`)
- ✅ Integrated into worker process
- ✅ Environment variable configuration
- ✅ Automatic deletion of old completed batches (default: 30 days)
- ✅ Faster deletion of failed batches (default: 7 days)
- ✅ Protection for custom-named batches (NEVER deleted)
- ✅ Configurable cleanup interval (default: every 24 hours)
- ✅ Comprehensive logging and error handling
- ✅ Database and filesystem cleanup
- ✅ Full documentation

---

## 🎯 REMAINING FEATURES

### Phase: Multi-Asset Pipelines (8-10 hours)

**Goal:** Support multiple output files per input image, enabling advanced workflows like generating web + print versions simultaneously.

#### A. Database Schema Updates
```sql
-- Add multi-asset support to pipelines
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS pipeline_type VARCHAR(20) DEFAULT 'single';
  -- Values: 'single' (current), 'multi-asset'

-- Add component/output tracking
CREATE TABLE IF NOT EXISTS pipeline_components (
  id SERIAL PRIMARY KEY,
  pipeline_id INTEGER REFERENCES pipelines(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  output_suffix VARCHAR(50),
  config JSONB NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Update jobs table to track which component was used
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS component_id INTEGER REFERENCES pipeline_components(id);
```

#### B. Backend API Updates
**New endpoints:**
- GET `/api/pipelines/:id/components` - List pipeline components
- POST `/api/pipelines/:id/components` - Add component to pipeline
- PATCH `/api/pipelines/components/:component_id` - Update component
- DELETE `/api/pipelines/components/:component_id` - Remove component
- POST `/api/jobs/multi-asset` - Submit multi-asset job

**Worker updates:**
- Process multiple components per input
- Generate separate output for each component
- Track which component produced which output
- Update batch total_output_size for all outputs

#### C. Frontend UI
**Pipeline Editor:**
- Toggle between "Single Asset" and "Multi-Asset" pipeline types
- Component list UI:
  - Add component button
  - Reorder components (drag-and-drop or up/down buttons)
  - Edit component settings
  - Delete component with confirmation
  - Preview of output naming
- Each component has:
  - Name (e.g., "Web Optimized", "Print High-Res")
  - Output suffix (e.g., "_web", "_print")
  - Full pipeline configuration (sizing, format, etc.)

**Job Submission:**
- Show component count when selecting multi-asset pipeline
- Preview of expected outputs
- Batch creation includes all components

**Job List/Detail:**
- Show all outputs grouped by input
- Expandable view of outputs per component
- Individual download buttons
- Combined download (all outputs for one input)

#### D. Output Organization
**Directory structure:**
```
PL_DXB_2025-11-08_batch-1/
  ├── input1_web.jpg      (Component 1)
  ├── input1_print.jpg    (Component 2)
  ├── input2_web.jpg
  ├── input2_print.jpg
  └── ...
```

Or grouped by input (optional):
```
PL_DXB_2025-11-08_batch-1/
  ├── input1/
  │   ├── input1_web.jpg
  │   └── input1_print.jpg
  ├── input2/
  │   ├── input2_web.jpg
  │   └── input2_print.jpg
  └── ...
```

---

## Configuration Reference

### Batch Cleanup Configuration
```bash
# Enable/disable automatic cleanup
AUTO_CLEANUP_ENABLED=true

# Days to retain completed batches (custom-named batches never deleted)
BATCH_RETENTION_DAYS=30

# Days to retain failed batches
FAILED_BATCH_RETENTION_DAYS=7

# Hours between cleanup runs
CLEANUP_INTERVAL_HOURS=24
```

### Dark Mode
- Automatically enabled
- User toggle in header
- Persists in localStorage
- Respects system preference on first visit

---

## Multi-Asset Pipeline Implementation Plan

### Phase 1: Database & Backend (3-4 hours)
1. Create pipeline_components table migration
2. Add pipeline_type column to pipelines
3. Create component CRUD endpoints
4. Update worker to handle multi-component processing
5. Test with sample multi-asset pipeline

### Phase 2: Pipeline Editor UI (2-3 hours)
1. Add pipeline type selector (Single/Multi-Asset)
2. Build component list UI
3. Component add/edit/delete functionality
4. Reordering interface
5. Validation (at least 1 component for multi-asset)

### Phase 3: Job Submission & Display (2-3 hours)
1. Update job submission for multi-asset support
2. Enhance job detail modal for multiple outputs
3. Grouped download functionality
4. Component-level download buttons
5. Output preview and organization

### Phase 4: Testing & Polish (1 hour)
1. End-to-end testing with real images
2. Error handling for component failures
3. UI polish and responsive design
4. Documentation updates

---

## Notes on Multi-Asset Pipelines

**Use Cases:**
- Generate web + print versions simultaneously
- Create thumbnail + full-size + HD versions
- Produce multiple format variations (PNG + JPEG + WebP)
- Different aspect ratios for different platforms

**Benefits:**
- Upload once, get multiple outputs
- Consistent processing across all variants
- Easier pipeline management
- Reduced user effort

**Considerations:**
- Processing time increases with component count
- Storage requirements multiply
- Need clear UI to show which output is which
- Batch downloads become more complex

**Template Ideas:**
```javascript
// "Social Media Multi" Template
{
  type: "multi-asset",
  components: [
    { name: "Instagram Square", suffix: "_ig", sizing: { aspectRatio: "1:1", width: 1080 } },
    { name: "Instagram Story", suffix: "_story", sizing: { aspectRatio: "9:16", width: 1080 } },
    { name: "Facebook Post", suffix: "_fb", sizing: { aspectRatio: "16:9", width: 1200 } }
  ]
}

// "Print + Web" Template
{
  type: "multi-asset",
  components: [
    { name: "High-Res Print", suffix: "_print", format: { type: "png", compression: 90 }, sizing: { width: 4000 } },
    { name: "Web Optimized", suffix: "_web", format: { type: "jpeg", quality: 80 }, sizing: { width: 1920 } }
  ]
}
```

---

## Summary

**Completed:** 5 major features across 4 sprints
**Remaining:** 1 major feature (Multi-Asset Pipelines)

The system is fully production-ready with:
- Complete batch management
- Custom naming
- Archive system
- Dark mode
- Automatic cleanup

The final Multi-Asset Pipelines feature will unlock advanced workflows for users who need multiple output variations from single inputs.
