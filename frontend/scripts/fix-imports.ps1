# Fix imports script - массовая замена импортов

$replacements = @{
    '@/components/ui/' = '@/shared/components/ui/'
    '@/modules/shared/hooks' = '@/shared/hooks'
    '@/modules/shared/types' = '@/shared/types'
    '@/modules/shared/styles' = '@/shared/styles'
    '@/modules/shared' = '@/shared'
    '@/common/constants' = '@/shared/constants'
    '@/common/interfaces' = '@/shared/types'
    '@/common/providers' = '@/shared/providers'
}

$files = Get-ChildItem -Path "src" -Include *.ts,*.tsx -Recurse -File | 
    Where-Object { $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch ".next" }

$updatedCount = 0
$totalFiles = $files.Count

Write-Host "Processing $totalFiles files..." -ForegroundColor Cyan

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }
    
    $originalContent = $content
    
    foreach ($old in $replacements.Keys) {
        $new = $replacements[$old]
        if ($content -match [regex]::Escape($old)) {
            $content = $content -replace [regex]::Escape($old), $new
        }
    }
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $updatedCount++
        Write-Host "✓ $($file.Name)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Completed!" -ForegroundColor Green
Write-Host "Files updated: $updatedCount of $totalFiles" -ForegroundColor Cyan
