$files = @(
    "src\app\api\(backend)\ads\[id]\images\[imageId]\route.ts",
    "src\app\api\(backend)\ads\[id]\images\bulk-delete\route.ts",
    "src\app\api\(backend)\ads\[id]\images\route.ts",
    "src\app\api\(backend)\ads\[id]\images\save-generated\route.ts",
    "src\app\api\(backend)\ads\[id]\route.ts",
    "src\app\api\(backend)\autoria\cars\[id]\update\route.ts",
    "src\app\api\autoria\admin\ads\[id]\status\route.ts",
    "src\app\api\autoria\cars\[id]\status\route.ts"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Encoding UTF8 | ForEach-Object {
            $_ -replace "@/utils/auth/serverAuth", "@/shared/utils/auth/serverAuth"
        }
        $content | Set-Content $file -Encoding UTF8
        Write-Host "Fixed: $file"
    }
}
