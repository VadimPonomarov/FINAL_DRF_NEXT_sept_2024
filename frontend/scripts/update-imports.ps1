# Script to update imports from old structure to new shared/ structure

Write-Host "Starting import updates..." -ForegroundColor Green

# Define replacements
$replacements = @(
    # UI components
    @{Old = "@/components/ui/"; New = "@/shared/components/ui/"}
    
    # Common to shared
    @{Old = "@/common/constants"; New = "@/shared/constants"}
    @{Old = "@/common/interfaces"; New = "@/shared/types"}
    @{Old = "@/common/types"; New = "@/shared/types"}
    @{Old = "@/common/providers"; New = "@/shared/providers"}
    @{Old = "@/common/utils"; New = "@/shared/utils"}
    
    # Modules shared to shared
    @{Old = "@/modules/shared/types"; New = "@/shared/types"}
    @{Old = "@/modules/shared/hooks"; New = "@/shared/hooks"}
    @{Old = "@/modules/shared/components"; New = "@/shared/components"}
    @{Old = "@/modules/shared/styles"; New = "@/shared/styles"}
    @{Old = "@/modules/shared"; New = "@/shared"}
)

# Get all TypeScript and TSX files
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
$srcPath = Join-Path $projectRoot "src"

$files = Get-ChildItem -Path $srcPath -Include *.ts,*.tsx -Recurse -File | 
         Where-Object { $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch ".next" }

$totalFiles = $files.Count
$processedFiles = 0
$updatedFiles = 0

Write-Host "Found $totalFiles files to process" -ForegroundColor Cyan

foreach ($file in $files) {
    $processedFiles++
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    $fileUpdated = $false
    
    foreach ($replacement in $replacements) {
        if ($content -match [regex]::Escape($replacement.Old)) {
            $content = $content -replace [regex]::Escape($replacement.Old), $replacement.New
            $fileUpdated = $true
        }
    }
    
    if ($fileUpdated) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $updatedFiles++
        Write-Host "[$processedFiles/$totalFiles] Updated: $($file.FullName)" -ForegroundColor Yellow
    } else {
        Write-Host "[$processedFiles/$totalFiles] Skipped: $($file.FullName)" -ForegroundColor Gray
    }
}

Write-Host "`nImport update complete!" -ForegroundColor Green
Write-Host "Total files processed: $processedFiles" -ForegroundColor Cyan
Write-Host "Files updated: $updatedFiles" -ForegroundColor Green
Write-Host "Files unchanged: $($processedFiles - $updatedFiles)" -ForegroundColor Gray
