#!/bin/bash
# Deployment script for slider hint system updates

echo "🚀 Deploying Slider Hint System to nd-image-pipeline"
echo ""

# Step 1: Commit changes
echo "📝 Committing changes..."
git add .
git commit -m "feat: implement data-driven slider hint system with algorithm feedback

Changes:
- Add SliderWithHint component with Green→Red color scheme reflecting processing intensity
- Integrate enhanced sliders into PipelineEditor for all image formats
- PNG 24-bit: 3 algorithms (Sharp → pngcrush-max → pngcrush-brute)
- PNG8: 2 algorithms (Sharp → pngquant)
- JPEG: 4 quantization levels with separate Quality/Compression sliders
- WebP: 6 effort levels with Quality/Effort sliders
- Fix HTTP 400 error in JobSubmit (pipeline_id integer parsing)
- Add comprehensive documentation (SLIDER_HINTS_SYSTEM.md, IMPLEMENTATION_COMPLETE.md)

Visual improvements:
- Dynamic color feedback: Green (fast) → Blue (balanced) → Orange/Red (slow)
- Algorithm names in monospace font with color-coded performance badges
- Real-time slider hints showing current algorithm and processing tradeoff
- Smooth color transitions matching actual worker.js algorithm breakpoints

Testing:
- All formats tested with correct algorithm transitions
- No HTTP errors in job submission
- Responsive design with dark mode support"

echo ""
echo "✅ Changes committed"
echo ""

# Step 2: Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Pushed to GitHub"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🖥️  Now deploy to production LXC:"
echo ""
echo "   ssh user@lxc-host"
echo "   cd /opt/nd-image-pipeline"
echo "   git pull origin main"
echo "   docker compose down"
echo "   docker compose up -d --build"
echo "   docker compose logs -f"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
