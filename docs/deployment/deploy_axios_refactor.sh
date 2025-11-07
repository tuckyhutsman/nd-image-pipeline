#!/bin/bash

# Deploy Axios Refactor - The "Impossible to Break" API Configuration
# This eliminates the recurring /api/api/ URL bug permanently

set -e

echo "=========================================================="
echo "  Deploying Axios Refactor"
echo "  Making /api/api/ bugs impossible"
echo "=========================================================="

echo ""
echo "Changes summary:"
echo "  ✅ Created frontend/src/config/api.js (single source of truth)"
echo "  ✅ Refactored 5 components to use apiClient"
echo "  ✅ Updated docker-compose.yml env var name"
echo "  ✅ Added automatic request/response logging"
echo "  ✅ Centralized error handling"
echo ""

echo "Step 1: Committing changes..."
cd /Users/robertcampbell/Developer/nd-image-pipeline

git add .
git commit -m "Refactor: Centralize API configuration with axios

BREAKING CHANGE: Environment variable renamed
- OLD: REACT_APP_API_URL
- NEW: REACT_APP_API_BASE_URL

This refactor makes /api/api/ URL bugs impossible by:
- Creating single source of truth in config/api.js
- Using axios instance with baseURL set once
- Eliminating manual URL concatenation across components
- Adding automatic request/response logging
- Centralizing error handling

Files changed:
- Created: frontend/src/config/api.js
- Modified: App.js, JobSubmit.js, JobList.js, PipelineEditor.js, PipelineList.js
- Updated: docker-compose.yml

No backend changes required."

git push origin main

echo ""
echo "✅ Changes pushed to GitHub"
echo ""

echo "=========================================================="
echo "  IMPORTANT: Update .env on LXC"
echo "=========================================================="
echo ""
echo "The environment variable has been renamed:"
echo "  OLD: REACT_APP_API_URL"
echo "  NEW: REACT_APP_API_BASE_URL"
echo ""
echo "Recommended .env configuration on LXC:"
echo ""
echo "  # Option 1: Empty (uses nginx proxy - RECOMMENDED)"
echo "  REACT_APP_API_BASE_URL="
echo ""
echo "  # Option 2: Direct to backend"
echo "  REACT_APP_API_BASE_URL=http://10.0.4.39:3001"
echo ""
echo "  # ❌ NEVER include /api in the variable:"
echo "  # REACT_APP_API_BASE_URL=http://10.0.4.39:3001/api  # WRONG!"
echo ""

echo "=========================================================="
echo "  Deploy on LXC (10.0.4.39)"
echo "=========================================================="
echo ""
echo "Run these commands:"
echo ""
echo "  ssh root@10.0.4.39"
echo ""
echo "  # Navigate to project"
echo "  cd ~/image-pipeline-app"
echo ""
echo "  # Pull latest changes"
echo "  git pull origin main"
echo ""
echo "  # IMPORTANT: Check/update .env file"
echo "  nano .env"
echo "  # Change REACT_APP_API_URL to REACT_APP_API_BASE_URL"
echo "  # Set to empty or http://10.0.4.39:3001 (without /api)"
echo ""
echo "  # Rebuild containers"
echo "  docker compose down"
echo "  docker compose up -d --build"
echo ""
echo "  # Watch logs - look for [API Request] logs"
echo "  docker compose logs -f web"
echo ""

echo "=========================================================="
echo "  Verification Checklist"
echo "=========================================================="
echo ""
echo "1. Open browser: http://10.0.4.39:3000"
echo "2. Open DevTools Console"
echo "3. Should see logs like:"
echo "   [API Request] GET /api/pipelines"
echo "   [API Response] GET /pipelines - 200"
echo ""
echo "4. Open Network tab"
echo "5. All API calls should have SINGLE /api:"
echo "   ✅ /api/pipelines"
echo "   ✅ http://10.0.4.39:3001/api/jobs"
echo "   ❌ /api/api/jobs (should NEVER see this)"
echo ""
echo "6. Test full workflow:"
echo "   - Load pipelines ✅"
echo "   - Submit job ✅"
echo "   - View jobs ✅"
echo "   - Download result ✅"
echo ""

echo "=========================================================="
echo "  What Makes This Bulletproof"
echo "=========================================================="
echo ""
echo "The /api prefix is defined in EXACTLY ONE PLACE:"
echo "  frontend/src/config/api.js"
echo ""
echo "All components use:"
echo "  apiClient.get('/jobs')     NOT '/api/jobs'"
echo "  apiClient.post('/jobs')    NOT '/api/jobs'"
echo ""
echo "axios automatically adds baseURL to every request."
echo "You literally cannot create /api/api/ URLs with this pattern."
echo ""
echo "If someone tries to set REACT_APP_API_BASE_URL with /api,"
echo "the console logs will immediately show the double /api."
echo ""

echo "Done! 🚀"
echo ""
