# 🎯 Batch Grouping System - Visual Architecture Guide

**Date**: November 5, 2025  
**Phase**: 1 - Core Machinery  
**Status**: ✅ COMPLETE

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Phase 2 Coming:                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  JobList.js                                         │   │
│  │  ├─ Batch rows (collapsible)                        │   │
│  │  ├─ Download button per batch                       │   │
│  │  └─ Filter/Sort controls                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  JobSubmit.js (Already Updated)                            │
│  ├─ Batch Description field                                │
│  └─ Auto-extract customer prefix                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND API (Express)                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  /api/batches (NEW)               /api/jobs (UPDATED)      │
│  ├─ GET /                         ├─ GET /                 │
│  ├─ GET /stats                    ├─ GET /batch/:id        │
│  ├─ GET /:batch_id       ────────→├─ GET /:id              │
│  ├─ GET /:batch_id/download       ├─ GET /:id/download     │
│  └─ DELETE /:batch_id             ├─ POST /                │
│                                   ├─ POST /batch           │
│  batch-helpers.js (NEW)           └─ GET /stats/dashboard  │
│  ├─ extractCustomerPrefix()                                │
│  ├─ getNextBatchCounter()                                  │
│  ├─ generateBaseDirName()                                  │
│  ├─ createBatch()                                          │
│  ├─ getBatchWithJobs()                                     │
│  ├─ getAllBatches()                                        │
│  ├─ getBatchStats()                                        │
│  └─ updateBatchStatus()                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            ↕ SQL
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE (PostgreSQL)                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  batches (NEW)                                              │
│  ├─ id (UUID)                                               │
│  ├─ customer_prefix                                         │
│  ├─ batch_date                                              │
│  ├─ batch_counter                                           │
│  ├─ base_directory_name ─→ PL_DXB_2025-11-05_batch-1      │
│  ├─ render_description                                      │
│  ├─ total_files, total_pipelines, total_size               │
│  ├─ status (auto-updated by trigger)                        │
│  ├─ created_at, updated_at, completed_at                   │
│  └─ [Dropbox/Monday fields for future]                      │
│                                                              │
│  jobs (MODIFIED)                                            │
│  ├─ id                                                      │
│  ├─ batch_id (NEW!) ──────→ FK to batches                   │
│  ├─ pipeline_id                                             │
│  ├─ status                                                  │
│  ├─ file_name                                               │
│  └─ ... (existing fields)                                   │
│                                                              │
│  TRIGGERS (NEW):                                            │
│  ├─ trigger_batches_updated_at                              │
│  │  └─ Auto-updates batches.updated_at on any change        │
│  │                                                          │
│  └─ trigger_batch_status_on_job_update                      │
│     └─ Auto-updates batches.status based on job progress    │
│        queued    → when all jobs queued                      │
│        processing → when any job running                    │
│        completed → when all jobs done                       │
│                                                              │
│  INDEXES (NEW):                                             │
│  ├─ (customer_prefix, batch_date)                           │
│  ├─ (status)                                                │
│  ├─ (created_at)                                            │
│  └─ (batch_id) on jobs                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow: Single Job Submission

```
User submits 1 PNG: "PL_DXB191_image.png"
│
├─→ POST /api/jobs
│   ├─ pipeline_id: 1
│   ├─ file_name: "PL_DXB191_image.png"
│   ├─ batch_description: "Single Test"  ← User input (optional)
│   └─ file_data: "base64..."
│
├─→ Backend: /api/jobs POST handler
│   ├─ Call createBatch()
│   │  ├─ Extract prefix: "PL_DXB191_image.png" → "PL_DXB"
│   │  ├─ Get today's date: "2025-11-05"
│   │  ├─ Query max counter for PL_DXB/2025-11-05: 0
│   │  ├─ Next counter: 1
│   │  ├─ Generate dir name: "PL_DXB_2025-11-05_batch-1"
│   │  ├─ Use description: "Single Test" (or auto-generate)
│   │  └─ INSERT batches row
│   │
│   ├─ INSERT jobs row (with batch_id)
│   └─ Queue job for worker
│
└─→ Response
    ├─ job_id: "uuid-123"
    ├─ batch_id: "uuid-456"
    ├─ base_directory_name: "PL_DXB_2025-11-05_batch-1"
    └─ status: "queued"

UI can now:
✓ Show batch directory name to user
✓ Load batch from /api/batches/:batch_id
✓ Download outputs from /api/batches/:batch_id/download
```

---

## 🔄 Data Flow: Batch Submission (3 Files)

```
User submits 3 files: 
  "PL_DXB191_Front.png"
  "PL_DXB191_Side.png"
  "PL_DXB191_Back.png"
With description: "3-view Render"
│
├─→ POST /api/jobs/batch
│   ├─ pipeline_id: 1
│   ├─ files: [
│   │   { file_name: "PL_DXB191_Front.png", file_data: "..." },
│   │   { file_name: "PL_DXB191_Side.png", file_data: "..." },
│   │   { file_name: "PL_DXB191_Back.png", file_data: "..." }
│   │ ]
│   └─ batch_description: "3-view Render"
│
├─→ Backend: /api/jobs/batch POST handler
│   ├─ Call createBatch()
│   │  ├─ Extract prefix from first: "PL_DXB"
│   │  ├─ Generate: "PL_DXB_2025-11-05_batch-2"
│   │  ├─ Use description: "3-view Render"
│   │  ├─ Set total_files: 3
│   │  └─ INSERT batches row
│   │
│   ├─ FOR EACH FILE:
│   │  ├─ INSERT jobs row (with batch_id)
│   │  ├─ Queue job for worker
│   │  └─ Add to response array
│   │
│   └─ UPDATE batches.status = 'queued'
│
└─→ Response
    ├─ batch_id: "uuid-789"
    ├─ base_directory_name: "PL_DXB_2025-11-05_batch-2"
    ├─ job_count: 3
    ├─ job_ids: ["uuid-j1", "uuid-j2", "uuid-j3"]
    └─ status: "queued"

Database now has:
batches row:
├─ id: uuid-789
├─ base_directory_name: "PL_DXB_2025-11-05_batch-2"
├─ render_description: "3-view Render"
├─ total_files: 3
└─ status: "queued"

3 jobs rows:
├─ job1: batch_id = uuid-789, status = queued
├─ job2: batch_id = uuid-789, status = queued
└─ job3: batch_id = uuid-789, status = queued
```

---

## 📊 Batch Status Auto-Update (Trigger Magic)

```
Initial State (after submission):
batches: status = 'queued'
jobs: [queued, queued, queued]

Job 1 starts processing:
job1.status = 'processing'
    ↓ (trigger fires)
batches.status = 'processing'  ← Auto-updated!
    
Job 1 completes:
job1.status = 'completed'
    ↓ (trigger fires)
batches.status = 'processing'  ← Still processing (job2,3 not done)

Job 2 completes:
job2.status = 'completed'
    ↓ (trigger fires)
batches.status = 'processing'  ← Still processing (job3 not done)

Job 3 completes:
job3.status = 'completed'
    ↓ (trigger fires)
batches.status = 'completed'   ← All done!
batches.completed_at = NOW()   ← Timestamp recorded

Result: Batch automatically reflects state of all jobs!
No manual status management needed.
```

---

## 🎯 Query Examples (Ready for Phase 2 UI)

```javascript
// 1. Get all batches for JobList
GET /api/batches
→ [
    { base_directory_name, render_description, total_files, status, created_at },
    ...
  ]

// 2. Expand batch to see jobs
GET /api/batches/uuid-789
→ {
    base_directory_name: "PL_DXB_2025-11-05_batch-2",
    render_description: "3-view Render",
    jobs: [
      { id, file_name, status, created_at },
      { id, file_name, status, created_at },
      { id, file_name, status, created_at }
    ]
  }

// 3. Download entire batch
GET /api/batches/uuid-789/download
→ FILE: PL_DXB_2025-11-05_batch-2.zip
  (contains all output files from all 3 jobs)

// 4. Filter completed batches
GET /api/batches?status=completed
→ [all completed batches]

// 5. Filter by customer
GET /api/batches?customer_prefix=PL_DXB
→ [all batches for PL_DXB customer]

// 6. Filter + Sort
GET /api/batches?status=completed&sort_by=created_at&sort_order=DESC
→ [completed batches, newest first]

// 7. Stats for dashboard
GET /api/batches/stats
→ {
    total_batches: 42,
    queued: 3,
    processing: 1,
    completed: 35,
    failed: 3,
    total_files_all_time: 1250,
    avg_files_per_batch: 29.8,
    max_files_in_batch: 100
  }
```

---

## 🚀 Phase 2 Preview

With this machinery in place, Phase 2 becomes simple:

```javascript
// Phase 2.1: JobList Component
function JobList() {
  const [batches, setBatches] = useState([]);
  
  useEffect(() => {
    // Load batches instead of jobs
    fetch('/api/batches')
      .then(r => r.json())
      .then(data => setBatches(data));
  }, []);
  
  return (
    <div>
      {batches.map(batch => (
        <BatchRow
          key={batch.id}
          batch={batch}
          onDownload={() => downloadBatch(batch.id)}
          onDelete={() => deleteBatch(batch.id)}
        />
      ))}
    </div>
  );
}

// Phase 2.2: Batch Download
function downloadBatch(batchId) {
  window.location = `/api/batches/${batchId}/download`;
}

// Phase 2.3: Filter Controls
function FilterPanel() {
  const handleFilter = (status, customer) => {
    const query = new URLSearchParams();
    if (status) query.append('status', status);
    if (customer) query.append('customer_prefix', customer);
    
    fetch(`/api/batches?${query}`)
      .then(r => r.json())
      .then(data => updateUI(data));
  };
}
```

---

## ✅ Readiness Matrix

| Component | Status | Phase | Ready For |
|-----------|--------|-------|-----------|
| Database Schema | ✅ | 1 | Deployment |
| Batch Creation Logic | ✅ | 1 | Deployment |
| API Endpoints | ✅ | 1 | Deployment |
| Batch Download | ✅ | 1 | Deployment |
| Filtering/Sorting | ✅ | 1 | Deployment |
| UI - JobList | 🔄 | 2 | Development |
| UI - Filters | 🔄 | 2 | Development |
| UI - Download Button | 🔄 | 2 | Development |

---

## 📋 Deployment Checklist

```bash
☐ Push code to GitHub
☐ SSH to LXC host
☐ Pull latest code
☐ Run database migration
☐ Rebuild Docker containers
☐ Verify batches table exists
☐ Test single job submission
☐ Test batch submission
☐ Verify batch creation in database
☐ Test /api/batches endpoint
☐ Test /api/batches/:id endpoint
☐ Test batch status auto-update
```

---

## 🎬 Ready for Action!

**Core machinery complete.**  
**Phase 1 ready for deployment.**  
**Phase 2 can begin immediately after.**

🚀 Let's deploy!

