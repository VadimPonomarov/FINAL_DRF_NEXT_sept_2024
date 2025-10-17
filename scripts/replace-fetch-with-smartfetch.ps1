# Script to replace fetch() with smartFetch() in AutoRia components
# This ensures proper 401 error handling with automatic token refresh

$componentsPath = "frontend/src/components/AutoRia"
$pagesPath = "frontend/src/app/(main)/(backend)/autoria"

Write-Host "🔍 Replacing fetch() with smartFetch() in AutoRia components..." -ForegroundColor Cyan

# Function to process a file
function Process-File {
    param (
        [string]$filePath
    )
    
    $content = Get-Content $filePath -Raw
    $originalContent = $content
    $modified = $false
    
    # Check if file already imports smartFetch
    $hasSmartFetchImport = $content -match "import.*smartFetch.*from.*@/utils/smartFetch"
    
    # Check if file uses fetch
    $usesFetch = $content -match "await fetch\(|\.fetch\("
    
    if ($usesFetch) {
        Write-Host "  📝 Processing: $filePath" -ForegroundColor Yellow
        
        # Add import if not present
        if (-not $hasSmartFetchImport) {
            # Find the last import statement
            if ($content -match "(?s)(import.*?from.*?['\"];?\s*\n)(?!import)") {
                $lastImport = $matches[0]
                $content = $content -replace [regex]::Escape($lastImport), "$lastImport`nimport { smartFetch } from '@/utils/smartFetch';`n"
                $modified = $true
                Write-Host "    ✅ Added smartFetch import" -ForegroundColor Green
            }
        }
        
        # Replace fetch with smartFetch (but not in comments or strings that are not URLs)
        # Pattern: await fetch( or .fetch(
        $fetchPattern = '(await\s+)fetch\('
        if ($content -match $fetchPattern) {
            $content = $content -replace $fetchPattern, '${1}smartFetch('
            $modified = $true
            Write-Host "    ✅ Replaced 'await fetch(' with 'await smartFetch('" -ForegroundColor Green
        }
        
        # Save if modified
        if ($modified -and $content -ne $originalContent) {
            Set-Content -Path $filePath -Value $content -NoNewline
            Write-Host "    💾 Saved changes to: $filePath" -ForegroundColor Green
            return $true
        }
    }
    
    return $false
}

# Process all TypeScript/TSX files in AutoRia components
$filesProcessed = 0
$filesModified = 0

Get-ChildItem -Path $componentsPath -Filter "*.tsx" -Recurse | ForEach-Object {
    $filesProcessed++
    if (Process-File -filePath $_.FullName) {
        $filesModified++
    }
}

Get-ChildItem -Path $componentsPath -Filter "*.ts" -Recurse | Where-Object { $_.Name -notmatch "\.test\.ts$" } | ForEach-Object {
    $filesProcessed++
    if (Process-File -filePath $_.FullName) {
        $filesModified++
    }
}

# Process AutoRia pages
if (Test-Path $pagesPath) {
    Get-ChildItem -Path $pagesPath -Filter "*.tsx" -Recurse | ForEach-Object {
        $filesProcessed++
        if (Process-File -filePath $_.FullName) {
            $filesModified++
        }
    }
}

Write-Host ""
Write-Host "✅ Done!" -ForegroundColor Green
Write-Host "   Files processed: $filesProcessed" -ForegroundColor Cyan
Write-Host "   Files modified: $filesModified" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  Please review the changes and test thoroughly!" -ForegroundColor Yellow

