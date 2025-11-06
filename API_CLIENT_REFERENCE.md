# Quick Reference - Using apiClient

## Import
```javascript
import apiClient from '../config/api';
```

## Common Operations

### GET Requests
```javascript
// List all
const response = await apiClient.get('/pipelines');
const pipelines = response.data;

// Get specific
const response = await apiClient.get(`/pipelines/${id}`);
const pipeline = response.data;

// With query parameters
const response = await apiClient.get('/jobs', {
  params: { status: 'completed', limit: 10 }
});
// Calls: /api/jobs?status=completed&limit=10
```

### POST Requests
```javascript
// Create resource
const response = await apiClient.post('/jobs', {
  pipeline_id: 123,
  file_name: 'test.jpg',
  file_data: 'base64...'
});
const newJob = response.data;

// Batch create
const response = await apiClient.post('/jobs/batch', {
  pipeline_id: 123,
  files: [/* array of files */],
  batch_description: 'My Batch'
});
```

### PUT Requests
```javascript
// Update resource
const response = await apiClient.put(`/pipelines/${id}`, {
  name: 'Updated Name',
  config: { /* updated config */ }
});
```

### DELETE Requests
```javascript
// Delete resource
await apiClient.delete(`/pipelines/${id}`);
```

## Error Handling

### Try-Catch Pattern
```javascript
try {
  const response = await apiClient.get('/pipelines');
  setPipelines(response.data);
} catch (error) {
  // Error already logged by interceptor
  if (error.response) {
    // Server responded with error status
    console.error('Server error:', error.response.status);
    setError(error.response.data?.error || 'Server error');
  } else if (error.request) {
    // Request made but no response
    setError('Network error - please check connection');
  } else {
    // Error in request setup
    setError('Request error');
  }
}
```

### Checking Status Codes
```javascript
try {
  await apiClient.post('/jobs', data);
} catch (error) {
  if (error.response?.status === 404) {
    alert('Pipeline not found');
  } else if (error.response?.status === 500) {
    alert('Server error');
  }
}
```

## Special Cases

### Downloads (need full URL)
```javascript
import { buildFullUrl } from '../config/api';

// For browser downloads via fetch
const url = buildFullUrl('/api/jobs/123/download');
const response = await fetch(url);
const blob = await response.blob();
// ... trigger download
```

### File Uploads with Progress
```javascript
const response = await apiClient.post('/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
  onUploadProgress: (progressEvent) => {
    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
    setUploadProgress(percent);
  }
});
```

### Custom Headers
```javascript
const response = await apiClient.get('/pipelines', {
  headers: {
    'X-Custom-Header': 'value'
  }
});
```

### Timeout Override
```javascript
// Default is 30 seconds, override for specific request
const response = await apiClient.get('/long-process', {
  timeout: 60000  // 60 seconds
});
```

## DO NOT Do These

### ❌ Don't Include /api in Paths
```javascript
// WRONG
apiClient.get('/api/jobs')  // Results in /api/api/jobs

// RIGHT
apiClient.get('/jobs')  // Results in /api/jobs
```

### ❌ Don't Use Absolute URLs
```javascript
// WRONG
apiClient.get('http://10.0.4.39:3001/api/jobs')

// RIGHT
apiClient.get('/jobs')  // baseURL handles the full path
```

### ❌ Don't Manually Concatenate URLs
```javascript
// WRONG
const url = `${API_URL}/jobs`;
fetch(url)

// RIGHT
apiClient.get('/jobs')
```

### ❌ Don't Mix fetch() and apiClient
```javascript
// INCONSISTENT - pick one pattern
const response1 = await fetch('/api/jobs');  // ❌
const response2 = await apiClient.get('/jobs');  // ✅

// Be consistent - use apiClient everywhere
```

## Console Logging

In development, every request is automatically logged:

```javascript
// When you call:
apiClient.get('/pipelines')

// Console shows:
[API Request] GET /api/pipelines
[API Response] GET /pipelines - 200

// If error:
[API Error] 404: Pipeline not found
```

This helps with debugging - you can see every API call and its result.

## Environment Configuration

The `apiClient` automatically uses the correct base URL:

```javascript
// Development (env var empty or not set)
apiClient.get('/jobs')  
→ calls: http://localhost:3000/api/jobs (proxied by nginx)

// Production (env var = http://10.0.4.39:3001)
apiClient.get('/jobs')
→ calls: http://10.0.4.39:3001/api/jobs
```

**You never need to think about the base URL** - it's handled automatically.

## Common Patterns

### Fetch and Set State
```javascript
const fetchData = async () => {
  try {
    const response = await apiClient.get('/pipelines');
    setPipelines(response.data);
  } catch (error) {
    setError('Failed to load pipelines');
  }
};

useEffect(() => {
  fetchData();
}, []);
```

### Create with Validation
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!formData.name) {
    setError('Name is required');
    return;
  }
  
  setLoading(true);
  try {
    const response = await apiClient.post('/pipelines', formData);
    onSuccess(response.data);
  } catch (error) {
    setError('Failed to create pipeline');
  } finally {
    setLoading(false);
  }
};
```

### Update with Optimistic UI
```javascript
const handleUpdate = async (id, updates) => {
  // Optimistically update UI
  setPipelines(prev => prev.map(p => 
    p.id === id ? { ...p, ...updates } : p
  ));
  
  try {
    await apiClient.put(`/pipelines/${id}`, updates);
  } catch (error) {
    // Revert on error
    fetchPipelines();
    setError('Update failed');
  }
};
```

### Delete with Confirmation
```javascript
const handleDelete = async (id) => {
  if (!window.confirm('Are you sure?')) return;
  
  try {
    await apiClient.delete(`/pipelines/${id}`);
    setPipelines(prev => prev.filter(p => p.id !== id));
  } catch (error) {
    setError('Delete failed');
  }
};
```

## Summary

**One rule to remember:**
- Import `apiClient`
- Use `apiClient.get('/path')` (no `/api` prefix)
- That's it!

The baseURL, error handling, logging, and all URL construction is handled automatically.
