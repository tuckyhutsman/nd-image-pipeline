#!/bin/bash
# Quick Deployment Script for nd-image-pipeline
# Run this after pushing changes to GitHub

echo "🚀 Deploying nd-image-pipeline updates..."
echo ""

# Navigate to project directory
cd /path/to/nd-image-pipeline || exit 1

# Pull latest changes
echo "📥 Pulling latest code from GitHub..."
git pull origin main

if [ $? -ne 0 ]; then
  echo "❌ Git pull failed. Please resolve conflicts and try again."
  exit 1
fi

echo ""
echo "🔨 Rebuilding Docker containers..."
docker compose down
docker compose up -d --build

if [ $? -ne 0 ]; then
  echo "❌ Docker build failed. Check logs for errors."
  exit 1
fi

echo ""
echo "⏳ Waiting for containers to start..."
sleep 5

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Container Status:"
docker compose ps

echo ""
echo "📝 To view logs:"
echo "  Frontend:  docker compose logs frontend -f"
echo "  Backend:   docker compose logs backend -f"
echo "  Worker:    docker compose logs worker -f"
echo "  All:       docker compose logs -f"
echo ""
echo "🌐 Access the application at: http://localhost:3000"
echo ""
