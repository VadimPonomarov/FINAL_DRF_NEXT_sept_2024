# 🚀 Production Deployment Guide

## Overview
This guide covers deploying the AutoRia Clone full-stack application to production:
- **Backend**: Railway (Django + PostgreSQL + Redis + Celery)
- **Frontend**: Vercel (Next.js)

---

## 📦 Backend Deployment (Railway)

### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Create a new project

### Step 2: Deploy Backend Services

#### PostgreSQL Database
1. Click "New" → "Database" → "PostgreSQL"
2. Note the connection details (will be auto-configured)

#### Redis Cache
1. Click "New" → "Database" → "Redis"
2. Note the connection URL

#### Django Application
1. Click "New" → "GitHub Repo"
2. Select your repository
3. Set root directory: `backend`
4. Configure environment variables:

```env
# Django Settings
DEBUG=False
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=.railway.app
DJANGO_SETTINGS_MODULE=config.settings

# Database (auto-configured by Railway)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis (auto-configured by Railway)
REDIS_URL=${{Redis.REDIS_URL}}

# CORS
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
CORS_ALLOW_CREDENTIALS=True

# Media & Static
MEDIA_URL=/media/
STATIC_URL=/static/

# Email (optional)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# AutoRia API (if needed)
AUTORIA_API_KEY=your-api-key
```

5. Deploy settings:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python manage.py migrate && python manage.py collectstatic --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 4`

#### Celery Worker (Optional)
1. Click "New" → "GitHub Repo" (same repo)
2. Set root directory: `celery-service`
3. Environment variables: Same as Django app
4. Start Command: `celery -A config worker --loglevel=info`

### Step 3: Verify Backend Deployment
1. Visit your Railway app URL: `https://your-app.railway.app`
2. Check health endpoint: `https://your-app.railway.app/health`
3. Access admin: `https://your-app.railway.app/admin`

---

## 🌐 Frontend Deployment (Vercel)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Deploy Frontend
```bash
cd frontend
vercel --prod
```

### Step 4: Configure Environment Variables in Vercel Dashboard

Go to your Vercel project → Settings → Environment Variables:

```env
# NextAuth
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=bXL+w0/zn9FX477unDrwiDMw8Tn4uC2Jv5fK3pL9mN6qR8sT1vW4xY7zA0bC

# Backend API
NEXT_PUBLIC_BACKEND_URL=https://your-backend.railway.app
BACKEND_URL=https://your-backend.railway.app

# Redis (Railway Redis URL)
REDIS_URL=redis://default:password@redis.railway.internal:6379

# Google OAuth
GOOGLE_CLIENT_ID=317007351021-lhq7qt2ppsnihugttrs2f81nmvjbi0vr.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-secret
NEXT_PUBLIC_GOOGLE_CLIENT_ID=317007351021-lhq7qt2ppsnihugttrs2f81nmvjbi0vr.apps.googleusercontent.com

# Production
NODE_ENV=production
NEXT_PUBLIC_IS_DOCKER=false
IS_DOCKER=false
NEXT_TELEMETRY_DISABLED=1
```

### Step 5: Redeploy with Environment Variables
```bash
vercel --prod
```

---

## ✅ Post-Deployment Checklist

### Backend
- [ ] Database migrations completed
- [ ] Static files collected
- [ ] Admin panel accessible
- [ ] API endpoints responding
- [ ] CORS configured correctly
- [ ] Redis connected

### Frontend
- [ ] All pages loading
- [ ] Authentication working
- [ ] API calls successful
- [ ] Images loading
- [ ] No console errors

---

## 🎯 Performance Optimization

### 1. Enable Compression
Already configured in `next.config.js`:
- Gzip/Brotli compression
- Image optimization (WebP/AVIF)
- Static asset caching

### 2. Database Optimization
```sql
-- Add indexes for frequently queried fields
CREATE INDEX idx_ads_created_at ON autoria_ad(created_at);
CREATE INDEX idx_ads_user_id ON autoria_ad(user_id);
CREATE INDEX idx_ads_status ON autoria_ad(status);
```

### 3. Redis Caching
Configure in Django settings:
```python
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'autoria',
        'TIMEOUT': 300,
    }
}
```

### 4. CDN for Static Files (Optional)
- Use Cloudflare or AWS CloudFront
- Configure in Django settings
- Update `STATIC_URL` and `MEDIA_URL`

---

## 🔍 Testing with PageSpeed Insights

### Test All Pages
```bash
# Homepage
https://pagespeed.web.dev/analysis?url=https://your-app.vercel.app

# Ads listing
https://pagespeed.web.dev/analysis?url=https://your-app.vercel.app/autoria/ads

# Ad details
https://pagespeed.web.dev/analysis?url=https://your-app.vercel.app/autoria/ads/1

# User profile
https://pagespeed.web.dev/analysis?url=https://your-app.vercel.app/profile
```

### Target Metrics (Green Zone)
- **Performance**: > 90
- **Accessibility**: > 90
- **Best Practices**: > 90
- **SEO**: > 90

### Common Issues & Fixes

#### Issue: Large JavaScript Bundle
**Fix**: Enable code splitting
```typescript
// Use dynamic imports
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>,
});
```

#### Issue: Unoptimized Images
**Fix**: Use Next.js Image component
```tsx
import Image from 'next/image';

<Image 
  src="/image.jpg" 
  width={800} 
  height={600} 
  alt="Description"
  priority={false}
  loading="lazy"
/>
```

#### Issue: Slow Server Response
**Fix**: 
- Enable Redis caching
- Add database indexes
- Use CDN for static files
- Optimize database queries

#### Issue: Render-Blocking Resources
**Fix**: Already configured in `next.config.js`
- Font display: swap
- Preconnect to external domains
- Defer non-critical scripts

---

## 🔧 Maintenance

### Update Backend
```bash
git pull origin main
# Railway auto-deploys on push
```

### Update Frontend
```bash
cd frontend
git pull origin main
vercel --prod
```

### Database Backup
```bash
# Railway provides automatic backups
# Manual backup:
railway run pg_dump > backup.sql
```

### Monitor Logs
```bash
# Railway
railway logs

# Vercel
vercel logs
```

---

## 🆘 Troubleshooting

### Backend Not Responding
1. Check Railway logs: `railway logs`
2. Verify environment variables
3. Check database connection
4. Restart service in Railway dashboard

### Frontend Build Fails
1. Check Vercel build logs
2. Verify all environment variables are set
3. Test build locally: `npm run build`
4. Check for TypeScript errors

### CORS Errors
1. Verify `CORS_ALLOWED_ORIGINS` in backend includes Vercel URL
2. Check `CORS_ALLOW_CREDENTIALS=True`
3. Verify frontend is using correct backend URL

### Redis Connection Issues
1. Verify `REDIS_URL` in both backend and frontend
2. Check Railway Redis service is running
3. Test connection: `redis-cli ping`

---

## 📊 Monitoring

### Recommended Tools
- **Vercel Analytics**: Built-in performance monitoring
- **Railway Metrics**: CPU, Memory, Network usage
- **Sentry**: Error tracking (optional)
- **Google Analytics**: User analytics (optional)

---

## 🔐 Security Checklist

- [ ] `DEBUG=False` in production
- [ ] Strong `SECRET_KEY` set
- [ ] HTTPS enabled (automatic on Vercel/Railway)
- [ ] CORS properly configured
- [ ] Environment variables secured
- [ ] Database credentials rotated
- [ ] API rate limiting enabled
- [ ] CSP headers configured

---

## 📝 Notes

- Railway provides $5/month free tier
- Vercel provides generous free tier for hobby projects
- Both platforms auto-deploy on git push
- SSL certificates are automatic
- Custom domains supported on both platforms

---

## 🎉 Success!

Your application is now deployed and optimized for production!

**Frontend**: https://your-app.vercel.app
**Backend**: https://your-backend.railway.app
**Admin**: https://your-backend.railway.app/admin

Next steps:
1. Run PageSpeed tests on all pages
2. Monitor performance metrics
3. Set up error tracking
4. Configure custom domain (optional)
