#!/bin/bash
# Git deployment script for database fix + slider system

cd /Users/robertcampbell/Developer/nd-image-pipeline

echo "📦 Staging all changes..."
git add .

echo "📝 Creating commit..."
git commit -m "Fix database initialization and complete slider hint system

CRITICAL FIX:
- Add missing init-db.sql with complete database schema
- Fixes 'relation batches does not exist' errors
- Creates pipelines, batches, and jobs tables with proper indexes

DATABASE SCHEMA:
- Complete table definitions with foreign keys
- Automatic triggers for batch status updates
- Timestamp triggers for updated_at fields
- UUID generation for batches and jobs
- Seed data with default pipeline

SLIDER SYSTEM:
- Implement dynamic slider hint system with temporal color gradients
- Fix color gradient algorithm using position-based stops (no flickers)
- 4-color gradient for PNG (Green→Blue→Orange→Red)
- Bold monospace algorithm names with performance badges
- Fixed-width value box (60px) with white text
- Light gray slider track with colored thumb
- All colored elements transition together smoothly

BUG FIXES:
- Fix JobSubmit HTTP 400 error (parse pipeline_id as integer)
- Fix color interpolation to prevent blue/green flickers
- Match form-group label styling for consistency

DEPLOYMENT:
- Requires database reset: docker compose down -v
- See DATABASE_FIX_DEPLOYMENT.md for instructions"

echo "🚀 Pushing to GitHub..."
git push origin main

echo "✅ Done! Now deploy on LXC with:"
echo ""
echo "  cd ~/image-pipeline-app"
echo "  git pull origin main"
echo "  docker compose down -v"
echo "  docker compose up -d --build"
echo ""
echo "⚠️  WARNING: docker compose down -v will delete all existing data!"
