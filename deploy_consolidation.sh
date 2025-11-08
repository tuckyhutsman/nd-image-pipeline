#!/bin/bash
# Complete consolidation deployment script

echo "🚀 Starting Pipeline Editor Consolidation Deployment"
echo ""

cd /Users/robertcampbell/Developer/nd-image-pipeline

echo "📝 Checking git status..."
git status

echo ""
echo "➕ Staging modified files..."
git add frontend/src/components/PipelineEditor.js
git add frontend/src/components/PipelineEditor.css
git add frontend/src/App.js

echo ""
echo "🗑️  Removing orphaned PipelineList files..."
git rm frontend/src/components/PipelineList.js
git rm frontend/src/components/PipelineList.css

echo ""
echo "📋 Staging documentation..."
git add ARCHIVE_FEATURE_DEBUG_GUIDE.md
git add ARCHIVE_IMPLEMENTATION_COMPLETE.md
git add CONSOLIDATION_COMPLETE.md

echo ""
echo "💾 Creating commit..."
git commit -m "feat: Consolidate to unified Pipeline Editor with archive

Complete consolidation of pipeline management interface:

Features Added:
- Archive/Unarchive functionality with confirmation dialogs
- Contextual buttons based on Active/Archived tab state
- Active tab: Edit + Archive buttons
- Archived tab: Restore + Delete buttons
- Warning button style for Archive action (orange)
- Confirmation dialogs for all destructive actions

Improvements:
- Remove redundant PipelineList component
- Unified interface with templates always visible
- Two-column layout (Single | Multi Asset) with archive support
- Better user experience with single consolidated view

Technical Changes:
- Import and integrate ConfirmDialog component
- Add handleArchive() and handleUnarchive() functions
- Update handleDelete() to use confirmation dialog
- Add conditional button rendering based on tab state
- Add .btn-warning CSS style
- Simplify App.js routing to always use PipelineEditor
- Remove PipelineList.js and PipelineList.css

Documentation:
- Complete debug guide for archive feature
- Implementation summary with all changes
- Testing checklist and troubleshooting guide

All pipeline management now in single unified interface!"

echo ""
echo "🔄 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Git operations complete!"
echo ""
echo "📦 Ready to deploy to LXC"
echo ""
echo "Run this command to deploy:"
echo "ssh root@[YOUR_LXC_IP] \"cd /root/nd-image-pipeline && git pull origin main && docker compose down && docker compose build frontend && docker compose up -d && docker compose ps\""
echo ""
echo "🎉 Consolidation deployment script complete!"
