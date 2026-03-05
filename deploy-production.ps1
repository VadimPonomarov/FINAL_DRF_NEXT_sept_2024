# Production Deployment Script for Windows PowerShell
# Deploys Backend to Railway and Frontend to Vercel

$ErrorActionPreference = "Stop"

Write-Host "🚀 AutoRia Clone - Production Deployment" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if required tools are installed
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check npm
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ npm not found. Please install npm first." -ForegroundColor Red
    exit 1
}

# Install Railway CLI if not present
if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  Railway CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g @railway/cli
}

# Install Vercel CLI if not present
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  Vercel CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g vercel
}

Write-Host "✅ Prerequisites checked" -ForegroundColor Green
Write-Host ""

# Deploy Backend to Railway
Write-Host "🔧 Backend Deployment to Railway" -ForegroundColor Cyan
Write-Host "-----------------------------------" -ForegroundColor Cyan

$deployBackend = Read-Host "Deploy backend to Railway? (y/n)"
if ($deployBackend -eq "y" -or $deployBackend -eq "Y") {
    Set-Location backend
    
    Write-Host "Logging into Railway..." -ForegroundColor Yellow
    railway login
    
    Write-Host "Linking to Railway project..." -ForegroundColor Yellow
    railway link
    
    Write-Host "Deploying backend..." -ForegroundColor Yellow
    railway up
    
    Write-Host "Running migrations..." -ForegroundColor Yellow
    railway run python manage.py migrate
    
    Write-Host "Collecting static files..." -ForegroundColor Yellow
    railway run python manage.py collectstatic --noinput
    
    $createSuperuser = Read-Host "Create superuser? (y/n)"
    if ($createSuperuser -eq "y" -or $createSuperuser -eq "Y") {
        railway run python manage.py createsuperuser
    }
    
    Write-Host "✅ Backend deployed successfully!" -ForegroundColor Green
    
    Set-Location ..
} else {
    Write-Host "⏭️  Skipping backend deployment" -ForegroundColor Yellow
}

Write-Host ""

# Deploy Frontend to Vercel
Write-Host "🌐 Frontend Deployment to Vercel" -ForegroundColor Cyan
Write-Host "-----------------------------------" -ForegroundColor Cyan

$deployFrontend = Read-Host "Deploy frontend to Vercel? (y/n)"
if ($deployFrontend -eq "y" -or $deployFrontend -eq "Y") {
    Set-Location frontend
    
    Write-Host "Logging into Vercel..." -ForegroundColor Yellow
    vercel login
    
    Write-Host "Deploying to production..." -ForegroundColor Yellow
    vercel --prod
    
    Write-Host "✅ Frontend deployed successfully!" -ForegroundColor Green
    
    Set-Location ..
} else {
    Write-Host "⏭️  Skipping frontend deployment" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Configure environment variables in Vercel dashboard"
Write-Host "   2. Update CORS settings in Railway backend"
Write-Host "   3. Test all pages and functionality"
Write-Host "   4. Run PageSpeed Insights tests"
Write-Host ""
Write-Host "🔍 PageSpeed Insights:" -ForegroundColor Yellow
Write-Host "   https://pagespeed.web.dev/" -ForegroundColor Cyan
Write-Host ""
