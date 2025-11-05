# DEPLOYMENT GUIDE - November 5, 2025

## Summary

5 priority fixes have been completed and are ready for deployment to production:

1. ✅ Click-to-browse file input (UX improvement)
2. ✅ Auto-page refresh after pipeline save (UX improvement)
3. ✅ Hide transparency controls for JPEG (UI clarity)
4. ✅ Better transparency labeling (UX clarity)
5. ✅ Exclude input files from downloads (cleaner downloads)

---

## Files Changed

### Frontend
- `frontend/src/components/JobSubmit.js` - Fixes #1
- `frontend/src/components/PipelineEditor.js` - Fixes #2, #3, #4

### Backend
- `backend/src/routes/jobs.js` - Fix #5

---

## Step 1: Commit & Push to GitHub

```bash
cd ~/Developer/nd-image-pipeline
git status  # Verify changed files
git add -A
git commit -m "Implement 5 priority fixes: click-browse, auto-refresh, hide JPEG transparency, better labels, exclude inputs"
git push origin main
```

---

## Step 2: Deploy to LXC Production Host

SSH into your LXC host and run:

```bash
cd nd-image-pipeline
git pull origin main
docker compose down
docker compose up -d --build
```

---

## Step 3: Monitor Deployment

Watch all containers for any issues:

```bash
docker compose logs -f
```

Or watch specific containers:

```bash
# Frontend logs
docker compose logs frontend -f

# API server logs
docker compose logs api -f

# Worker logs
docker compose logs worker -f

# Database logs
docker compose logs postgres -f
```

---

## Step 4: Verify Deployment

Open browser and test each fix:

### Test Fix #1: Click to Browse
1. Go to http://your-production-url/
2. Click "Submit Job" tab
3. Click (don't drag) on the drop zone
4. Verify file picker opens

### Test Fix #2: Auto-Refresh
1. Click "Manage Pipelines" tab
2. Click "+ Single Asset" button
3. Fill in name (e.g., "Test Pipeline")
4. Click "Create Pipeline"
5. Verify page auto-refreshes after ~2 seconds
6. Go to "Submit Job" tab
7. Verify new pipeline appears in dropdown

### Test Fix #3 & #4: Transparency Controls
1. Click "Manage Pipelines" tab
2. Create new pipeline → Format = "JPEG"
3. Scroll to "Transparency & Background"
4. Verify: NO transparency checkbox
5. Verify: Only background color picker shown
6. Change format to "PNG"
7. Verify: Transparency checkbox NOW appears

### Test Fix #5: Exclude Input Files
1. Submit a job with 1 image
2. Wait for job to complete
3. Click "Download" button
4. Extract/examine downloaded file
5. Verify: Only output files are included
6. Verify: No `input_*` files in download

---

## Rollback Instructions (if needed)

If something goes wrong:

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# On production:
git pull origin main
docker compose down
docker compose up -d --build
docker compose logs -f
```

---

## Performance Notes

- **Build time**: ~2-3 minutes (rebuilding Docker images)
- **Downtime**: ~30 seconds (during compose down/up)
- **No data loss**: All existing jobs and pipelines preserved
- **No database migrations**: These are frontend/routing changes only

---

## Verification Checklist

After deployment, verify:

- [ ] All containers are running: `docker compose ps`
- [ ] No errors in logs: `docker compose logs --tail=100`
- [ ] Frontend loads: `curl http://localhost:3000`
- [ ] API responds: `curl http://localhost:3001/api/health`
- [ ] Database connected: Check API logs
- [ ] All 5 fixes work as described above

---

## Support

If issues occur:

1. **Check logs**: `docker compose logs -f`
2. **Restart specific service**: `docker compose restart frontend` (or api, worker, postgres)
3. **Full rebuild**: `docker compose down && docker compose up -d --build`
4. **Nuclear option**: Remove all and restart from git

---

## Post-Deployment

Consider monitoring for:

- Job processing performance (should be unchanged)
- Frontend responsiveness (should be improved due to UX fixes)
- Download reliability (fix #5 should work cleanly)
- No error messages in logs

---

## Timeline

- **Commit time**: 2 minutes
- **Push time**: 1-2 minutes  
- **Docker build**: 2-3 minutes
- **Total deploy time**: ~5-7 minutes
- **Testing**: ~5 minutes

**Total deployment: ~10-15 minutes**

---

## Questions?

Review these documents for more details:

- `PRIORITY_FIXES_COMPLETED.md` - What was fixed and why
- `HIGH_PRIORITY_FIXES_COMPLETED.md` - Detailed technical changes
- `FIXES_SUMMARY_READY_TO_IMPLEMENT.md` - Original requirements

