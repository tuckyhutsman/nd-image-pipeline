# API URL Double `/api` Fix

## Problem
The frontend was making API calls to URLs like:
- `http://10.0.4.39:3001/api/api/jobs/batch` ❌

This was causing `ERR_BAD_RESPONSE` errors because the backend couldn't find the routes.

## Root Cause
**Inconsistent handling of `REACT_APP_API_URL` environment variable** across components:

- Some files assumed `REACT_APP_API_URL` included `/api`
- Others assumed it didn't and manually added `/api`
- This resulted in double `/api` in URLs

## Solution
**Standardized pattern across ALL frontend files:**

```javascript
// API_URL should be just the base URL (e.g., 'http://10.0.4.39:3001' or empty)
// We always append '/api' to it
const BASE_URL = process.env.REACT_APP_API_URL || '';
const API_URL = BASE_URL ? `${BASE_URL}/api` : '/api';
```

## Files Updated
1. ✅ `frontend/src/App.js`
2. ✅ `frontend/src/components/JobSubmit.js`
3. ✅ `frontend/src/components/JobList.js`
4. ✅ `frontend/src/components/PipelineEditor.js`
5. ✅ `frontend/src/components/PipelineList.js`

## Environment Variable Configuration

### Development (Local)
**Leave `REACT_APP_API_URL` empty or unset** - the frontend will use relative paths:
```bash
# .env (or leave this line commented out)
# REACT_APP_API_URL=
```

Result: API calls go to `/api/jobs` → nginx proxies to `http://api:3001/api/jobs` ✅

### Production (LXC)
**Set `REACT_APP_API_URL` to empty string or the backend base URL without `/api`:**

**Option 1 (Recommended):** Empty - use relative paths
```bash
# .env on LXC
REACT_APP_API_URL=
```

**Option 2:** Absolute URL to backend (without `/api`)
```bash
# .env on LXC
REACT_APP_API_URL=http://10.0.4.39:3001
```

**❌ NEVER include `/api` in the environment variable:**
```bash
# WRONG - DO NOT USE:
REACT_APP_API_URL=http://10.0.4.39:3001/api  ❌
```

## Expected Behavior After Fix

### With Empty `REACT_APP_API_URL`:
- API calls: `/api/jobs` → nginx proxies → `http://api:3001/api/jobs` ✅

### With `REACT_APP_API_URL=http://10.0.4.39:3001`:
- API calls: `http://10.0.4.39:3001/api/jobs` → goes directly to backend ✅

## Testing the Fix

1. **Push changes to GitHub:**
   ```bash
   git add .
   git commit -m "Fix: Standardize API URL handling to prevent double /api in paths"
   git push origin main
   ```

2. **Deploy to LXC:**
   ```bash
   # SSH into LXC
   ssh root@10.0.4.39
   
   # Navigate to project
   cd ~/image-pipeline-app
   
   # Pull latest changes
   git pull origin main
   
   # Rebuild and restart containers
   docker compose down
   docker compose up -d --build
   
   # Watch logs
   docker compose logs -f api worker
   ```

3. **Test job submission:**
   - Open browser: `http://10.0.4.39:3000`
   - Select a pipeline
   - Upload an image
   - Submit
   - Check Network tab - should see `http://10.0.4.39:3001/api/jobs/batch` (single `/api`) ✅

## Backend Route Structure (No Changes Needed)

The backend correctly expects `/api` prefix:
```javascript
// backend/src/server.js
app.use('/api/pipelines', require('./routes/pipelines'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/batches', require('./routes/batches'));
```

## Nginx Configuration (No Changes Needed)

```nginx
location /api {
    proxy_pass http://api:3001;
}
```

This proxies `/api/jobs` → `http://api:3001/api/jobs` ✅
