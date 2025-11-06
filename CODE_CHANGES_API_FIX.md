# Code Changes Summary - API URL Fix

## Pattern Applied to All Files

**Before (inconsistent):**
```javascript
// Some files had this:
const API_URL = process.env.REACT_APP_API_URL || '/api';

// Others had this:
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// And others did this:
const url = `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api${endpoint}`;
```

**After (standardized):**
```javascript
// Now ALL files use this pattern:
const BASE_URL = process.env.REACT_APP_API_URL || '';
const API_URL = BASE_URL ? `${BASE_URL}/api` : '/api';

// Then use API_URL directly:
const url = `${API_URL}/jobs`;
// Results in: /api/jobs (if BASE_URL empty)
// Or: http://10.0.4.39:3001/api/jobs (if BASE_URL set)
```

## File-by-File Changes

### 1. frontend/src/App.js
```diff
-const API_URL = process.env.REACT_APP_API_URL || '/api';
+const BASE_URL = process.env.REACT_APP_API_URL || '';
+const API_URL = BASE_URL ? `${BASE_URL}/api` : '/api';
```

### 2. frontend/src/components/JobSubmit.js
```diff
-const url = `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api${endpoint}`;
+const BASE_URL = process.env.REACT_APP_API_URL || '';
+const API_URL = BASE_URL ? `${BASE_URL}/api` : '/api';
+// ...
+const url = `${API_URL}${endpoint}`;
```

### 3. frontend/src/components/JobList.js
```diff
+const BASE_URL = process.env.REACT_APP_API_URL || '';
+const API_URL = BASE_URL ? `${BASE_URL}/api` : '/api';
+
 const JobList = ({ jobs, onRefresh }) => {
   // ...
-  const url = `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/jobs/${jobId}/download`;
+  const url = `${API_URL}/jobs/${jobId}/download`;
```

### 4. frontend/src/components/PipelineEditor.js
```diff
-const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
+const BASE_URL = process.env.REACT_APP_API_URL || '';
+const API_URL = BASE_URL ? `${BASE_URL}/api` : '/api';
```

### 5. frontend/src/components/PipelineList.js
```diff
-const API_URL = process.env.REACT_APP_API_URL || '/api';
+const BASE_URL = process.env.REACT_APP_API_URL || '';
+const API_URL = BASE_URL ? `${BASE_URL}/api` : '/api';
```

## Why This Works

### Scenario 1: Development (REACT_APP_API_URL not set)
- `BASE_URL = ''` (empty)
- `API_URL = '/api'`
- Fetch to: `/api/jobs` → nginx proxies to `http://api:3001/api/jobs` ✅

### Scenario 2: Production with relative URLs (REACT_APP_API_URL='')
- `BASE_URL = ''` (empty)
- `API_URL = '/api'`
- Fetch to: `/api/jobs` → nginx proxies to `http://api:3001/api/jobs` ✅

### Scenario 3: Production with absolute URL (REACT_APP_API_URL='http://10.0.4.39:3001')
- `BASE_URL = 'http://10.0.4.39:3001'`
- `API_URL = 'http://10.0.4.39:3001/api'`
- Fetch to: `http://10.0.4.39:3001/api/jobs` → direct to backend ✅

### What Was Breaking Before
If someone set `REACT_APP_API_URL='http://10.0.4.39:3001/api'` (with `/api`):
- JobSubmit.js would do: `'http://10.0.4.39:3001/api' + '/api' + '/jobs'`
- Result: `http://10.0.4.39:3001/api/api/jobs` ❌
- Backend 404 error because route doesn't exist

## Backend Routes (Unchanged - These Are Correct)

```javascript
// backend/src/server.js
app.use('/api/pipelines', require('./routes/pipelines'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/batches', require('./routes/batches'));
```

Backend expects: `http://api:3001/api/jobs` ✅

## Nginx Config (Unchanged - This Is Correct)

```nginx
location /api {
    proxy_pass http://api:3001;
}
```

Request to nginx: `/api/jobs`
Proxied to: `http://api:3001/api/jobs` ✅

## Expected API Calls After Fix

All API calls should look like ONE of these:
- `/api/jobs` (relative - proxied by nginx)
- `http://10.0.4.39:3001/api/jobs` (absolute - direct to backend)

NEVER:
- ❌ `/api/api/jobs`
- ❌ `http://10.0.4.39:3001/api/api/jobs`
