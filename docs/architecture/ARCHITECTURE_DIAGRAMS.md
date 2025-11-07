# Visual Architecture & Data Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     nd-image-pipeline Application               │
└─────────────────────────────────────────────────────────────────┘

                           WEB BROWSER
                    ┌──────────────────────┐
                    │   React Frontend     │
                    │  (Port 3000)         │
                    │                      │
                    │ ┌──────────────────┐ │
                    │ │ PipelineEditor   │ │ ← NEW COMPONENT
                    │ │ - Create         │ │
                    │ │ - Edit           │ │
                    │ │ - Delete         │ │
                    │ │ - List pipelines │ │
                    │ └──────────────────┘ │
                    │ ┌──────────────────┐ │
                    │ │ JobSubmit        │ │
                    │ │ - Upload images  │ │
                    │ │ - Select pipeline│ │
                    │ │ - Batch process  │ │
                    │ └──────────────────┘ │
                    │ ┌──────────────────┐ │
                    │ │ JobList          │ │
                    │ │ - Track progress │ │
                    │ │ - Download files │ │
                    │ └──────────────────┘ │
                    └──────────────────────┘
                              ↓
                     REST API + Socket.IO
                              ↓
    ┌─────────────────────────────────────────────────────────────┐
    │                 Node.js/Express Backend                     │
    │                    (Port 3001)                              │
    │                                                             │
    │  ┌────────────────────────────────────────────────────┐   │
    │  │ API Routes                                         │   │
    │  │ - /api/pipelines (GET, POST, PUT, DELETE)        │   │
    │  │ - /api/jobs (GET, POST, batch)                   │   │
    │  │ - /api/jobs/:id/download                         │   │
    │  │ - /api/health                                    │   │
    │  └────────────────────────────────────────────────────┘   │
    │                      ↓                                    │
    │  ┌────────────────────────────────────────────────────┐   │
    │  │ Real-time Events (Socket.IO)                      │   │
    │  │ - job-update (progress notifications)             │   │
    │  │ - queue-stats (performance metrics)               │   │
    │  └────────────────────────────────────────────────────┘   │
    └─────────────────────────────────────────────────────────────┘
         ↓                           ↓                    ↓
    ┌────────────┐         ┌──────────────────┐    ┌────────────┐
    │ PostgreSQL │         │     Redis        │    │ Filesystem │
    │ Database   │         │  Job Queue       │    │  Output    │
    │            │         │ (BullMQ)         │    │   Files    │
    │ - Pipelines│         │                  │    │            │
    │ - Jobs     │         │ Processing Queue │    │ Processed  │
    │ - Config   │         │                  │    │  Images    │
    └────────────┘         └──────────────────┘    └────────────┘
         ↑                           ↑                    ↑
         └───────────────────────────┴────────────────────┘
                         ↑
              Background Worker Process
              (Separate Container)
              - Processes jobs from queue
              - Applies image operations
              - Saves results
              - Updates database
```

## Data Flow Diagram

### 1. Pipeline Creation Flow

```
User creates Pipeline
        ↓
[PipelineEditor Form]
  - Name input
  - Type selection
  - Operation configuration
        ↓
Form Validation
  - Name required?  ✓
  - Operations added? ✓
        ↓
POST /api/pipelines
  {
    name: "Product Photos - Web",
    type: "single_asset",
    config: {
      operations: [
        { type: "resize", params: {width: 800, height: 600} },
        { type: "format_convert", params: {format: "webp", quality: 80} }
      ]
    }
  }
        ↓
[PostgreSQL]
  INSERT INTO pipelines...
        ↓
Success Response
        ↓
Pipeline appears in list
```

### 2. Job Submission Flow

```
User uploads images
        ↓
[JobSubmit Component]
  - Select pipeline
  - Drag/drop images
  - Validate file types & sizes
        ↓
Convert to Base64
        ↓
POST /api/jobs or /api/jobs/batch
  {
    pipeline_id: "abc123",
    files: [
      { file_name: "photo1.jpg", file_data: "base64..." },
      { file_name: "photo2.jpg", file_data: "base64..." }
    ]
  }
        ↓
[Express API]
  - Create job records
  - Generate UUIDs
        ↓
[PostgreSQL]
  INSERT INTO jobs...
        ↓
[Redis Queue]
  Add message: { job_id, pipeline_id, file_data }
        ↓
Success Response
        ↓
Socket.IO: Notify frontend "job queued"
```

### 3. Processing Flow

```
[Worker Process]
        ↓
Check Redis Queue
  (every 100ms)
        ↓
Job Available?
        ├─ YES: Process
        └─ NO: Wait
        ↓
Load Pipeline Config
  FROM PostgreSQL
        ↓
Read Image Data
        ↓
Execute Operations IN ORDER:
  1. Resize (800x600)
  2. Format Convert (WebP, quality 80)
  3. Optimize
        ↓
Save Output Files
  TO /tmp/pipeline-output/{job_id}/
        ↓
[PostgreSQL]
  UPDATE jobs SET status='completed'
        ↓
Socket.IO: Notify frontend
  "Job completed - download ready"
```

### 4. Download Flow

```
User clicks Download
        ↓
[Browser]
        ↓
GET /api/jobs/{job_id}/download
        ↓
[Express API]
        ↓
Check output directory
  Single file? → Stream directly
  Multiple files? → Create ZIP
        ↓
Set HTTP Headers
  Content-Disposition: attachment
  Content-Type: application/octet-stream
        ↓
Stream response
        ↓
Browser downloads file
```

## Component Hierarchy

```
App (Main Container)
│
├─ Header
│  └─ Title & description
│
├─ Navigation Tabs
│  ├─ [Submit Job]
│  ├─ [View Jobs]
│  └─ [Manage Pipelines] ← Pipeline Editor Tab
│
└─ Content Area
   ├─ JobSubmit Component
   │  ├─ Pipeline selector
   │  ├─ Drag-drop zone
   │  ├─ File list
   │  └─ Submit button
   │
   ├─ JobList Component
   │  ├─ Jobs table
   │  ├─ Status badges
   │  ├─ Download buttons
   │  └─ Refresh control
   │
   └─ PipelineEditor Component (NEW)
      ├─ Create/Edit Form
      │  ├─ Name input
      │  ├─ Type selector
      │  └─ Operations builder
      │
      └─ Pipelines Grid
         ├─ Pipeline cards
         ├─ Edit buttons
         └─ Delete buttons
```

## Operation Processing Pipeline

```
INPUT IMAGE
    ↓
[Step 1: Resize]
  Original: 2000x1500 px
  Config: 800x600, fit: cover
  Output: 800x600 px image
    ↓
[Step 2: Format Convert]
  Input: Raw image data
  Config: WebP format, quality 80
  Output: WebP encoded bytes
    ↓
[Step 3: Optimize]
  Input: WebP data
  Config: High optimization, remove metadata
  Output: Optimized WebP (smaller file)
    ↓
OUTPUT FILE (optimized WebP image)
```

## State Management Flow

### PipelineEditor Component State

```
┌─────────────────────────────────────────┐
│    PipelineEditor Component State        │
├─────────────────────────────────────────┤
│                                         │
│ pipelines: Array of pipeline objects   │
│ ├─ id, name, config, customer_id, ...  │
│                                         │
│ selectedPipeline: Current pipeline      │
│                                         │
│ formData: Form state                   │
│ ├─ name                                │
│ ├─ type (single/multi)                 │
│ ├─ customer_id                         │
│ └─ operations: Array                   │
│    ├─ id (timestamp)                   │
│    ├─ type (operation type)            │
│    ├─ enabled (boolean)                │
│    └─ params (object)                  │
│                                         │
│ editingId: UUID or null               │
│ (null = creating, UUID = editing)     │
│                                         │
│ loading: boolean (API calls)           │
│ error: string or null                  │
│ success: string or null                │
│                                         │
└─────────────────────────────────────────┘
```

## Database Schema Simplified

```
┌─────────────────────────┐
│     pipelines TABLE     │
├─────────────────────────┤
│ id (UUID) [PK]         │
│ name (string)          │
│ customer_id (string)   │
│ config (JSON)          │ ← Contains operations array
│ created_at (timestamp) │
│ updated_at (timestamp) │
└─────────────────────────┘

config structure:
{
  "type": "single_asset",
  "operations": [
    {
      "id": 1234567890,
      "type": "resize",
      "enabled": true,
      "params": {
        "width": 800,
        "height": 600,
        "fit": "cover"
      }
    },
    {
      "id": 1234567891,
      "type": "format_convert",
      "enabled": true,
      "params": {
        "format": "webp",
        "quality": 80
      }
    }
  ]
}

┌──────────────────────────┐
│      jobs TABLE          │
├──────────────────────────┤
│ id (UUID) [PK]          │
│ pipeline_id (UUID) [FK] │
│ status (string)         │
│ file_name (string)      │
│ input_data (base64)     │
│ output_data (JSON)      │
│ error_message (string)  │
│ created_at (timestamp)  │
│ updated_at (timestamp)  │
└──────────────────────────┘
```

## API Response Examples

### Create Pipeline Response
```json
{
  "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "name": "Product Photos - Web",
  "customer_id": "default",
  "config": {
    "type": "single_asset",
    "operations": [...]
  },
  "created_at": "2025-11-05T12:34:56Z",
  "updated_at": "2025-11-05T12:34:56Z"
}
```

### Get Pipelines Response
```json
[
  {
    "id": "...",
    "name": "...",
    "config": {...},
    "created_at": "...",
    "updated_at": "..."
  }
]
```

### Create Job Response
```json
{
  "job_id": "xyz789...",
  "status": "queued",
  "batch_id": "batch-123",
  "job_count": 2
}
```

## Error Handling Flow

```
User Action
    ↓
Validation Check
    ├─ VALID → Continue
    └─ INVALID → Show error message
        ├─ Highlight field
        ├─ Display help text
        └─ Prevent submission
    ↓
API Call
    ├─ SUCCESS (200, 201)
    │   ├─ Update state
    │   ├─ Refresh list
    │   └─ Show success message
    │
    └─ FAILURE (4xx, 5xx)
        ├─ Extract error message
        ├─ Display to user
        └─ Log for debugging
```

## Real-Time Communication (Socket.IO)

```
CLIENT                          SERVER
  │                               │
  ├─ connect()                   │
  │─────────────────────────────→│
  │                               │
  ├─ join-monitoring             │
  │─────────────────────────────→│
  │                               │
  │                               │ [Job in queue]
  │                               │ [Processing starts]
  │                               │
  │← job-status-change           │
  │←─────────────────────────────┤
  │  {job_id, status: processing}│
  │                               │
  │← queue-stats (every 5s)       │
  │←─────────────────────────────┤
  │  {waiting, active, completed}│
  │                               │
  │                               │ [Processing completes]
  │                               │
  │← job-update                  │
  │←─────────────────────────────┤
  │  {job_id, status: completed} │
  │                               │
  └─ disconnect()                │
  │─────────────────────────────→│
```

---

These diagrams show the complete architecture, data flow, and component relationships of the nd-image-pipeline application with the new Pipeline Editor component.
