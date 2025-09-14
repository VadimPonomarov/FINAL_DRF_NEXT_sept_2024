#!/bin/bash

# AutoRia Project Initialization Script
# This script initializes the project with all necessary data

echo "🚀 AutoRia Project Initialization"
echo "=================================="

# Check if seeds should run (default: true)
RUN_SEEDS=${RUN_SEEDS:-true}
if [ "$RUN_SEEDS" != "true" ] && [ "$RUN_SEEDS" != "1" ] && [ "$RUN_SEEDS" != "t" ] && [ "$RUN_SEEDS" != "yes" ]; then
    echo "⏭️ Seeds disabled by RUN_SEEDS environment variable"
    exit 0
fi

# Check if we're in Docker or local environment
if [ -f /.dockerenv ]; then
    echo "📦 Running in Docker environment"
    PYTHON_CMD="python"
else
    echo "💻 Running in local environment"
    # Try to find Python command
    if command -v python3 &> /dev/null; then
        PYTHON_CMD="python3"
    elif command -v python &> /dev/null; then
        PYTHON_CMD="python"
    else
        echo "❌ Python not found!"
        exit 1
    fi
fi

echo "🐍 Using Python: $PYTHON_CMD"

# Change to backend directory
cd "$(dirname "$0")/.."

# Run initialization
echo "📊 Initializing project data..."
$PYTHON_CMD manage.py init_project_data

# Check if initialization was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ AutoRia project initialization completed successfully!"
    echo "🌐 You can now start the development server with:"
    echo "   python manage.py runserver"
else
    echo "❌ Project initialization failed!"
    exit 1
fi
