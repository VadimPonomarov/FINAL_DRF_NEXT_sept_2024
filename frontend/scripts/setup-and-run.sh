#!/bin/bash

echo "🔧 Setting up and running ads generator..."

# Переходим в папку frontend
cd "$(dirname "$0")/.."

# Проверяем, установлен ли Playwright
if ! npm list playwright > /dev/null 2>&1; then
    echo "📦 Installing Playwright..."
    npm install playwright --legacy-peer-deps
    npx playwright install chromium
else
    echo "✅ Playwright already installed"
fi

# Запускаем генератор
echo "🚀 Starting ads generator..."
node scripts/working-generator.js "$@"
