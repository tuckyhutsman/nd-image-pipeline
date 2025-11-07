# Batch System Phase 1 - LXC Deployment Guide

**Date**: November 5, 2025  
**Phase**: 1 - Core Machinery  
**Estimated Time**: 30 minutes

---

## Pre-Deployment Checklist

- [ ] All code committed locally
- [ ] Database migration file ready
- [ ] Backend helpers tested
- [ ] API endpoints configured
- [ ] Ready to deploy to LXC

---

## Deployment Steps

### Step 1: Push Code to GitHub

```bash
cd ~/Developer/nd-image-pipeline

# Stage batch system files
git add backend/migrations/001_add_batch_grouping.sql \
        backend/src/helpers/batch-helpers.js \
        backend/src/routes/batches.js \
        backend/src/routes/jobs.js \
        backend/src/server.js \
        BATCH_SYSTEM_PHASE_1.md

# Commit with clear message
git commit -m "feat: Implement batch grouping system Phase 1

Core Machinery:
- Database: batches table with customer prefix, date, counter
- Helpers: batch creation, extraction, querying
- API: /api/batches endpoints for batch management
- Jobs: updated to create/link batches automatically

Features:
- Auto-generate base_directory_name: PL_DXB_2025-11-05_batch-1
- Extract customer prefix from filenames
- Auto-increment batch counter per day
- Auto-generate render description if not provided
- Automatic batch status management via triggers
- Full filtering and sorting support

Breaking Changes: None (backward compatible)
Database Migration: Required (001_add_batch_grouping.sql)"

# Push to GitHub
git push origin main
```

---

### Step 2: SSH into LXC Host

```bash
# SSH to your LXC host
ssh user@lxc-host

# Navigate to project
cd /opt/nd-image-pipeline

# Verify current branch
git status
```

---

### Step 3: Pull Latest Code

```bash
git pull origin main

# Verify files were pulled
ls -la backend/migrations/
ls -la backend/src/helpers/
ls -la backend/src/routes/batches.js
```

---

### Step 4: Run Database Migration

```bash
# Run migration using psql
docker compose exec postgres psql \
  -U $DB_USER \
  -d $DB_NAME \
  -f /docker-entrypoint-initdb.d/001_add_batch_grouping.sql

# Alternative: pipe migration directly
docker compose exec postgres psql \
  -U $DB_USER \
  -d $DB_NAME < backend/migrations/001_add_batch_grouping.sql

# Verify migration worked
docker compose exec postgres psql \
  -U $DB_USER \
  -d $DB_NAME \
  -c "\dt batches"

# Should show:
# Schema | Name    | Type  | Owner
# --------|---------|-------|-------
# public | batches | table | postgres
```

---

### Step 5: Rebuild Containers

```bash
# Stop all containers
docker compose down

# Rebuild backend with new code
docker compose up -d --build

# Verify all services running
docker compose ps

# Expected output:
# NAME          STATUS
# backend       Up 2 seconds
# frontend      Up 2 seconds  
# postgres      Up 2 seconds
# redis         Up 2 seconds
# worker        Up 2 seconds
```

---

### Step 6: Monitor Logs

```bash
# Watch backend startup for errors
docker compose logs -f backend

# Look for:
# ✓ API running on port 3001
# ✓ Routes registered
# ✓ Database connected

# Watch worker startup
docker compose logs -f worker

# Look for:
# ✓ Worker started, listening for jobs...

# Check frontend
docker compose logs -f frontend

# Look for successful build and startup
```

---

### Step 7: Verify Database Schema

```bash
# Connect to database
docker compose exec postgres psql \
  -U $DB_USER \
  -d $DB_NAME

# Inside psql:
# Check batches table
\dt batches

# Check batches columns
\d batches

# Check jobs table for batch_id column
\d jobs
SELECT column_name FROM information_schema.columns WHERE table_name='jobs' AND column_name='batch_id';

# Check indexes
\di

# Should see:
# idx_batches_customer_date
# idx_batches_status
# idx_batches_created_at
# idx_jobs_batch_id
# idx_jobs_status
# idx_jobs_pipeline_id
# idx_jobs_created_at

# Exit psql
\q
```

---

## Testing the Implementation

### Test 1: Create a Test Pipeline

```bash
# Open app: http://localhost:3000
# Go to Pipeline Editor
# Create test pipeline: "Batch Test - PNG"
# Settings:
#   Format: PNG 24-bit
#   Width: 800px
#   Compression: 70
# Click "Create Pipeline"

# Verify in backend logs:
docker compose logs backend | grep "Pipeline"
```

### Test 2: Submit Single Job (Creates Batch)

```bash
# In app, go to Job Submit
# Select the test pipeline
# Enter Batch Description: "Single Test"
# Upload 1 PNG file: "PL_TEST_image.png"
# Click "Submit 1 File"

# Watch backend logs
docker compose logs -f backend | grep -E "batch|Batch"

# Should see:
# Created batch [...] for single job
# Job queued: [...]
# batch_id: [...]
```

### Test 3: Submit Multiple Jobs (Creates Batch)

```bash
# In app, go to Job Submit
# Select test pipeline
# Enter Batch Description: "Multi Test - 3 Files"
# Upload 3 PNG files:
#   "PL_TEST_Front.png"
#   "PL_TEST_Side.png"
#   "PL_TEST_Back.png"
# Click "Submit 3 Files"

# Watch backend logs
docker compose logs -f backend | grep -E "batch|Batch"

# Should see:
# Created batch [...] with 3 files
# 3 jobs queued
```

### Test 4: Check Batch API

```bash
# Get all batches
curl http://localhost:3001/api/batches

# Should return JSON with batches array

# Get specific batch
curl http://localhost:3001/api/batches/{batch_id}

# Should return batch with nested jobs array

# Get batch stats
curl http://localhost:3001/api/batches/stats

# Should return aggregated statistics
```

### Test 5: Check Database Directly

```bash
docker compose exec postgres psql \
  -U $DB_USER \
  -d $DB_NAME \
  -c "SELECT base_directory_name, render_description, total_files, status FROM batches ORDER BY created_at DESC LIMIT 5;"

# Should show your test batches:
# base_directory_name      | render_description  | total_files | status
# -------------------------+--------------------+-------------+--------
# PL_TEST_2025-11-05_batch-1 | Single Test       | 1           | queued
# PL_TEST_2025-11-05_batch-2 | Multi Test - 3... | 3           | queued
```

### Test 6: Monitor Job Processing

```bash
# Watch worker logs
docker compose logs -f worker

# Should see jobs being processed:
# Processing job [job-id-1]...
# Stage 0: Validating...
# Stage 1: Processing...
# ✓ Job completed

# Watch backend for job status updates
docker compose logs -f backend | grep -i "status"
```

---

## Troubleshooting

### Issue: Migration Failed

```bash
# Check what went wrong
docker compose exec postgres psql \
  -U $DB_USER \
  -d $DB_NAME \
  -c "SELECT * FROM information_schema.tables WHERE table_name='batches';"

# If batches table doesn't exist, run migration again:
docker compose exec postgres psql \
  -U $DB_USER \
  -d $DB_NAME < backend/migrations/001_add_batch_grouping.sql

# Check for errors
docker compose logs postgres | tail -50
```

### Issue: Batches Route Not Found (404)

```bash
# Verify server.js has the route
grep "batches" backend/src/server.js

# Rebuild backend
docker compose down
docker compose up -d --build backend

# Check startup logs
docker compose logs backend | grep -i "route\|batch"
```

### Issue: Jobs Not Linking to Batches

```bash
# Check database
docker compose exec postgres psql \
  -U $DB_USER \
  -d $DB_NAME \
  -c "SELECT id, batch_id, file_name FROM jobs LIMIT 5;"

# All jobs should have batch_id (not NULL)

# If NULL, manually fix:
# UPDATE jobs SET batch_id = 'some-uuid' WHERE batch_id IS NULL;
```

### Issue: Batch Status Not Updating

```bash
# Check if triggers exist
docker compose exec postgres psql \
  -U $DB_USER \
  -d $DB_NAME \
  -c "SELECT * FROM information_schema.triggers WHERE trigger_name LIKE 'trigger_batch%';"

# Should show 2 triggers:
# - trigger_batches_updated_at
# - trigger_batch_status_on_job_update

# If missing, re-run migration
```

---

## Quick Rollback

If something goes wrong:

```bash
# Rollback code
git revert HEAD
git push origin main

# On LXC:
git pull origin main
docker compose down
docker compose up -d --build

# Drop batch tables (if needed for clean restart)
docker compose exec postgres psql \
  -U $DB_USER \
  -d $DB_NAME \
  -c "DROP TABLE IF EXISTS batches CASCADE;"
  
# Then re-run migration
```

---

## Performance Monitoring

### Watch Real-Time Batch Creation

```bash
docker compose exec postgres psql \
  -U $DB_USER \
  -d $DB_NAME

# Inside psql, run every 5 seconds:
SELECT base_directory_name, total_files, status, created_at 
FROM batches 
ORDER BY created_at DESC 
LIMIT 10;

# Hit up-arrow and enter to repeat
```

### Monitor Batch Processing

```bash
# Watch batch status changes
docker compose logs -f | grep -E "batch|Batch|status"
```

---

## Post-Deployment Checklist

- [ ] All containers running (`docker compose ps`)
- [ ] Backend logs show no errors
- [ ] Worker listening for jobs
- [ ] Database migration successful
- [ ] Batches table exists with correct schema
- [ ] Indexes created for performance
- [ ] Test single job submission → creates batch
- [ ] Test batch submission → creates batch with multiple jobs
- [ ] API endpoints responding correctly
- [ ] Batch status updates working

---

## What's Ready for Phase 2

✅ Core batch machinery is solid  
✅ API endpoints fully functional  
✅ Database triggers automatic  
✅ All filtering/sorting logic in place  

Next:
- Frontend JobList redesign to show batches
- Batch download endpoint integration
- Filtering/sorting UI controls

---

## Quick Reference Commands

```bash
# View all batches
docker compose exec postgres psql -U $DB_USER -d $DB_NAME \
  -c "SELECT base_directory_name, total_files, status FROM batches ORDER BY created_at DESC;"

# View batch details
docker compose exec postgres psql -U $DB_USER -d $DB_NAME \
  -c "SELECT * FROM batches WHERE id='batch-uuid';"

# View jobs in batch
docker compose exec postgres psql -U $DB_USER -d $DB_NAME \
  -c "SELECT id, file_name, status FROM jobs WHERE batch_id='batch-uuid';"

# Reset everything (caution!)
docker compose exec postgres psql -U $DB_USER -d $DB_NAME \
  -c "TRUNCATE batches CASCADE; TRUNCATE jobs CASCADE;"

# View logs
docker compose logs backend -f
docker compose logs worker -f
docker compose logs -f  # All services
```

---

## Deployment Time: ~30 minutes

1. Push code (5 min)
2. Pull on LXC (2 min)
3. Run migration (3 min)
4. Rebuild containers (5 min)
5. Verify schema (3 min)
6. Test APIs (10 min)
7. Verify batch creation (5 min)

✅ Ready for Phase 2 UI work!

