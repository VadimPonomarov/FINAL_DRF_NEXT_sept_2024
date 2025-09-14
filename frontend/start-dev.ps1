# PowerShell script to start Next.js development server with environment variables
# Load environment variables from env-config files

Write-Host "Loading environment variables..." -ForegroundColor Green

# Function to load .env file
function Load-EnvFile {
    param([string]$FilePath)
    
    if (Test-Path $FilePath) {
        Write-Host "Loading $FilePath" -ForegroundColor Yellow
        Get-Content $FilePath | ForEach-Object {
            if ($_ -match '^([^#][^=]+)=(.*)$') {
                $name = $matches[1].Trim()
                $value = $matches[2].Trim()
                # Remove quotes if present
                $value = $value -replace '^"(.*)"$', '$1'
                $value = $value -replace "^'(.*)'$", '$1'
                [Environment]::SetEnvironmentVariable($name, $value, "Process")
                Write-Host "  $name = $value" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "File not found: $FilePath" -ForegroundColor Red
    }
}

# Load environment files in order
Load-EnvFile "../env-config/.env.base"
Load-EnvFile "../env-config/.env.secrets"
Load-EnvFile "../env-config/.env.local"

# Override for local development
$env:NODE_ENV = "development"
$env:BACKEND_URL = "http://localhost:8000"
$env:NEXT_PUBLIC_BACKEND_URL = "http://localhost:8000"
$env:REDIS_HOST = "localhost"

Write-Host "`nStarting Next.js development server..." -ForegroundColor Green
Write-Host "Frontend will be available at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend should be running at: http://localhost:8000" -ForegroundColor Cyan
Write-Host "`nPress Ctrl+C to stop the server`n" -ForegroundColor Yellow

# Start the development server
npm run dev
