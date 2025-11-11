# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**nd-image-pipeline** is a professional batch image processing system with high-fidelity resizing and team collaboration. It provides a web-based UI for creating image processing pipelines, submitting batch jobs, and tracking real-time processing status.

**Technology Stack:**
- Frontend: React (port 3000)
- API: Node.js/Express (port 3001)
- Database: PostgreSQL (port 5432)
- Queue: Redis/BullMQ (port 6379)
- Worker: Background job processor using Sharp

**Infrastructure:**
- Deployed on LXC containers in Proxmox environment
- Uses Docker Compose for container orchestration
- Two-tier deployment: dev → prod workflow

**Deployment Environments:**
- **Dev Environment**: 10.0.4.139 (SSH: `ssh nd-dev`) - Tracks `dev` branch
- **Prod Environment**: 10.0.4.39 (SSH: `ssh nd-prod`) - Tracks `main` branch

**Key Features:**
- Pipeline Editor for visual pipeline creation (7 operation types)
- Batch processing with custom naming and grouping
- Real-time job tracking via Socket.IO
- High-fidelity image processing using Sharp with Lanczos resampling
- Background job queue with Redis/BullMQ
- Automated batch cleanup service

## Architecture

**Multi-Container Docker Architecture:**

```
Frontend (React) → API (Node/Express) → Worker (Background Process)
     ↓                   ↓                       ↓
  Port 3000          Port 3001           [Redis Queue]
                         ↓                       ↓
                    PostgreSQL              [File System]
```

**Components:**
- **Frontend** (`frontend/`): React SPA with CSS Grid, Axios for API calls, Socket.IO for real-time updates
- **Backend API** (`backend/src/`): Express server handling REST endpoints, Socket.IO events, and job queueing
- **Worker** (`backend/src/worker.js`): Separate process consuming jobs from Redis queue and processing images with Sharp
- **Database**: PostgreSQL with 3 main tables: `pipelines`, `batches`, `jobs`
- **Queue**: Redis with BullMQ for job queue management

**Key Architectural Patterns:**
- Backend uses global objects for shared resources: `global.db`, `global.redis`, `global.io`, `global.imageQueue`
- Jobs are queued to Redis immediately upon submission, then processed asynchronously by worker
- Real-time updates emitted via Socket.IO: `job-update`, `queue-stats`, `job-status-change`
- Batch grouping: Files are automatically grouped by customer prefix (e.g., "PL_DXB") extracted from filenames

## Development Workflow

### Branch Strategy
- **dev branch** → Deploys to dev environment (10.0.4.139)
- **main branch** → Deploys to prod environment (10.0.4.39)
- Always test on dev before merging to main

### Deployment Commands

**Deploy to Development:**
```bash
./deploy.sh dev
```

**Deploy to Production:**
```bash
./deploy.sh prod
```

**SSH Access:**
```bash
# Access dev environment
ssh nd-dev

# Access prod environment
ssh nd-prod
```

The `deploy.sh` script automatically:
1. SSHs to the target server
2. Pulls latest code from GitHub
3. Checks out the appropriate branch
4. Rebuilds and restarts Docker containers
5. Shows container status and recent logs

### Local Development Commands

**Initial Setup:**
```bash
# Copy and configure environment
cp .env.example .env
# Edit .env - change DB_PASSWORD and JWT_SECRET before production

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Watch specific services
docker-compose logs -f web worker api
```

**Local Development Workflow:**
```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart api

# Rebuild after code changes
docker-compose up -d --build

# Stop all services
docker-compose down

# Full clean rebuild
docker-compose down
docker-compose up -d --build
```

**Remote Server Management:**
```bash
# SSH to dev server
ssh nd-dev

# SSH to prod server
ssh nd-prod

# Once connected, navigate to app directory
cd /opt/nd-image-pipeline

# View logs on remote server
sudo docker compose logs -f

# Restart services on remote server
sudo docker compose restart

# Check container status on remote server
sudo docker compose ps
```

### Database Operations
```bash
# Access PostgreSQL shell
docker-compose exec postgres psql -U pipeline_user -d pipeline_db

# Run migrations (manual)
# Migrations are in backend/migrations/*.sql
# Apply them manually via psql or create migration runner

# View database logs
docker-compose logs -f postgres
```

### Testing
```bash
# Frontend tests
cd frontend
npm test

# Backend - no test suite currently exists
# Test via API calls or add test framework
```

### Troubleshooting
```bash
# Check service status
docker-compose ps

# View all logs
docker-compose logs -f

# Inspect Redis queue
docker-compose exec redis redis-cli
# Then: KEYS *

# Check output files
ls -la /tmp/pipeline-output/

# Database query from host
docker-compose exec postgres psql -U pipeline_user -d pipeline_db -c "SELECT COUNT(*) FROM jobs;"
```

## Code Structure

### Backend Structure (`backend/src/`)

**Core Files:**
- `server.js` - Express app setup, Socket.IO configuration, route mounting, global object initialization
- `worker.js` - Background worker process with Sharp image processing, supports single-asset and multi-asset pipelines

**Routes (`backend/src/routes/`):**
- `pipelines.js` - CRUD operations for pipelines, supports filtering by archived status and type
- `jobs.js` - Job submission (single/batch), job listing, download endpoint, job resubmission
- `batches.js` - Batch CRUD operations, batch download (creates ZIP), batch statistics
- `upload.js` - File upload endpoint (if needed separately from job submission)
- `health.js` - Health check endpoint

**Helpers & Services:**
- `helpers/batch-helpers.js` - Batch naming logic: extracts customer prefix from filenames (e.g., "PL_DXB"), generates batch counters, calculates sizes
- `services/cleanup.js` - Automatic batch cleanup service: removes old batches based on retention policies (configurable via .env)

### Frontend Structure (`frontend/src/`)

**Main Files:**
- `App.js` - Main component with tab navigation (Submit Job, View Jobs, Manage Pipelines)
- `App.css` - Global styles and CSS variables for theming

**Components (`frontend/src/components/`):**
- `PipelineEditor.js` / `PipelineEditor.css` - Full pipeline CRUD UI with operation builder
- `JobSubmit.js` / `JobSubmit.css` - Drag-and-drop file upload, pipeline selection, batch naming
- `JobList.js` / `JobList.css` - Real-time job status table, download buttons, job resubmission, batch grouping
- `SliderWithHint.js` / `SliderWithHint.css` - Reusable slider component with color-coded hints
- `DropdownMenu.js` / `DropdownMenu.css` - Dropdown component for actions (edit, delete, etc.)
- `ConfirmDialog.js` / `ConfirmDialog.css` - Reusable confirmation dialog
- `DarkModeToggle.js` / `DarkModeToggle.css` - Dark mode toggle (feature in progress)

**Utils & Config:**
- `config/api.js` - Axios instance configuration, base URL setup
- `utils/sliderHints.js` - Hint text/color mappings for slider values

### Database Schema

**Tables:**
- `pipelines` - Pipeline configurations with JSONB config field containing operations array
  - Fields: `id`, `name`, `description`, `notes`, `config`, `pipeline_type` (single/multi-asset), `is_active`, `archived`, `is_template`, `is_protected`
- `batches` - Batch groupings with automatic naming
  - Fields: `id`, `customer_prefix`, `batch_date`, `batch_counter`, `base_directory_name`, `render_description`, `total_files`, `status`, `pipeline_id`
- `jobs` - Individual processing jobs
  - Fields: `id`, `batch_id`, `pipeline_id`, `input_filename`, `status`, `input_base64`, `output_files`, `output_directory`, timestamps

**Key Relationships:**
- `jobs.batch_id` → `batches.id` (CASCADE DELETE)
- `jobs.pipeline_id` → `pipelines.id`
- `batches.pipeline_id` → `pipelines.id`

**Important Database Triggers:**
- `update_batch_status_from_jobs` - Automatically updates batch status when job statuses change
- `update_batches_timestamp` / `update_pipelines_timestamp` - Auto-update `updated_at` fields

## Pipeline System

### Pipeline Types

**Single-Asset Pipelines:**
- Process one input file → one output file
- Operations run sequentially on a single image
- Example: Resize → Format Convert → Optimize

**Multi-Asset Pipelines:**
- Process one input file → multiple output files
- Contains multiple component pipelines
- Each component produces a separate output with custom suffix
- Example: Input "photo.jpg" → "photo_web.webp", "photo_thumb.jpg", "photo_hires.png"

### Pipeline Operations (7 Types)

1. **Resize** - Scale images with fit modes (cover, contain, fill, inside, outside)
2. **Crop** - Extract rectangular region with x/y offset and dimensions
3. **Format Convert** - Change format (JPEG, PNG, WebP, AVIF, TIFF) with quality control
4. **Color Adjust** - Modify brightness, contrast, saturation, hue
5. **Watermark** - Add image or text overlay with position and opacity
6. **Thumbnail** - Quick thumbnail generation with size parameter
7. **Optimize** - Reduce file size with optimization level and metadata removal

### Pipeline Config Format

Pipeline configurations are stored as JSONB in the `pipelines.config` field:

```json
{
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
```

For multi-asset pipelines, the `pipeline_components` table stores component references with `order_index` and `custom_suffix`.

## Job Processing Flow

1. **Submission**: User uploads files via JobSubmit component
2. **Batch Creation**: Backend automatically groups files by customer prefix, creates batch record
3. **Job Records**: Individual job records created for each file in the batch
4. **Queue**: Jobs added to Redis queue via BullMQ
5. **Worker Processing**:
   - Worker pulls job from queue
   - Loads pipeline config from database
   - Decodes base64 input image
   - Executes operations sequentially using Sharp
   - Saves output to `/tmp/pipeline-output/{job_id}/`
   - Updates job status to 'completed' or 'failed'
6. **Real-time Updates**: Worker emits Socket.IO events for job progress
7. **Download**: User downloads processed files (single file or ZIP for batches)

## Important Conventions

### File Naming & Batch Grouping

- Files must follow naming pattern: `{PREFIX}_{IDENTIFIER}_{DESCRIPTION}.{ext}`
- Customer prefix extracted from first file in batch (e.g., "PL_DXB" from "PL_DXB191_...")
- Batch names auto-generated as: `{PREFIX}_{DATE}_batch-{COUNTER}`
- Counter increments daily per customer prefix
- Custom batch names can be provided via `render_description` field

### Redis Connection

- **CRITICAL**: Use single `REDIS_URL` constant from environment
- Both API and Worker must connect to same Redis instance
- Connection format: `redis://redis:6379` (Docker) or `redis://localhost:6379` (local)
- Queue name: `image-processing`

### Global Objects in Backend

The API server (`server.js`) exposes these global objects:
- `global.db` - PostgreSQL connection pool
- `global.redis` - Redis client
- `global.io` - Socket.IO server instance
- `global.imageQueue` - BullMQ Queue instance
- `global.emitJobUpdate(jobId, status, data)` - Emit job update to clients
- `global.emitQueueStats(stats)` - Emit queue statistics

Worker accesses database directly but does NOT use global objects.

### Socket.IO Events

**Client → Server:**
- `join-monitoring` - Join monitoring room for queue stats
- `watch-job` - Watch specific job for updates

**Server → Client:**
- `job-update` - Job status changed (sent to job-specific room)
- `queue-stats` - Queue statistics (sent every 5 seconds to monitoring room)
- `job-status-change` - Job status changed (sent to monitoring room)

### Error Handling

- Frontend displays user-friendly error messages via alerts/notifications
- Backend logs errors to console (Docker logs)
- Failed jobs store `error_message` and `error_stack` in database
- Jobs have retry mechanism (max 3 retries) configured in worker

## Deployment

### Deployment Process

**IMPORTANT: Always test on dev before deploying to production!**

**Step 1: Deploy to Dev**
```bash
# Make your changes on dev branch
git checkout dev
git add .
git commit -m "Your changes"
git push origin dev

# Deploy to dev environment (10.0.4.139)
./deploy.sh dev

# Test at http://10.0.4.139:3000
```

**Step 2: Promote to Production**
```bash
# Once tested, merge to main
git checkout main
git merge dev
git push origin main

# Deploy to production (10.0.4.39)
./deploy.sh prod

# Verify at http://10.0.4.39:3000
```

### What the Deploy Script Does

The `./deploy.sh` script:
1. SSHs to target server (nd-dev or nd-prod)
2. Navigates to `/opt/nd-image-pipeline`
3. Pulls latest code from GitHub
4. Checks out appropriate branch (dev or main)
5. Stops existing containers
6. Rebuilds images with latest code
7. Starts services
8. Displays container status and logs

### Server Locations

**Development Server:**
- IP: 10.0.4.139
- SSH: `ssh nd-dev`
- Branch: `dev`
- Web UI: http://10.0.4.139:3000
- API: http://10.0.4.139:3001

**Production Server:**
- IP: 10.0.4.39
- SSH: `ssh nd-prod`
- Branch: `main`
- Web UI: http://10.0.4.39:3000
- API: http://10.0.4.39:3001

**Server Configuration:**
- Both servers are LXC containers in Proxmox
- Application directory: `/opt/nd-image-pipeline`
- Docker Compose manages all services
- Output files stored in: `/tmp/pipeline-output/`

### Environment Variables

**Required for Production:**
- `DB_PASSWORD` - Change from default
- `JWT_SECRET` - Change from default
- `REACT_APP_API_URL` - API URL for frontend (e.g., http://10.0.4.39:3001)

**Cleanup Configuration:**
- `AUTO_CLEANUP_ENABLED` - Enable/disable automatic batch cleanup (default: true)
- `BATCH_RETENTION_DAYS` - Days to keep completed batches (default: 30)
- `FAILED_BATCH_RETENTION_DAYS` - Days to keep failed batches (default: 7)
- `CLEANUP_INTERVAL_HOURS` - Cleanup frequency (default: 24)

**Note:** Custom-named batches are NEVER automatically deleted.

## Common Development Tasks

### Adding a New Pipeline Operation

1. Update `frontend/src/components/PipelineEditor.js`:
   - Add new operation type to `operationTypes` array
   - Add form fields in `renderOperationParams()` function
2. Update `backend/src/worker.js`:
   - Add processing logic in `processOperation()` method
   - Use Sharp API for image manipulation
3. Update documentation in `docs/features/PIPELINE_EDITOR_GUIDE.md`

### Debugging Job Failures

**On Remote Server:**
```bash
# SSH to the server
ssh nd-dev  # or ssh nd-prod

# Navigate to app directory
cd /opt/nd-image-pipeline

# Check worker logs
sudo docker compose logs -f worker

# Check API logs
sudo docker compose logs -f api

# Check all service logs
sudo docker compose logs -f
```

**Database Queries:**
```bash
# Connect to database
docker-compose exec postgres psql -U pipeline_user -d pipeline_db

# Query failed jobs
SELECT * FROM jobs WHERE status = 'failed' ORDER BY created_at DESC LIMIT 10;

# Check job details
SELECT id, status, error_message, input_filename FROM jobs WHERE id = 'job-id-here';
```

**File System:**
```bash
# Check output directory
ls -la /tmp/pipeline-output/{job_id}/

# Check disk space
df -h /tmp

# Check recent output
ls -ltr /tmp/pipeline-output/ | tail -20
```

### Adding Real-time Features

1. Define new Socket.IO event in `backend/src/server.js`
2. Emit event from appropriate location (routes or worker)
3. Listen for event in frontend component
4. Update UI based on event data

### Database Migrations

Migrations are stored in `backend/migrations/` and must be applied manually:
```bash
docker-compose exec postgres psql -U pipeline_user -d pipeline_db -f /path/to/migration.sql
```

Migration naming convention: `{number}_{description}.sql`

Current migrations:
- 001: Batch grouping system
- 002: Sprint 2 batch management features
- 003: Pipeline archive system
- 004: Multi-asset pipelines
- 005: Pipeline notes field

## API Endpoints

**Pipelines:**
- `GET /api/pipelines` - List all pipelines (supports `?archived=true/false`, `?type=single/multi-asset`)
- `GET /api/pipelines/:id` - Get single pipeline with components
- `POST /api/pipelines` - Create new pipeline
- `PUT /api/pipelines/:id` - Update pipeline
- `DELETE /api/pipelines/:id` - Delete pipeline
- `PATCH /api/pipelines/:id/archive` - Archive/unarchive pipeline

**Jobs:**
- `GET /api/jobs` - List all jobs (supports pagination, filtering)
- `POST /api/jobs` - Submit single job
- `POST /api/jobs/batch` - Submit batch of jobs
- `GET /api/jobs/:id/download` - Download processed files
- `POST /api/jobs/:id/resubmit` - Resubmit failed job

**Batches:**
- `GET /api/batches` - List all batches
- `GET /api/batches/:id` - Get batch details with jobs
- `DELETE /api/batches/:id` - Delete batch (cascades to jobs and files)
- `GET /api/batches/:id/download` - Download entire batch as ZIP

**Health:**
- `GET /api/health` - Health check endpoint

## Documentation

Comprehensive documentation is in the `docs/` directory:
- `docs/INDEX.md` - Master documentation index
- `docs/guides/QUICK_START.md` - Quick start guide
- `docs/features/PIPELINE_EDITOR_GUIDE.md` - Pipeline editor usage
- `docs/deployment/DEPLOYMENT_READY.md` - Deployment instructions
- `docs/architecture/ARCHITECTURE_DIAGRAMS.md` - System architecture diagrams
- `docs/troubleshooting/` - Troubleshooting guides

## Project Status

Current Sprint: Sprint 3 (Pipeline Archive System)
- ✅ Sprint 1 Complete: Batch deletion and management
- ✅ Sprint 2 Complete: Custom batch naming and file size tracking
- 🔄 Sprint 3 In Progress: Pipeline archive system
- 📋 Sprint 4 Planned: Dark mode

See `docs/progress/SPRINT_STATUS.md` for detailed status.
