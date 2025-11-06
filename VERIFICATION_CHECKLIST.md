# API URL Fix - Verification Checklist

## Before Deployment
- [x] Updated all 5 frontend files with standardized API_URL pattern
- [x] Documented the changes
- [x] Created deployment guide
- [ ] Committed changes to local git
- [ ] Pushed to GitHub

## During Deployment (On LXC)
- [ ] SSH into LXC: `ssh root@10.0.4.39`
- [ ] Navigate: `cd ~/image-pipeline-app`
- [ ] Pull changes: `git pull origin main`
- [ ] Check .env file: `cat .env` (verify REACT_APP_API_URL setting)
- [ ] Stop containers: `docker compose down`
- [ ] Rebuild: `docker compose up -d --build`
- [ ] Check containers running: `docker compose ps`

## Post-Deployment Verification

### 1. Check Container Logs
```bash
# Watch for errors
docker compose logs -f api worker

# Should see:
# - "API running on port 3001"
# - "Worker started"
# - No connection errors
```

### 2. Test Frontend Loading
- [ ] Open browser: `http://10.0.4.39:3000`
- [ ] Page loads without errors
- [ ] Open DevTools → Console
- [ ] No red errors visible

### 3. Test Pipeline Loading
- [ ] Click "Manage Pipelines" tab
- [ ] Check Network tab for request to `/api/pipelines` or `http://10.0.4.39:3001/api/pipelines`
- [ ] Verify URL has only ONE `/api` (not `/api/api/`)
- [ ] Pipelines list should load

### 4. Test Job Submission
- [ ] Click "Submit Job" tab
- [ ] Select a pipeline
- [ ] Upload test image (any .jpg or .png)
- [ ] Enter batch description (optional)
- [ ] Click Submit
- [ ] Open DevTools → Network tab
- [ ] Find the POST request
- [ ] Verify URL: Should be `/api/jobs` or `http://10.0.4.39:3001/api/jobs`
- [ ] **CRITICAL:** URL should have only ONE `/api` segment
- [ ] Response should be 201 Created (not 404 or 500)
- [ ] Response body should have: `{"job_id": "...", "batch_id": "...", "status": "queued"}`

### 5. Test Job Processing
- [ ] Click "View Jobs" tab
- [ ] Job should appear with status "queued" or "processing"
- [ ] Wait ~30 seconds
- [ ] Refresh (click refresh button)
- [ ] Status should change to "completed"
- [ ] Download button should appear

### 6. Test Download
- [ ] Click Download button
- [ ] File should download (not 404 error)
- [ ] Check Network tab for download request
- [ ] Verify URL: `/api/jobs/{id}/download` or `http://10.0.4.39:3001/api/jobs/{id}/download`
- [ ] URL should have only ONE `/api` segment

## Troubleshooting

### If you see `/api/api/` in Network tab:
1. Check .env file on LXC:
   ```bash
   cat .env
   ```
2. If it shows:
   ```
   REACT_APP_API_URL=http://10.0.4.39:3001/api
   ```
   **Remove the `/api`:**
   ```bash
   # Edit .env
   nano .env
   # Change to:
   REACT_APP_API_URL=http://10.0.4.39:3001
   # Or set empty:
   REACT_APP_API_URL=
   ```
3. Restart containers:
   ```bash
   docker compose down
   docker compose up -d
   ```

### If containers won't start:
```bash
# Check logs
docker compose logs api
docker compose logs worker

# Common issues:
# - Database connection failed → check postgres container
# - Redis connection failed → check redis container
# - Port already in use → check with: netstat -tulpn | grep 3001
```

### If frontend shows white screen:
```bash
# Check web container logs
docker compose logs web

# Rebuild web container specifically
docker compose up -d --build web
```

## Success Criteria
✅ All API calls have only ONE `/api` segment
✅ Job submission returns 201 Created
✅ Jobs appear in job list
✅ Jobs process to completion
✅ Downloads work
✅ No console errors
✅ No ERR_BAD_RESPONSE errors
