# Скрипт для виправлення конфліктів залежностей React 18-19 (Windows PowerShell)
# Використання: .\scripts\fix-react-deps.ps1

Write-Host "🔧 Виправлення конфліктів залежностей React..." -ForegroundColor Cyan
Write-Host ""

# Перевірка наявності .npmrc
if (-Not (Test-Path ".npmrc")) {
    Write-Host "⚠️  Файл .npmrc не знайдено. Створюємо..." -ForegroundColor Yellow
    "legacy-peer-deps=true" | Out-File -FilePath ".npmrc" -Encoding utf8
    Write-Host "✅ Файл .npmrc створено" -ForegroundColor Green
} else {
    Write-Host "✅ Файл .npmrc існує" -ForegroundColor Green
}

# Перевірка наявності overrides в package.json
$packageJson = Get-Content "package.json" -Raw
if ($packageJson -notmatch '"overrides"') {
    Write-Host "⚠️  Розділ 'overrides' не знайдено в package.json" -ForegroundColor Yellow
    Write-Host "   Додайте вручно розділ 'overrides' до package.json" -ForegroundColor Yellow
} else {
    Write-Host "✅ Розділ 'overrides' знайдено в package.json" -ForegroundColor Green
}

Write-Host ""
Write-Host "🗑️  Видалення старих залежностей..." -ForegroundColor Cyan
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force "node_modules"
}
if (Test-Path "package-lock.json") {
    Remove-Item -Force "package-lock.json"
}

Write-Host ""
Write-Host "🧹 Очищення кешу npm..." -ForegroundColor Cyan
npm cache clean --force

Write-Host ""
Write-Host "📦 Встановлення залежностей з правильними налаштуваннями..." -ForegroundColor Cyan
npm install --legacy-peer-deps

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Залежності успішно встановлено!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔍 Перевірка версій React:" -ForegroundColor Cyan
    npm ls react react-dom
} else {
    Write-Host ""
    Write-Host "❌ Помилка при встановленні залежностей" -ForegroundColor Red
    Write-Host "   Перевірте вивід вище для деталей" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Виправлення завершено!" -ForegroundColor Green
Write-Host ""
Write-Host "Тепер ви можете запустити проект:" -ForegroundColor Cyan
Write-Host "  npm run dev       - режим розробки" -ForegroundColor White
Write-Host "  npm run build     - production збірка" -ForegroundColor White

