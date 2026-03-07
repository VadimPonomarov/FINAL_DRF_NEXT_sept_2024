# Cloudflare Tunnel Automatic Setup Script
# Free unified domain for autoria project

Write-Host "Setting up Cloudflare Tunnel for Autoria Project..." -ForegroundColor Green

# Check if cloudflared is installed
try {
    cloudflared --version | Out-Null
    Write-Host "✅ cloudflared already installed" -ForegroundColor Green
} catch {
    Write-Host "📦 Installing cloudflared..." -ForegroundColor Yellow
    winget install Cloudflare.cloudflared --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install cloudflared. Please install manually from https://github.com/cloudflare/cloudflared/releases" -ForegroundColor Red
        exit 1
    }
}

# Get domain from user
$domain = Read-Host "🌐 Enter your domain (e.g., your-domain.com)"
if (-not $domain) {
    Write-Host "❌ Domain is required" -ForegroundColor Red
    exit 1
}

Write-Host "🔐 Please login to Cloudflare..." -ForegroundColor Yellow
cloudflared tunnel login

# Create tunnel
Write-Host "🕳️ Creating tunnel..." -ForegroundColor Yellow
$tunnelOutput = cloudflared tunnel create autoria-tunnel
$tunnelId = ($tunnelOutput -match 'Created tunnel autoria-tunnel with id: (.+)').Matches[0].Groups[1].Value

if (-not $tunnelId) {
    Write-Host "❌ Failed to create tunnel" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Tunnel created with ID: $tunnelId" -ForegroundColor Green

# Create config file
$configDir = "$env:USERPROFILE\.cloudflared"
New-Item -ItemType Directory -Force -Path $configDir | Out-Null

$configContent = @"
tunnel: $tunnelId
credentials-file: $configDir\autoria-tunnel.json

ingress:
  # Frontend → Vercel
  - hostname: $domain
    service: https://autoria-clone.vercel.app
  - hostname: www.$domain
    service: https://autoria-clone.vercel.app

  # Backend API → Railway
  - hostname: api.$domain
    service: https://autoria-web-production.up.railway.app
    originRequest:
      noTLSVerify: false

  # Redis API → Vercel (Next.js routes)
  - hostname: redis.$domain
    service: https://autoria-clone.vercel.app
    originRequest:
      noTLSVerify: false

  # Admin → Railway
  - hostname: admin.$domain
    service: https://autoria-web-production.up.railway.app

  # Health check
  - hostname: health.$domain
    service: https://autoria-web-production.up.railway.app/health/

  # Catch all
  - service: https://autoria-clone.vercel.app
"@

$configContent | Out-File -FilePath "$configDir\config.yml" -Encoding UTF8
Write-Host "✅ Config file created: $configDir\config.yml" -ForegroundColor Green

# Setup DNS records
Write-Host "🌍 Setting up DNS records..." -ForegroundColor Yellow
$domains = @($domain, "www.$domain", "api.$domain", "redis.$domain", "admin.$domain", "health.$domain")

foreach ($d in $domains) {
    try {
        cloudflared tunnel route dns autoria-tunnel $d
        Write-Host "✅ DNS record created: $d" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Failed to create DNS for $d (might already exist)" -ForegroundColor Yellow
    }
}

# Create environment file for frontend
$envContent = @"
# Cloudflare Tunnel Environment Variables
# Unified domain configuration

# Frontend URL (through tunnel)
NEXT_PUBLIC_FRONTEND_URL=https://$domain

# Backend URL (through tunnel)
NEXT_PUBLIC_BACKEND_URL=https://$domain
BACKEND_URL=https://$domain

# Redis URL (now works through tunnel + Vercel API)
REDIS_URL=redis://localhost:6379
NEXT_PUBLIC_REDIS_URL=redis://localhost:6379

# RabbitMQ URL (through tunnel)
NEXT_PUBLIC_RABBITMQ_URL=https://$domain/rabbitmq
RABBITMQ_URL=https://$domain/rabbitmq

# Redis Insight URL (through tunnel)
NEXT_PUBLIC_REDIS_INSIGHT_URL=https://$domain/redis-insight

# NextAuth URL (through tunnel)
NEXTAUTH_URL=https://$domain
NEXTAUTH_SECRET=your-nextauth-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# CORS (unified domain)
CORS_ALLOWED_ORIGINS=https://$domain

# Environment
NODE_ENV=production
NEXT_PUBLIC_IS_DOCKER=false
"@

$envContent | Out-File -FilePath "frontend\.env.cloudflare" -Encoding UTF8
Write-Host "✅ Environment file created: frontend\.env.cloudflare" -ForegroundColor Green

# Create Windows service for auto-start
Write-Host "🔧 Setting up Windows Service for auto-start..." -ForegroundColor Yellow

try {
    # Check if NSSM is installed
    nssm --version | Out-Null
    Write-Host "✅ NSSM already installed" -ForegroundColor Green
} catch {
    Write-Host "📦 Installing NSSM..." -ForegroundColor Yellow
    winget install NSSM.NSSM --accept-package-agreements --accept-source-agreements
}

# Stop existing service if exists
try {
    Stop-Service -Name "CloudflareTunnel" -ErrorAction SilentlyContinue
    nssm remove CloudflareTunnel confirm
} catch {
    # Service doesn't exist, continue
}

# Create service
$cloudflaredPath = (Get-Command cloudflared).Source
nssm install CloudflareTunnel $cloudflaredPath "tunnel run autoria-tunnel"
nssm set CloudflareTunnel DisplayName "Cloudflare Tunnel - Autoria"
nssm set CloudflareTunnel Description "Unified domain tunnel for Autoria project"
nssm set CloudflareTunnel Start SERVICE_AUTO_START

Write-Host "✅ Windows Service created: CloudflareTunnel" -ForegroundColor Green

# Start the service
Start-Service -Name "CloudflareTunnel"
Write-Host "✅ Cloudflare Tunnel started!" -ForegroundColor Green

Write-Host "`n🎉 Setup complete!" -ForegroundColor Green
Write-Host "`n📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Wait 2-5 minutes for DNS propagation" -ForegroundColor White
Write-Host "2. Test your sites:" -ForegroundColor White
Write-Host "   - Frontend: https://$domain" -ForegroundColor Gray
Write-Host "   - API: https://api.$domain/api/users/public/list/" -ForegroundColor Gray
Write-Host "   - Redis: https://redis.$domain/api/redis?key=test" -ForegroundColor Gray
Write-Host "   - Admin: https://admin.$domain/admin/" -ForegroundColor Gray
Write-Host "3. Update Vercel environment variables with values from frontend\.env.cloudflare" -ForegroundColor White
Write-Host "4. Deploy Vercel: vercel --prod" -ForegroundColor White
Write-Host "`n🔍 To check logs: Get-EventLog -LogName Application -Source 'CloudflareTunnel' -Newest 10" -ForegroundColor Gray
Write-Host "🛑 To stop: Stop-Service CloudflareTunnel" -ForegroundColor Gray
Write-Host "▶️ To start: Start-Service CloudflareTunnel" -ForegroundColor Gray
