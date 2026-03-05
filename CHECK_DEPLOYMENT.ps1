# Скрипт проверки работоспособности деплоя
# Проверяет все компоненты системы

param(
    [Parameter(Mandatory=$true)]
    [string]$BackendUrl,
    
    [Parameter(Mandatory=$true)]
    [string]$FrontendUrl
)

$ErrorActionPreference = "Continue"

Write-Host "🔍 Проверка работоспособности деплоя" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend URL: $BackendUrl" -ForegroundColor Yellow
Write-Host "Frontend URL: $FrontendUrl" -ForegroundColor Yellow
Write-Host ""

$results = @{
    Backend = @{}
    Frontend = @{}
    Performance = @{}
}

# Функция для проверки URL
function Test-Endpoint {
    param($Url, $Name)
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 10 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $Name - OK" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ $Name - Status: $($response.StatusCode)" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ $Name - Error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# ПРОВЕРКА BACKEND
Write-Host "📡 Проверка Backend..." -ForegroundColor Cyan
Write-Host "----------------------" -ForegroundColor Cyan

$results.Backend.Health = Test-Endpoint "$BackendUrl/health" "Health Endpoint"
$results.Backend.Admin = Test-Endpoint "$BackendUrl/admin/" "Admin Panel"
$results.Backend.API = Test-Endpoint "$BackendUrl/api/" "API Root"
$results.Backend.Docs = Test-Endpoint "$BackendUrl/api/doc/" "API Documentation"

Write-Host ""

# ПРОВЕРКА FRONTEND
Write-Host "🌐 Проверка Frontend..." -ForegroundColor Cyan
Write-Host "----------------------" -ForegroundColor Cyan

$results.Frontend.Homepage = Test-Endpoint "$FrontendUrl" "Homepage"
$results.Frontend.Login = Test-Endpoint "$FrontendUrl/login" "Login Page"
$results.Frontend.Register = Test-Endpoint "$FrontendUrl/register" "Register Page"
$results.Frontend.Ads = Test-Endpoint "$FrontendUrl/autoria/ads" "Ads Listing"

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
    Write-Host "   URL: $pageSpeedUrl" -ForegroundColor Gray
    
    Start-Process $pageSpeedUrl
    Start-Sleep -Seconds 2
}

Write-Host ""

# ИТОГОВЫЙ ОТЧЕТ
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "📋 Итоговый Отчет" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Backend:" -ForegroundColor Yellow
Write-Host "  Health Endpoint: $(if($results.Backend.Health){'✅ OK'}else{'❌ FAIL'})"
Write-Host "  Admin Panel: $(if($results.Backend.Admin){'✅ OK'}else{'❌ FAIL'})"
Write-Host "  API Root: $(if($results.Backend.API){'✅ OK'}else{'❌ FAIL'})"
Write-Host "  API Docs: $(if($results.Backend.Docs){'✅ OK'}else{'❌ FAIL'})"
Write-Host ""

Write-Host "Frontend:" -ForegroundColor Yellow
Write-Host "  Homepage: $(if($results.Frontend.Homepage){'✅ OK'}else{'❌ FAIL'})"
Write-Host "  Login Page: $(if($results.Frontend.Login){'✅ OK'}else{'❌ FAIL'})"
Write-Host "  Register Page: $(if($results.Frontend.Register){'✅ OK'}else{'❌ FAIL'})"
Write-Host "  Ads Listing: $(if($results.Frontend.Ads){'✅ OK'}else{'❌ FAIL'})"
Write-Host ""

# Подсчет успешных проверок
$totalChecks = 8
$passedChecks = ($results.Backend.Values + $results.Frontend.Values | Where-Object {$_ -eq $true}).Count

Write-Host "Результат: $passedChecks/$totalChecks проверок пройдено" -ForegroundColor $(if($passedChecks -eq $totalChecks){'Green'}else{'Yellow'})
Write-Host ""

if ($passedChecks -eq $totalChecks) {
    Write-Host "🎉 Все проверки пройдены успешно!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Следующие шаги:" -ForegroundColor Yellow
    Write-Host "  1. Проверьте PageSpeed Insights результаты в браузере"
    Write-Host "  2. Убедитесь что все страницы в зеленой зоне (90+)"
    Write-Host "  3. Протестируйте функциональность вручную"
    Write-Host "  4. Проверьте аутентификацию и создание объявлений"
} else {
    Write-Host "⚠️  Некоторые проверки не прошли" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Рекомендации:" -ForegroundColor Yellow
    Write-Host "  1. Проверьте логи в Railway и Vercel"
    Write-Host "  2. Убедитесь что все переменные окружения настроены"
    Write-Host "  3. Проверьте CORS настройки в backend"
    Write-Host "  4. См. DEPLOY_STEP_BY_STEP.md раздел Troubleshooting"
}

Write-Host ""
Write-Host "📊 Детальные отчеты PageSpeed открыты в браузере" -ForegroundColor Cyan
Write-Host ""
