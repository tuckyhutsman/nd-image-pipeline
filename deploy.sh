#!/bin/bash
# Deploy script for pushing to LXC and redeploying

set -e

echo "🚀 nd-image-pipeline Deployment Script"
echo "========================================"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ Error: docker-compose.yml not found${NC}"
    echo "Run this script from the project root directory"
    exit 1
fi

echo -e "${YELLOW}📋 Step 1: Check Git Status${NC}"
git status

echo -e "\n${YELLOW}📋 Step 2: Add changes${NC}"
git add backend/src/worker.js \
        frontend/src/components/JobSubmit.js \
        frontend/src/components/JobSubmit.css \
        WORKER_COMPRESSION_ENHANCEMENTS.md \
        DEPLOYMENT_GUIDE_COMPRESSION.md \
        CHAT_7_SUMMARY.md

echo -e "${GREEN}✓ Files staged${NC}"

echo -e "\n${YELLOW}📋 Step 3: Commit changes${NC}"
git commit -m "feat: Add compression enhancements and batch description field

Worker Improvements:
- Format-specific compression with pngcrush/pngquant integration
- mozjpeg parameter tuning based on compression slider (0-100)
- WebP effort level mapping for better compression control
- Detailed logging of compression ratios and optimization steps
- Graceful fallback if external tools unavailable

Frontend Improvements:
- Add batch description field (max 50 chars, alphanumeric+hyphens/underscores)
- Auto-extract customer prefix from filenames for batch grouping
- Real-time validation and character counter
- Auto-generate description if left blank

Documentation:
- WORKER_COMPRESSION_ENHANCEMENTS.md - Technical implementation guide
- DEPLOYMENT_GUIDE_COMPRESSION.md - LXC deployment procedures
- CHAT_7_SUMMARY.md - Overview and accomplishments"

echo -e "${GREEN}✓ Changes committed${NC}"

echo -e "\n${YELLOW}📋 Step 4: Push to GitHub${NC}"
git push origin main
echo -e "${GREEN}✓ Pushed to GitHub${NC}"

echo -e "\n${GREEN}✅ GitHub Push Complete!${NC}"

echo -e "\n${YELLOW}📋 Step 5: Deploy to LXC${NC}"
echo "Run these commands on your LXC host:"
echo ""
echo -e "${YELLOW}ssh user@lxc-host${NC}"
echo -e "${YELLOW}cd /opt/nd-image-pipeline${NC}"
echo -e "${YELLOW}git pull origin main${NC}"
echo -e "${YELLOW}docker compose down${NC}"
echo -e "${YELLOW}docker compose up -d --build${NC}"
echo -e "${YELLOW}docker compose logs -f worker${NC}"
echo ""
echo -e "${GREEN}✅ All files ready for LXC deployment!${NC}"
