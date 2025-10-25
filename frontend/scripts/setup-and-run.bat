@echo off
echo 🔧 Setting up and running ads generator...

cd /d "%~dp0\.."

REM Проверяем, установлен ли Playwright
npm list playwright >nul 2>&1
if errorlevel 1 (
    echo 📦 Installing Playwright...
    npm install playwright
    npx playwright install chromium
) else (
    echo ✅ Playwright already installed
)

REM Запускаем генератор
echo 🚀 Starting ads generator...
node scripts/working-generator.js %*
