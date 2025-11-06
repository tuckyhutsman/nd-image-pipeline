// frontend/src/config/api.js
import axios from 'axios';

/**
 * API Configuration - Single Source of Truth for API URLs
 * 
 * CRITICAL: REACT_APP_API_BASE_URL should NEVER include '/api'
 * 
 * Valid configurations:
 * - Development: REACT_APP_API_BASE_URL=http://localhost:3001
 * - Production (same-origin): REACT_APP_API_BASE_URL= (empty)
 * - Production (different host): REACT_APP_API_BASE_URL=http://10.0.4.39:3001
 * 
 * WRONG - DO NOT USE:
 * - ❌ REACT_APP_API_BASE_URL=http://localhost:3001/api
 * - ❌ REACT_APP_API_BASE_URL=/api
 * 
 * The '/api' prefix is added automatically in baseURL below.
 * This makes it impossible to accidentally create /api/api/ URLs.
 */

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor - logs all outgoing requests in development
apiClient.interceptors.request.use(
  (config) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    }
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor - handles common errors
apiClient.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    }
    return response;
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      console.error(`[API Error] ${error.response.status}: ${error.response.data?.error || error.message}`);
    } else if (error.request) {
      // Request made but no response
      console.error('[API Error] No response received:', error.message);
    } else {
      // Error in request setup
      console.error('[API Error] Request setup:', error.message);
    }
    return Promise.reject(error);
  }
);

/**
 * Build a full URL for non-API requests (like downloads)
 * Use this ONLY for special cases that need the full URL
 */
export const buildFullUrl = (path) => {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export default apiClient;
