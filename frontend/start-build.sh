#!/bin/sh

echo "🚀 Starting Next.js application with automatic build..."

# Check if we're in auto-build mode
if [ "$FRONTEND_BUILD_MODE" = "auto" ]; then
    echo "🔧 Auto-build mode detected"
    
    # Check if .next folder exists (should exist from build stage)
    if [ ! -d ".next" ]; then
        echo "❌ ERROR: .next folder not found in auto-build mode!"
        echo "💡 This should not happen - check Dockerfile.build"
        exit 1
    fi
    
    echo "✅ Found built .next folder from build stage"
else
    echo "⚠️  Warning: FRONTEND_BUILD_MODE not set to 'auto'"
    echo "💡 This script is designed for auto-build mode"
fi

# Check if node_modules exists (should be production deps)
if [ ! -d "node_modules" ]; then
    echo "❌ ERROR: node_modules not found!"
    exit 1
fi

echo "✅ Production dependencies ready"
echo "🎯 Starting production server..."

# Start the production server
exec npx next start
