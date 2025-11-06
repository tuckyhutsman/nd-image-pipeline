#!/bin/bash

# Deploy API URL Fix to LXC Production
# This script deploys the fix for double /api URL issue

set -e

echo "=================================================="
echo "  Deploying API URL Fix"
echo "=================================================="

echo ""
echo "Step 1: Commit and push changes to GitHub..."
cd /Users/robertcampbell/Developer/nd-image-pipeline

git add .
git commit -m "Fix: Standardize API URL handling to prevent double /api in paths

- Updated all frontend components to use consistent API_URL pattern
- BASE_URL from env var (without /api) + '/api' = API_URL
- Fixes ERR_BAD_RESPONSE errors from malformed URLs like /api/api/jobs
- Updated: App.js, JobSubmit.js, JobList.js, PipelineEditor.js, PipelineList.js"

git push origin main

echo ""
echo "✓ Changes pushed to GitHub"
echo ""
echo "=================================================="
echo "  Now deploy on LXC..."
echo "=================================================="
echo ""
echo "Run these commands on the LXC (10.0.4.39):"
echo ""
echo "  ssh root@10.0.4.39"
echo "  cd ~/image-pipeline-app"
echo "  git pull origin main"
echo "  docker compose down"
echo "  docker compose up -d --build"
echo "  docker compose logs -f api worker"
echo ""
echo "=================================================="
echo "  Test in browser:"
echo "=================================================="
echo ""
echo "1. Open: http://10.0.4.39:3000"
echo "2. Select a pipeline"
echo "3. Upload test image"
echo "4. Submit and check Network tab"
echo "5. Should see: http://10.0.4.39:3001/api/jobs (single /api)"
echo ""
