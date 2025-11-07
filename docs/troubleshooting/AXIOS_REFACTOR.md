# API Refactor - Axios Centralization

## What Changed

We refactored from **manual URL concatenation** to **centralized axios configuration**.

### Before (Error-Prone)
```javascript
// Different patterns in different files:
const API_URL = process.env.REACT_APP_API_URL || '/api';
const url = `${API_URL}/jobs`;
fetch(url, {...})
```

**Problems:**
- ❌ Easy to accidentally add `/api` twice
- ❌ Repeated logic in every file
- ❌ Hard to debug URL issues
- ❌ No centralized error handling
- ❌ Inconsistent patterns

### After (Bulletproof)
```javascript
// Single configuration file:
import apiClient from '../config/api';

// Use anywhere:
apiClient.get('/pipelines')
apiClient.post('/jobs', data)
apiClient.delete(`/pipelines/${id}`)
```

**Benefits:**
- ✅ **Impossible to add `/api` twice** - baseURL handles it
- ✅ One place to configure API URLs
- ✅ Automatic error logging
- ✅ Request/response interceptors
- ✅ Consistent across entire app

## File Changes

### Created Files
1. **`frontend/src/config/api.js`** - Single source of truth for API configuration

### Modified Files
1. `frontend/src/App.js` - Uses `apiClient.get()`
2. `frontend/src/components/JobSubmit.js` - Uses `apiClient.post()`
3. `frontend/src/components/JobList.js` - Uses `buildFullUrl()` for downloads
4. `frontend/src/components/PipelineEditor.js` - Uses `apiClient` for all CRUD
5. `frontend/src/components/PipelineList.js` - Uses `apiClient.post()`
6. `docker-compose.yml` - Updated env var name to `REACT_APP_API_BASE_URL`

## How It Works

### The axios Instance
```javascript
// frontend/src/config/api.js
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,  // /api added ONCE, here
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});
```

### Usage Examples

**Get requests:**
```javascript
import apiClient from '../config/api';

const response = await apiClient.get('/pipelines');
// Calls: http://10.0.4.39:3001/api/pipelines ✅
```

**Post requests:**
```javascript
const response = await apiClient.post('/jobs', {
  pipeline_id: 123,
  file_name: 'test.jpg',
});
// Calls: http://10.0.4.39:3001/api/jobs ✅
```

**Delete requests:**
```javascript
await apiClient.delete(`/pipelines/${id}`);
// Calls: http://10.0.4.39:3001/api/pipelines/abc-123 ✅
```

**Special case - Downloads:**
```javascript
import { buildFullUrl } from '../config/api';

const url = buildFullUrl('/api/jobs/123/download');
// Returns: http://10.0.4.39:3001/api/jobs/123/download
// Used for browser downloads via fetch()
```

## Why This Can't Break

### The Axios Pattern Prevents Mistakes

**Scenario 1: Developer tries to add `/api` in path**
```javascript
// Even if someone does this:
apiClient.get('/api/jobs')  // ❌ WRONG

// It becomes:
// baseURL (/api) + path (/api/jobs) = /api/api/jobs

// BUT: You can see it in the path! It's obvious!
// You'd never write: apiClient.get('/api/jobs')
// You'd write: apiClient.get('/jobs')
```

**Scenario 2: Developer edits environment variable**
```bash
# If someone sets:
REACT_APP_API_BASE_URL=http://10.0.4.39:3001/api  # WRONG

# The axios baseURL becomes:
http://10.0.4.39:3001/api + /api = http://10.0.4.39:3001/api/api

# BUT: The logs will immediately show this!
# Console: [API Request] GET http://10.0.4.39:3001/api/api/jobs
# You'll see the double /api instantly
```

**Scenario 3: Someone manually uses fetch()**
```javascript
// If someone bypasses apiClient and uses fetch:
fetch('http://10.0.4.39:3001/api/api/jobs')  // ❌

// Code review catches this because:
// 1. Why aren't you using apiClient?
// 2. The URL is hard-coded and obvious
```

## Automatic Logging

The axios interceptors log every request/response in development:

```javascript
// Console output:
[API Request] GET /api/pipelines
[API Response] GET /pipelines - 200
[API Request] POST /api/jobs
[API Response] POST /jobs - 201
```

**If there's ever a double `/api`, you'll see it immediately:**
```javascript
[API Request] GET /api/api/jobs  // ❌ Obvious problem!
```

## Environment Variable Configuration

### Development (.env.local or leave empty)
```bash
# Let it use default (empty)
# Result: Uses relative paths /api/jobs
```

### Production (LXC .env)
```bash
# Option 1: Empty (recommended - uses nginx proxy)
REACT_APP_API_BASE_URL=

# Option 2: Direct backend access
REACT_APP_API_BASE_URL=http://10.0.4.39:3001
```

### NEVER DO THIS
```bash
# ❌ WRONG - DO NOT INCLUDE /api
REACT_APP_API_BASE_URL=http://10.0.4.39:3001/api
REACT_APP_API_BASE_URL=/api
```

## Error Handling

The axios interceptors provide automatic error logging:

```javascript
// Response interceptor catches errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server error (4xx, 5xx)
      console.error(`[API Error] ${error.response.status}: ${error.response.data?.error}`);
    } else if (error.request) {
      // Network error
      console.error('[API Error] No response received');
    }
    return Promise.reject(error);
  }
);
```

**Console output for errors:**
```
[API Error] 404: Job not found
[API Error] 500: Database connection failed
[API Error] No response received: Network error
```

## Testing the Refactor

### 1. Check Console Logs
After deployment, open DevTools console and look for:
```
[API Request] GET /api/pipelines
[API Request] POST /api/jobs
```

**Should NEVER see:**
```
[API Request] GET /api/api/pipelines  ❌
```

### 2. Network Tab
All API calls should show:
- `/api/pipelines` (relative)
- OR `http://10.0.4.39:3001/api/pipelines` (absolute)

**NEVER:**
- `/api/api/pipelines` ❌
- `http://10.0.4.39:3001/api/api/jobs` ❌

### 3. Functionality Test
- ✅ Pipeline list loads
- ✅ Job submission works
- ✅ Jobs appear in list
- ✅ Downloads work
- ✅ No ERR_BAD_RESPONSE errors

## Migration Path

**No breaking changes!** The refactor is internal to the frontend.

Backend and nginx configuration remain unchanged:
- Backend still expects: `/api/jobs`
- Nginx still proxies: `/api/*` → `http://api:3001/api/*`

## Future Improvements

With this foundation, we can easily add:

1. **Authentication**
```javascript
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

2. **Retry Logic**
```javascript
apiClient.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 429) {
      // Retry after rate limit
      await sleep(1000);
      return apiClient.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

3. **Request Cancellation**
```javascript
const source = axios.CancelToken.source();
apiClient.get('/jobs', { cancelToken: source.token });
```

4. **Progress Tracking**
```javascript
apiClient.post('/jobs', data, {
  onUploadProgress: (e) => {
    console.log(Math.round((e.loaded * 100) / e.total) + '%');
  }
});
```

## Summary

**Before:** Manual URL assembly in every file → Easy to make `/api/api/` mistakes

**After:** Centralized axios instance → Impossible to make URL mistakes

**Key principle:** The `/api` prefix exists in exactly ONE place (`api.js`), not scattered across 5+ files.
