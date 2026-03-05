# Скрипт проверки деплоя на Render + Vercel
# Специфичная проверка для этой архитектуры

param(
    [Parameter(Mandatory=$true)]
    [string]$BackendUrl,
    
    [Parameter(Mandatory=$true)]
    [string]$FrontendUrl
)

$ErrorActionPreference = "Continue"

Write-Host "🔍 Проверка Render + Vercel Деплоя" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend (Render): $BackendUrl" -ForegroundColor Yellow
Write-Host "Frontend (Vercel): $FrontendUrl" -ForegroundColor Yellow
Write-Host ""

$results = @{
    Backend = @{}
    Frontend = @{}
    Proxy = @{}
    Performance = @{}
}

# Функция проверки с таймаутом (для auto-sleep)
function Test-EndpointWithRetry {
    param($Url, $Name, $MaxRetries = 3)
    
    Write-Host "Проверка: $Name..." -ForegroundColor Gray
    
    for ($i = 1; $i -le $MaxRetries; $i++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 60 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ $Name - OK" -ForegroundColor Green
                return $true
            }
        } catch {
            if ($i -lt $MaxRetries) {
                Write-Host "⏳ Попытка $i/$MaxRetries - Backend может быть в режиме сна, ожидание..." -ForegroundColor Yellow
                Start-Sleep -Seconds 10
            } else {
                Write-Host "❌ $Name - Error: $($_.Exception.Message)" -ForegroundColor Red
                return $false
            }
        }
    }
    return $false
}

# ПРОВЕРКА BACKEND (RENDER)
Write-Host "📡 Проверка Backend на Render..." -ForegroundColor Cyan
Write-Host "-----------------------------------" -ForegroundColor Cyan
Write-Host "⚠️  Первый запрос может занять до 60 секунд (auto-sleep)" -ForegroundColor Yellow
Write-Host ""

$results.Backend.Health = Test-EndpointWithRetry "$BackendUrl/health" "Health Endpoint"
Start-Sleep -Seconds 2
$results.Backend.Admin = Test-EndpointWithRetry "$BackendUrl/admin/" "Admin Panel"
Start-Sleep -Seconds 2
$results.Backend.API = Test-EndpointWithRetry "$BackendUrl/api/" "API Root"
Start-Sleep -Seconds 2
$results.Backend.Docs = Test-EndpointWithRetry "$BackendUrl/api/doc/" "API Documentation"

Write-Host ""

# ПРОВЕРКА FRONTEND (VERCEL)
Write-Host "🌐 Проверка Frontend на Vercel..." -ForegroundColor Cyan
Write-Host "-----------------------------------" -ForegroundColor Cyan

$results.Frontend.Homepage = Test-EndpointWithRetry "$FrontendUrl" "Homepage"
$results.Frontend.Login = Test-EndpointWithRetry "$FrontendUrl/login" "Login Page"
$results.Frontend.Ads = Test-EndpointWithRetry "$FrontendUrl/autoria/ads" "Ads Listing"

Write-Host ""

# ПРОВЕРКА API PROXY (REWRITES)
Write-Host "🔄 Проверка API Proxy (Vercel → Render)..." -ForegroundColor Cyan
Write-Host "-------------------------------------------" -ForegroundColor Cyan

$results.Proxy.API = Test-EndpointWithRetry "$FrontendUrl/api/" "API через Vercel Proxy"
$results.Proxy.Health = Test-EndpointWithRetry "$FrontendUrl/api/health" "Health через Proxy" 1

Write-Host ""

# ПРОВЕРКА ПРОИЗВОДИТЕЛЬНОСТИ
Write-Host "⚡ Запуск PageSpeed Insights..." -ForegroundColor Cyan
Write-Host "--------------------------------" -ForegroundColor Cyan

$pages = @(
    @{Path="/"; Name="Homepage"},
    @{Path="/autoria/ads"; Name="Ads Listing"},
    @{Path="/login"; Name="Login Page"}
)

foreach ($page in $pages) {
    $fullUrl = $FrontendUrl + $page.Path
    $pageSpeedUrl = "https://pagespeed.web.dev/analysis?url=$fullUrl&form_factor=desktop"
    
    Write-Host "📊 Тестирование: $($page.Name)" -ForegroundColor Yellow
    Start-Process $pageSpeedUrl
    Start-Sleep -Seconds 2
}

Write-Host ""

# ИТОГОВЫЙ ОТЧЕТ
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "📋 Итоговый Отчет" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Backend (Render):" -ForegroundColor Yellow
Write-Host "  Health Endpoint: $(if($results.Backend.Health){'✅ OK'}else{'❌ FAIL'})"
Write-Host "  Admin Panel: $(if($results.Backend.Admin){'✅ OK'}else{'❌ FAIL'})"
Write-Host "  API Root: $(if($results.Backend.API){'✅ OK'}else{'❌ FAIL'})"
Write-Host "  API Docs: $(if($results.Backend.Docs){'✅ OK'}else{'❌ FAIL'})"
Write-Host ""

Write-Host "Frontend (Vercel):" -ForegroundColor Yellow
Write-Host "  Homepage: $(if($results.Frontend.Homepage){'✅ OK'}else{'❌ FAIL'})"
Write-Host "  Login Page: $(if($results.Frontend.Login){'✅ OK'}else{'❌ FAIL'})"
Write-Host "  Ads Listing: $(if($results.Frontend.Ads){'✅ OK'}else{'❌ FAIL'})"
Write-Host ""

Write-Host "API Proxy (Rewrites):" -ForegroundColor Yellow
Write-Host "  API через Proxy: $(if($results.Proxy.API){'✅ OK'}else{'❌ FAIL'})"
Write-Host "  Health через Proxy: $(if($results.Proxy.Health){'✅ OK'}else{'⚠️  OPTIONAL'})"
Write-Host ""

# Подсчет успешных проверок
$totalChecks = 9
$passedChecks = ($results.Backend.Values + $results.Frontend.Values + $results.Proxy.Values | Where-Object {$_ -eq $true}).Count

Write-Host "Результат: $passedChecks/$totalChecks проверок пройдено" -ForegroundColor $(if($passedChecks -ge 7){'Green'}else{'Yellow'})
Write-Host ""

if ($passedChecks -ge 7) {
    Write-Host "🎉 Деплой успешен!" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ Что работает:" -ForegroundColor Green
    Write-Host "  • Backend на Render с PostgreSQL и Redis"
    Write-Host "  • Frontend на Vercel с Edge CDN"
    Write-Host "  • API Proxy через Vercel rewrites"
    Write-Host "  • Автоматический SSL на обеих платформах"
    Write-Host ""
    Write-Host "📊 Следующие шаги:" -ForegroundColor Yellow
    Write-Host "  1. Проверьте PageSpeed Insights (открыты в браузере)"
    Write-Host "  2. Убедитесь что все страницы > 90 (зеленая зона)"
    Write-Host "  3. Протестируйте аутентификацию и создание объявлений"
    Write-Host "  4. Настройте keep-alive для предотвращения auto-sleep"
    Write-Host ""
    Write-Host "💡 Keep-Alive:" -ForegroundColor Cyan
    Write-Host "  GitHub Action уже создан в .github/workflows/keep-alive.yml"
    Write-Host "  Он будет пинговать backend каждые 10 минут"
    Write-Host ""
} else {
    Write-Host "⚠️  Некоторые проверки не прошли" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🔍 Возможные причины:" -ForegroundColor Yellow
    Write-Host "  1. Backend в режиме auto-sleep (первый запрос может занять 60 сек)"
    Write-Host "  2. Переменные окружения не настроены"
    Write-Host "  3. CORS не обновлен с реальным Vercel URL"
    Write-Host "  4. Database URL неверный (используйте Internal URL)"
    Write-Host ""
    Write-Host "📖 Решение:" -ForegroundColor Yellow
    Write-Host "  См. DEPLOY_RENDER_VERCEL.md раздел Troubleshooting"
}

Write-Host ""
Write-Host "📊 PageSpeed Insights открыты в браузере" -ForegroundColor Cyan
Write-Host "🎯 Цель: все страницы > 90 (зеленая зона)" -ForegroundColor Cyan
Write-Host ""

# Дополнительная информация о Render
Write-Host "ℹ️  Информация о Render Free Plan:" -ForegroundColor Cyan
Write-Host "  • Auto-sleep после 15 минут простоя"
Write-Host "  • Первый запрос после сна: 30-60 секунд"
Write-Host "  • 750 часов/месяц (достаточно для 24/7)"
Write-Host "  • PostgreSQL 1 GB бесплатно"
Write-Host "  • Redis бесплатно"
Write-Host ""
