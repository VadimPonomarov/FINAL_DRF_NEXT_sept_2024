# Fixed Cloudflare Tunnel Setup with full path

$cloudflaredPath = "C:\Program Files\cloudflared\cloudflared.exe"
$domain = "autoria-test.pages.dev"

Write-Host "Using cloudflared at: $cloudflaredPath" -ForegroundColor Green
Write-Host "Using domain: $domain" -ForegroundColor Green

# Check if cloudflared exists
if (-not (Test-Path $cloudflaredPath)) {
    Write-Host "cloudflared not found at $cloudflaredPath" -ForegroundColor Red
    exit 1
}

Write-Host "Please login to Cloudflare..." -ForegroundColor Yellow
& $cloudflaredPath tunnel login

# Create tunnel
Write-Host "Creating tunnel..." -ForegroundColor Yellow
$tunnelOutput = & $cloudflaredPath tunnel create autoria-tunnel
$tunnelId = ($tunnelOutput -match 'Created tunnel autoria-tunnel with id: (.+)').Matches[0].Groups[1].Value

if (-not $tunnelId) {
    Write-Host "Failed to create tunnel" -ForegroundColor Red
    Write-Host "Output: $tunnelOutput" -ForegroundColor Yellow
    exit 1
}

Write-Host "Tunnel created with ID: $tunnelId" -ForegroundColor Green

# Create config file
$configDir = "$env:USERPROFILE\.cloudflared"
New-Item -ItemType Directory -Force -Path $configDir | Out-Null

$configContent = @"
tunnel: $tunnelId
credentials-file: $configDir\autoria-tunnel.json

ingress:
  - hostname: $domain
    service: https://autoria-clone.vercel.app
  - hostname: api.$domain
    service: https://autoria-web-production.up.railway.app
  - hostname: redis.$domain
    service: https://autoria-clone.vercel.app
  - service: https://autoria-clone.vercel.app
"@

$configContent | Out-File -FilePath "$configDir\config.yml" -Encoding UTF8
Write-Host "Config file created: $configDir\config.yml" -ForegroundColor Green

# Setup DNS
Write-Host "Setting up DNS records..." -ForegroundColor Yellow
$domains = @($domain, "api.$domain", "redis.$domain")

foreach ($d in $domains) {
    try {
        & $cloudflaredPath tunnel route dns autoria-tunnel $d
        Write-Host "DNS record created: $d" -ForegroundColor Green
    } catch {
        Write-Host "Failed to create DNS for $d" -ForegroundColor Yellow
    }
}

# Create environment file
$envContent = @"
NEXT_PUBLIC_FRONTEND_URL=https://$domain
NEXT_PUBLIC_BACKEND_URL=https://$domain
BACKEND_URL=https://$domain
REDIS_URL=redis://localhost:6379
NEXT_PUBLIC_REDIS_URL=redis://localhost:6379
NEXTAUTH_URL=https://$domain
NODE_ENV=production
NEXT_PUBLIC_IS_DOCKER=false
"@

$envContent | Out-File -FilePath "frontend\.env.cloudflare" -Encoding UTF8
Write-Host "Environment file created: frontend\.env.cloudflare" -ForegroundColor Green

Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "Starting tunnel..." -ForegroundColor Yellow
& $cloudflaredPath tunnel run autoria-tunnel
