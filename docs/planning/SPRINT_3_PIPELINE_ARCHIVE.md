# Sprint 3: Pipeline Archive System

**Status:** 🏗️ In Progress  
**Started:** 2025-11-07  
**Goal:** Add archive/unarchive functionality for pipelines with protected templates

---

## 🎯 Features Overview

### 1. Database Schema Updates
- [ ] Add `archived` boolean column to pipelines table
- [ ] Add `is_template` boolean column for protected Quick Start pipelines
- [ ] Add `archived_at` timestamp column
- [ ] Create migration script

### 2. Backend API Endpoints
- [ ] `PATCH /api/pipelines/:id/archive` - Archive a pipeline
- [ ] `PATCH /api/pipelines/:id/unarchive` - Unarchive a pipeline
- [ ] Update `GET /api/pipelines` to support `?archived=true/false` filter
- [ ] Add template protection (prevent archiving/deleting templates)

### 3. Frontend Components
- [ ] Add tab interface (Active / Archived)
- [ ] Update PipelineList to show tabs
- [ ] Add 3-dot dropdown menu to each pipeline
- [ ] Add Archive/Unarchive actions
- [ ] Add visual indicators for templates (lock icon)
- [ ] Add confirmation dialog for archive actions

### 4. UI/UX Polish
- [ ] Grey out archived pipelines in UI
- [ ] Show archive date in pipeline details
- [ ] Disable archive button for templates
- [ ] Show tooltip on disabled archive button
- [ ] Add "Archived" badge to archived pipelines

---

## 📐 Database Schema

```sql
-- Add to pipelines table
ALTER TABLE pipelines ADD COLUMN archived BOOLEAN DEFAULT FALSE;
ALTER TABLE pipelines ADD COLUMN is_template BOOLEAN DEFAULT FALSE;
ALTER TABLE pipelines ADD COLUMN archived_at TIMESTAMP;

-- Mark existing Quick Start pipelines as templates
UPDATE pipelines 
SET is_template = TRUE 
WHERE name IN ('Quick Start Print', 'Quick Start Web', 'Quick Start Print+Web');

-- Add indexes
CREATE INDEX idx_pipelines_archived ON pipelines(archived);
CREATE INDEX idx_pipelines_is_template ON pipelines(is_template);
```

---

## 🎨 UI Design

### Pipeline List Tabs
```
┌────────────────────────────────────────────────┐
│  Active (3)    Archived (1)                    │
│  ▔▔▔▔▔▔▔                                       │
├────────────────────────────────────────────────┤
│  Pipeline Name               Actions    ...    │
│  🔒 Quick Start Print         Edit      ⋮     │
│  🔒 Quick Start Web           Edit      ⋮     │
│  Custom Pipeline              Edit      ⋮     │
└────────────────────────────────────────────────┘
```

### 3-Dot Menu Options
- **Active Pipelines:**
  - ✏️ Edit
  - 📦 Archive (disabled for templates)
  - 🗑️ Delete (disabled for templates)

- **Archived Pipelines:**
  - 📤 Unarchive
  - 🗑️ Delete (disabled for templates)

---

## 🔧 Implementation Checklist

### Phase 1: Database & Backend ✅
- [x] Create migration `003_pipeline_archive_system.sql`
- [x] Update backend routes
- [x] Add archive/unarchive endpoints
- [x] Add template protection logic
- [ ] Test API endpoints

### Phase 2: Frontend Components ✅
- [x] Create tabs component
- [x] Update PipelineList component
- [x] Add dropdown menu component (reused from Sprint 2)
- [x] Add confirmation dialogs (reused from Sprint 2)
- [x] Test UI interactions

### Phase 3: Polish & Testing ⏱️
- [ ] Add visual indicators
- [ ] Add tooltips
- [ ] Test archive/unarchive flow
- [ ] Test template protection
- [ ] Deploy to production

---

## 📝 Notes & Decisions

### Template Protection Rules
1. Templates cannot be archived
2. Templates cannot be deleted
3. Templates can be duplicated/cloned
4. Templates are marked with a lock icon (🔒)
5. Archive/Delete buttons are disabled with explanatory tooltip

### Archive Behavior
- Archived pipelines are hidden from "Active" view by default
- Archived pipelines can still be viewed in "Archived" tab
- Jobs can still complete for archived pipelines
- Archived pipelines cannot be selected for new jobs
- Unarchiving returns pipeline to active state

### Performance Considerations
- Add database indexes on `archived` and `is_template` columns
- Use query parameter filtering instead of loading all then filtering client-side
- Keep archive operations fast (< 100ms)

---

## 🚀 Deployment Steps

### Development (Mac)
```bash
cd /Users/robertcampbell/Developer/nd-image-pipeline
git add .
git commit -m "Sprint 3: Add pipeline archive system"
git push origin main
```

### Production (LXC)
```bash
cd ~/image-pipeline-app
git pull origin main

# Run migration
docker compose exec db psql -U postgres -d pipeline_db -f /docker-entrypoint-initdb.d/003_pipeline_archive_system.sql

# Rebuild and restart
docker compose down
docker compose up -d --build
docker compose logs -f api worker
```

---

## ✅ Success Criteria

Sprint 3 is complete when:
- ✅ Pipelines can be archived/unarchived via UI
- ✅ Tabs show correct counts (Active/Archived)
- ✅ Templates cannot be archived or deleted
- ✅ Archive confirmations work properly
- ✅ All features work in production
- ✅ No regressions in existing functionality

---

**Last Updated:** 2025-11-07
