#!/bin/bash
# BATCH_SYSTEM_PHASE_1_DEPLOY.sh
# Quick deployment script for batch system Phase 1 to LXC

set -e

echo "════════════════════════════════════════════════════════════"
echo "  Batch Grouping System Phase 1 - Deployment Script"
echo "════════════════════════════════════════════════════════════"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "\n${YELLOW}STEP 1: Stage Files${NC}"
echo "Adding batch system files to git staging area..."

cd /Users/robertcampbell/Developer/nd-image-pipeline

git add \
  backend/migrations/001_add_batch_grouping.sql \
  backend/src/helpers/batch-helpers.js \
  backend/src/routes/batches.js \
  backend/src/routes/jobs.js \
  backend/src/server.js \
  BATCH_SYSTEM_PHASE_1.md \
  BATCH_DEPLOYMENT_PHASE_1.md \
  PHASE_1_COMPLETE.md

git status

echo -e "\n${YELLOW}STEP 2: Review Changes${NC}"
echo "Review the above changes. Continue? (y/n)"
read -r response

if [ "$response" != "y" ]; then
  echo "Aborted."
  exit 1
fi

echo -e "\n${YELLOW}STEP 3: Commit Changes${NC}"

git commit -m "feat: Implement batch grouping system Phase 1

Core Machinery - Foundation for all batch features:

Database:
- New 'batches' table with complete metadata
- batch_id foreign key on jobs table
- Auto-increment counter per customer/date
- Database triggers for automatic status updates
- Optimized indexes for filtering/sorting

Backend:
- batch-helpers.js: Core batch logic functions
- Updated jobs.js: Auto-batch creation for submissions
- New batches.js: Complete batch API endpoints

Features:
- Auto-generate base_directory_name: PL_ABC_2025-11-05_batch-1
- Extract customer prefix from filenames (PL_ABC)
- Auto-increment batch counter per day
- Auto-generate render description if not provided (N-file_Render)
- Automatic batch status management via triggers
- Full filtering and sorting support at API level

API Endpoints:
- GET /api/batches - List all batches with filtering/sorting
- GET /api/batches/:batch_id - Get batch with nested jobs
- GET /api/batches/:batch_id/download - Download entire batch as ZIP
- DELETE /api/batches/:batch_id - Delete batch and all jobs

Enables Phase 2:
- Phase 7: Batch Grouping in JobList UI
- Phase 8: Batch Download functionality
- Phase 9: Job Filtering, Sorting, Search

Database Migration: Required
Breaking Changes: None (backward compatible)
Testing: See BATCH_SYSTEM_PHASE_1.md for test procedures

This is the foundational machinery that Phases 7, 8, and 9 depend on."

echo -e "${GREEN}✓ Committed${NC}"

echo -e "\n${YELLOW}STEP 4: Push to GitHub${NC}"

git push origin main

echo -e "${GREEN}✓ Pushed to GitHub${NC}"

echo -e "\n════════════════════════════════════════════════════════════"
echo -e "${GREEN}GitHub Deployment Complete!${NC}"
echo "════════════════════════════════════════════════════════════"

echo -e "\n${YELLOW}Next: Deploy to LXC${NC}"
echo ""
echo "SSH to your LXC host and run:"
echo ""
echo -e "  ${YELLOW}ssh user@lxc-host${NC}"
echo -e "  ${YELLOW}cd /opt/nd-image-pipeline${NC}"
echo -e "  ${YELLOW}git pull origin main${NC}"
echo -e "  ${YELLOW}docker compose down${NC}"
echo -e "  ${YELLOW}docker compose up -d --build${NC}"
echo -e "  ${YELLOW}docker compose logs -f worker${NC}"
echo ""
echo "Or use the deployment guide:"
echo "  BATCH_DEPLOYMENT_PHASE_1.md"
echo ""
echo -e "${GREEN}All files ready for LXC deployment! ✓${NC}"
