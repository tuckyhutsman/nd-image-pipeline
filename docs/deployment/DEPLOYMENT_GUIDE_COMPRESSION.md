# Deployment Guide - Compression Enhancements + Batch Description

**Date**: November 5, 2025  
**Changes**: Worker compression optimizations + JobSubmit batch description field

---

## Quick Deploy to LXC

### Step 1: Push Changes to GitHub

```bash
cd ~/Developer/nd-image-pipeline

# Review changes
git status

# Stage and commit
git add backend/src/worker.js \
        frontend/src/components/JobSubmit.js \
        frontend/src/components/JobSubmit.css \
        WORKER_COMPRESSION_ENHANCEMENTS.md

git commit -m "feat: Add format-specific compression tools and batch description

- Enhanced worker with pngcrush/pngquant integration for aggressive PNG optimization
- Implement mozjpeg parameter tuning based on compression slider (0-100)
- Add WebP effort level mapping to compression slider
- Add batch description field to JobSubmit form
- Auto-extract customer prefix from filenames for batch grouping
- Validate batch description (50 char max, alphanumeric+hyphens+underscores)
- Comprehensive logging of compression ratios and optimization steps"

git push origin main
```

### Step 2: Pull and Deploy on LXC

```bash
# SSH into LXC host
ssh user@lxc-host

# Navigate to project directory
cd /opt/nd-image-pipeline

# Pull latest changes
git pull origin main

# Rebuild containers to ensure tools are available
docker compose down

# Update Dockerfile to include optimization tools
# (Add to backend/Dockerfile if not already present)

# Rebuild and start
docker compose up -d --build

# Verify all services started
docker compose ps

# Check worker logs for startup messages
docker compose logs -f worker
```

### Step 3: Verify Deployment

Watch for successful startup:
```
worker_1 | ✓ Worker started, listening for jobs on "image-processing" queue...
backend_1 | Server running on port 3001
```

---

## Testing the New Features

### Test 1: PNG Compression Optimization

1. **Create a test pipeline** in the UI:
   - Name: "PNG High Compression Test"
   - Format: PNG 24-bit
   - Width: 1000px
   - Compression: 90 (should trigger pngcrush)

2. **Submit a test PNG image**:
   - Batch Description: "Compression Test"
   - Select a PNG file (2-5MB)

3. **Check worker logs**:
   ```bash
   docker compose logs -f worker | grep -i "png"
   ```

   Expected output:
   ```
   ✓ PNG optimized with pngcrush: 500KB → 320KB (-36%)
   ```

### Test 2: JPEG Quality/Compression Mapping

1. **Create JPEG pipeline**:
   - Format: JPEG
   - Quality: 80
   - Compression: 30 (aggressive compression)

2. **Submit image**:
   - Batch Description: "JPEG Aggressive"
   - Select a JPEG file

3. **Check logs**:
   ```bash
   docker compose logs worker | grep "JPEG:"
   ```

   Expected output:
   ```
   JPEG: quality=80, compression=30/100, quantTable=4
   ```

### Test 3: Batch Description Field

1. Open the app: http://localhost:3000
2. Go to "Submit Images"
3. Verify:
   - [ ] Batch Description field appears (optional)
   - [ ] Character counter shows (e.g., "5/50")
   - [ ] Only alphanumeric, hyphens, underscores accepted
   - [ ] Max 50 characters enforced
   - [ ] Invalid characters show error
   - [ ] Auto-generates if left blank

### Test 4: Customer Prefix Extraction

1. Submit files with names like:
   - `PL_DXB191_Product_Front.jpg`
   - `PL_ABC123_View_Side.png`

2. Check browser console (DevTools) or API logs:
   ```javascript
   // In browser console after submit
   customerPrefix: "PL_DXB"
   ```

---

## Monitoring & Debugging

### View Real-Time Worker Logs

```bash
# All worker output
docker compose logs -f worker

# Filter for compression operations
docker compose logs worker | grep "✓ PNG"
docker compose logs worker | grep "JPEG:"
docker compose logs worker | grep "WebP:"

# Watch for errors
docker compose logs worker | grep "✗"
```

### Check Backend Logs

```bash
docker compose logs -f backend
```

### Check if Optimization Tools Available

```bash
# Inside worker container
docker compose exec worker which pngcrush
docker compose exec worker which pngquant

# If not found, they'll be auto-skipped with info messages
```

### Database Queries (if needed)

```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U ${DB_USER} ${DB_NAME}

# Check jobs table
SELECT id, status, created_at FROM jobs ORDER BY created_at DESC LIMIT 10;

# Check pipelines
SELECT id, name, config FROM pipelines;
```

---

## Rollback Instructions

If issues occur, rollback to previous version:

```bash
# On dev machine
git revert HEAD
git push origin main

# On LXC
git pull origin main
docker compose down
docker compose up -d --build
docker compose logs -f
```

---

## Performance Baseline

Before deploying to production, establish baseline metrics:

### Test Image: 2000x1500px PNG (5MB source)

| Format | Quality | Compression | Output Size | Time | Ratio |
|--------|---------|-------------|-------------|------|-------|
| PNG    | N/A     | 50          | ~2.3 MB    | 250ms | 46%   |
| PNG    | N/A     | 90          | ~1.8 MB    | 350ms | 36%   |
| JPEG   | 80      | 30          | ~450 KB    | 150ms | 9%    |
| JPEG   | 80      | 70          | ~550 KB    | 160ms | 11%   |
| WebP   | 80      | 50          | ~480 KB    | 200ms | 10%   |

---

## Troubleshooting

### Issue: "PNG external optimization skipped"

**Cause**: pngcrush/pngquant not installed in container

**Solution**:
```dockerfile
# Add to backend/Dockerfile
RUN apt-get update && apt-get install -y pngcrush pngquant
```

Rebuild: `docker compose up -d --build`

### Issue: Compression not reducing file size

**Cause**: Source already optimized, external tools see no improvement

**Solution**: Expected behavior - tools only replace if smaller. Check logs:
```
Original: 1024KB
Optimized: 1024KB
(Not replaced because same size)
```

### Issue: WebP effort level too slow

**Cause**: Compression slider set to 100 (effort 6)

**Solution**: Lower compression slider value for faster processing
- Effort 0-2: Fast (compression 0-33)
- Effort 3-4: Balanced (compression 33-66)
- Effort 5-6: Maximum (compression 66-100)

### Issue: JPEG quality too low

**Cause**: Quality slider set too low (< 30) + Compression slider also low

**Solution**: 
- Quality slider controls visual quality (0-100)
- Compression slider controls optimization aggressiveness
- Recommended: Quality 70+, Compression varies by use case

---

## Post-Deployment Checklist

- [ ] All containers running: `docker compose ps`
- [ ] Worker listening: `docker compose logs worker | grep "Worker started"`
- [ ] Backend responding: `curl http://localhost:3001/api/health`
- [ ] Frontend loads: Open http://localhost:3000
- [ ] Pipeline Editor works: Create a test pipeline
- [ ] Batch description field visible in JobSubmit
- [ ] Test image processes successfully
- [ ] Compression logs show optimization details
- [ ] Output files have expected size reduction
- [ ] No errors in worker logs

---

## Next Deployment Phase

After verifying compression enhancements work:

1. **Database Migration** (1 hour)
   - Add batches table
   - Add batch_id column to jobs
   - Create migrations script

2. **Backend Batch API** (1-2 hours)
   - POST /api/batches
   - GET /api/batches
   - GET /api/batches/{id}
   - POST /api/jobs/batch (update)

3. **Frontend Batch Display** (1.5-2 hours)
   - Update JobList to show batches
   - Add batch expandable rows
   - Add batch download button

Estimated total for Phase 2: 3-4 hours

---

## Notes

- Compression enhancements are **backward compatible** - no database changes required
- Batch description is **optional** - existing jobs still work
- Optimization tools are **optional** - graceful degradation if unavailable
- All changes are **non-breaking** to existing pipelines

Deploy with confidence! 🚀

