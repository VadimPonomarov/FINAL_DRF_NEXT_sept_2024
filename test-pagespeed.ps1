# PageSpeed Insights Testing Script
# Tests all pages and generates a report

param(
    [Parameter(Mandatory=$true)]
    [string]$FrontendUrl
)

$ErrorActionPreference = "Stop"

Write-Host "🔍 PageSpeed Insights Testing" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Testing URL: $FrontendUrl" -ForegroundColor Yellow
Write-Host ""

# Pages to test
$pages = @(
    @{Path="/"; Name="Homepage"},
    @{Path="/autoria/ads"; Name="Ads Listing"},
    @{Path="/autoria/ads/1"; Name="Ad Details"},
    @{Path="/profile"; Name="User Profile"},
    @{Path="/login"; Name="Login Page"},
    @{Path="/register"; Name="Register Page"},
    @{Path="/autoria/ads/create"; Name="Create Ad"}
)

Write-Host "📊 Testing $($pages.Count) pages..." -ForegroundColor Yellow
Write-Host ""

foreach ($page in $pages) {
    $fullUrl = $FrontendUrl + $page.Path
    $pageSpeedUrl = "https://pagespeed.web.dev/analysis?url=$fullUrl&form_factor=desktop"
    
    Write-Host "Testing: $($page.Name)" -ForegroundColor Cyan
    Write-Host "URL: $fullUrl" -ForegroundColor Gray
    Write-Host "PageSpeed: $pageSpeedUrl" -ForegroundColor Gray
    Write-Host ""
    
    # Open in browser
    Start-Process $pageSpeedUrl
    
    # Wait before next test
    Start-Sleep -Seconds 3
}

Write-Host ""
Write-Host "✅ All tests launched!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Checklist:" -ForegroundColor Yellow
Write-Host "   - Performance: > 90 (Green)" -ForegroundColor White
Write-Host "   - Accessibility: > 90 (Green)" -ForegroundColor White
Write-Host "   - Best Practices: > 90 (Green)" -ForegroundColor White
Write-Host "   - SEO: > 90 (Green)" -ForegroundColor White
Write-Host ""
Write-Host "💡 If any page is not green:" -ForegroundColor Yellow
Write-Host "   1. Check the recommendations in PageSpeed report"
Write-Host "   2. Refer to PERFORMANCE_OPTIMIZATION.md"
Write-Host "   3. Apply fixes and re-test"
Write-Host ""
