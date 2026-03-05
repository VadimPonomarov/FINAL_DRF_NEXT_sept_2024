#!/bin/bash

# Production Deployment Script for AutoRia Clone
# Deploys Backend to Railway and Frontend to Vercel

set -e

echo "🚀 AutoRia Clone - Production Deployment"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if required tools are installed
echo "📋 Checking prerequisites..."

if ! command -v railway &> /dev/null; then
    echo -e "${YELLOW}⚠️  Railway CLI not found. Installing...${NC}"
    npm install -g @railway/cli
fi

if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI not found. Installing...${NC}"
    npm install -g vercel
fi

echo -e "${GREEN}✅ Prerequisites checked${NC}"
echo ""

# Deploy Backend to Railway
echo "🔧 Deploying Backend to Railway..."
echo "-----------------------------------"

read -p "Deploy backend to Railway? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd backend
    
    # Login to Railway
    railway login
    
    # Link or create project
    railway link
    
    # Add PostgreSQL
    echo "Adding PostgreSQL database..."
    railway add --database postgres
    
    # Add Redis
    echo "Adding Redis cache..."
    railway add --database redis
    
    # Set environment variables
    echo "Setting environment variables..."
    railway variables set DEBUG=False
    railway variables set DJANGO_SETTINGS_MODULE=config.settings
    railway variables set ALLOWED_HOSTS=.railway.app
    
    # Deploy
    echo "Deploying backend..."
    railway up
    
    # Run migrations
    echo "Running migrations..."
    railway run python manage.py migrate
    
    # Collect static files
    echo "Collecting static files..."
    railway run python manage.py collectstatic --noinput
    
    # Create superuser (optional)
    read -p "Create superuser? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        railway run python manage.py createsuperuser
    fi
    
    # Get backend URL
    BACKEND_URL=$(railway status --json | jq -r '.deployments[0].url')
    echo -e "${GREEN}✅ Backend deployed to: $BACKEND_URL${NC}"
    
    cd ..
else
    echo "⏭️  Skipping backend deployment"
    read -p "Enter your backend URL: " BACKEND_URL
fi

echo ""

# Deploy Frontend to Vercel
echo "🌐 Deploying Frontend to Vercel..."
echo "-----------------------------------"

read -p "Deploy frontend to Vercel? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd frontend
    
    # Login to Vercel
    vercel login
    
    # Set environment variables
    echo "Setting environment variables..."
    vercel env add NEXTAUTH_SECRET production
    vercel env add NEXTAUTH_URL production
    vercel env add NEXT_PUBLIC_BACKEND_URL production
    vercel env add BACKEND_URL production
    vercel env add REDIS_URL production
    vercel env add GOOGLE_CLIENT_ID production
    vercel env add GOOGLE_CLIENT_SECRET production
    vercel env add NEXT_PUBLIC_GOOGLE_CLIENT_ID production
    
    # Deploy to production
    echo "Deploying frontend..."
    vercel --prod
    
    # Get frontend URL
    FRONTEND_URL=$(vercel inspect --json | jq -r '.url')
    echo -e "${GREEN}✅ Frontend deployed to: https://$FRONTEND_URL${NC}"
    
    cd ..
else
    echo "⏭️  Skipping frontend deployment"
    read -p "Enter your frontend URL: " FRONTEND_URL
fi

echo ""
echo "=========================================="
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo "📍 Your application URLs:"
echo "   Frontend: https://$FRONTEND_URL"
echo "   Backend:  $BACKEND_URL"
echo "   Admin:    $BACKEND_URL/admin"
echo ""
echo "📊 Next steps:"
echo "   1. Update CORS settings in backend to allow frontend URL"
echo "   2. Test all pages and functionality"
echo "   3. Run PageSpeed Insights tests"
echo "   4. Monitor logs and performance"
echo ""
echo "🔍 PageSpeed Insights:"
echo "   https://pagespeed.web.dev/analysis?url=https://$FRONTEND_URL"
echo ""
