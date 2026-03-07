# Simple Cloudflare Tunnel Setup

Write-Host "Setting up Cloudflare Tunnel for Autoria..." -ForegroundColor Green

# Check if cloudflared is installed
try {
    cloudflared --version | Out-Null
    Write-Host "cloudflared already installed" -ForegroundColor Green
} catch {
    Write-Host "Installing cloudflared..." -ForegroundColor Yellow
    winget install Cloudflare.cloudflared --accept-package-agreements --accept-source-agreements
}

# Get domain
$domain = Read-Host "Enter your domain (e.g., your-domain.com)"
if (-not $domain) {
    Write-Host "Domain is required" -ForegroundColor Red
    exit 1
}

Write-Host "Please login to Cloudflare..." -ForegroundColor Yellow
cloudflared tunnel login

# Create tunnel
Write-Host "Creating tunnel..." -ForegroundColor Yellow
$tunnelOutput = cloudflared tunnel create autoria-tunnel
$tunnelId = ($tunnelOutput -match 'Created tunnel autoria-tunnel with id: (.+)').Matches[0].Groups[1].Value

if (-not $tunnelId) {
    Write-Host "Failed to create tunnel" -ForegroundColor Red
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
  - hostname: www.$domain
    service: https://autoria-clone.vercel.app
  - hostname: api.$domain
    service: https://autoria-web-production.up.railway.app
  - hostname: redis.$domain
    service: https://autoria-clone.vercel.app
  - hostname: admin.$domain
    service: https://autoria-web-production.up.railway.app
  - service: https://autoria-clone.vercel.app
"@

$configContent | Out-File -FilePath "$configDir\config.yml" -Encoding UTF8
Write-Host "Config file created: $configDir\config.yml" -ForegroundColor Green

# Setup DNS
Write-Host "Setting up DNS records..." -ForegroundColor Yellow
$domains = @($domain, "www.$domain", "api.$domain", "redis.$domain", "admin.$domain")

foreach ($d in $domains) {
    try {
        cloudflared tunnel route dns autoria-tunnel $d
        Write-Host "DNS record created: $d" -ForegroundColor Green
    } catch {
        Write-Host "Failed to create DNS for $d (might already exist)" -ForegroundColor Yellow
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
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Wait 2-5 minutes for DNS propagation"
Write-Host "2. Test: https://$domain"
Write-Host "3. Update Vercel environment variables"
Write-Host "4. Run: cloudflared tunnel run autoria-tunnel"
