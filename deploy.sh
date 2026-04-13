#!/bin/bash
set -e

echo "🚀 Deploying AIROS..."

# Stage all changes
git add -A

# Commit if there are staged changes
if git diff --cached --quiet; then
  echo "✅ Nothing new to commit"
else
  git commit -m "${1:-deploy: update}"
fi

# Push → triggers Railway (backend) + Cloudflare Pages (frontend)
git push origin main

echo ""
echo "✅ Deployed!"
echo "   Backend  → Railway auto-deploys (~2 min)"
echo "   Frontend → Cloudflare Pages auto-builds (~5 min)"
