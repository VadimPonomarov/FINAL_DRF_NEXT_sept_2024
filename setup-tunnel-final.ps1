# Final Cloudflare Tunnel Setup

$cloudflaredPath = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
$domain = "autoria-test.pages.dev"

Write-Host "Using cloudflared: $(& $cloudflaredPath --version)" -ForegroundColor Green
Write-Host "Using domain: $domain" -ForegroundColor Green

# Login
Write-Host "Please login to Cloudflare (browser will open)..." -ForegroundColor Yellow
& $cloudflaredPath tunnel login

# Create tunnel
Write-Host "Creating tunnel..." -ForegroundColor Yellow
$tunnelOutput = & $cloudflaredPath tunnel create autoria-tunnel
Write-Host "Tunnel output: $tunnelOutput" -ForegroundColor Yellow

# Extract tunnel ID
if ($tunnelOutput -match 'Created tunnel autoria-tunnel with id: (.+)') {
    $tunnelId = $matches[1]
    Write-Host "Tunnel created with ID: $tunnelId" -ForegroundColor Green
} else {
    Write-Host "Failed to extract tunnel ID" -ForegroundColor Red
    exit 1
}

# Create config
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
Write-Host "Config created: $configDir\config.yml" -ForegroundColor Green

# Setup DNS
Write-Host "Setting up DNS..." -ForegroundColor Yellow
$domains = @($domain, "api.$domain", "redis.$domain")

foreach ($d in $domains) {
    try {
        & $cloudflaredPath tunnel route dns autoria-tunnel $d
        Write-Host "DNS created: $d" -ForegroundColor Green
    } catch {
        Write-Host "DNS failed for $d" -ForegroundColor Yellow
    }
}

# Create env file
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

Write-Host "Starting tunnel (press Ctrl+C to stop)..." -ForegroundColor Green
& $cloudflaredPath tunnel run autoria-tunnel
