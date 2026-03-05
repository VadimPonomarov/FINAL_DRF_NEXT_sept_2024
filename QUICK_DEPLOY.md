# ⚡ Quick Deployment Guide

## Prerequisites
- Node.js 18+ installed
- Git repository pushed to GitHub
- Railway account (free tier available)
- Vercel account (free tier available)

---

## 🚀 Deploy in 10 Minutes

### Step 1: Deploy Backend to Railway (5 minutes)

1. **Go to [railway.app](https://railway.app)**
2. **Click "Start a New Project"**
3. **Select "Deploy from GitHub repo"**
4. **Choose your repository**
5. **Configure:**
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python manage.py migrate && python manage.py collectstatic --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`

6. **Add PostgreSQL:**
   - Click "New" → "Database" → "PostgreSQL"
   - Railway auto-configures `DATABASE_URL`

7. **Add Redis:**
   - Click "New" → "Database" → "Redis"
   - Railway auto-configures `REDIS_URL`

8. **Set Environment Variables:**
   ```
   DEBUG=False
   SECRET_KEY=your-secret-key-here
   ALLOWED_HOSTS=.railway.app,.vercel.app
   DJANGO_SETTINGS_MODULE=config.settings
   CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
   CORS_ALLOW_CREDENTIALS=True
   ```

9. **Deploy!** Railway will automatically deploy.

10. **Get your backend URL:** `https://your-app.railway.app`

---

### Step 2: Deploy Frontend to Vercel (5 minutes)

#### Option A: Using Vercel Dashboard (Recommended)

1. **Go to [vercel.com](https://vercel.com)**
2. **Click "Add New" → "Project"**
3. **Import your GitHub repository**
4. **Configure:**
   - Framework Preset: Next.js
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install --legacy-peer-deps`

5. **Environment Variables:**
   ```
   NEXTAUTH_URL=https://your-app.vercel.app
   NEXTAUTH_SECRET=bXL+w0/zn9FX477unDrwiDMw8Tn4uC2Jv5fK3pL9mN6qR8sT1vW4xY7zA0bC
   NEXT_PUBLIC_BACKEND_URL=https://your-backend.railway.app
   BACKEND_URL=https://your-backend.railway.app
   REDIS_URL=redis://default:password@redis.railway.internal:6379
   GOOGLE_CLIENT_ID=317007351021-lhq7qt2ppsnihugttrs2f81nmvjbi0vr.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-google-secret
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=317007351021-lhq7qt2ppsnihugttrs2f81nmvjbi0vr.apps.googleusercontent.com
   NODE_ENV=production
   NEXT_PUBLIC_IS_DOCKER=false
   IS_DOCKER=false
   NEXT_TELEMETRY_DISABLED=1
   ```

6. **Deploy!** Vercel will build and deploy automatically.

7. **Get your frontend URL:** `https://your-app.vercel.app`

#### Option B: Using Vercel CLI

```powershell
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd frontend
vercel --prod

# Set environment variables (one-time)
vercel env add NEXTAUTH_URL production
vercel env add NEXTAUTH_SECRET production
vercel env add NEXT_PUBLIC_BACKEND_URL production
# ... add all other variables
```

---

### Step 3: Update CORS in Backend

1. **Go to Railway dashboard**
2. **Open your backend service**
3. **Update environment variable:**
   ```
   CORS_ALLOWED_ORIGINS=https://your-actual-app.vercel.app
   ```
4. **Redeploy backend**

---

### Step 4: Test Deployment

1. **Visit your frontend:** `https://your-app.vercel.app`
2. **Check backend health:** `https://your-backend.railway.app/health`
3. **Test login/register**
4. **Test creating an ad**
5. **Test all main features**

---

### Step 5: Run PageSpeed Tests

```powershell
# Run the testing script
.\test-pagespeed.ps1 -FrontendUrl "https://your-app.vercel.app"
```

Or manually test each page:
- https://pagespeed.web.dev/analysis?url=https://your-app.vercel.app
- https://pagespeed.web.dev/analysis?url=https://your-app.vercel.app/autoria/ads
- https://pagespeed.web.dev/analysis?url=https://your-app.vercel.app/login

**Target:** All pages should be in GREEN ZONE (90+)

---

## 🎯 Performance Optimization

If any page is not in green zone, apply these fixes:

### Quick Wins:
1. **Enable image optimization** - Use Next.js Image component everywhere
2. **Lazy load components** - Use dynamic imports for heavy components
3. **Enable caching** - Configure Redis caching in backend
4. **Optimize fonts** - Already configured with `display: swap`
5. **Compress responses** - Already enabled in Next.js config

### Detailed Guide:
See `PERFORMANCE_OPTIMIZATION.md` for comprehensive optimization steps.

---

## 🔧 Troubleshooting

### Frontend shows "Something went wrong"
- Check `NEXTAUTH_SECRET` is set in Vercel
- Check `NEXTAUTH_URL` matches your Vercel URL
- Check browser console for errors

### Backend not responding
- Check Railway logs: `railway logs`
- Verify environment variables are set
- Check database connection

### CORS errors
- Update `CORS_ALLOWED_ORIGINS` in Railway to include Vercel URL
- Ensure `CORS_ALLOW_CREDENTIALS=True`
- Redeploy backend after changes

### Images not loading
- Check `NEXT_PUBLIC_BACKEND_URL` is correct
- Verify backend media files are accessible
- Check image domains in `next.config.js`

---

## 📊 Monitoring

### Vercel Analytics
- Go to Vercel dashboard → Analytics
- View real-time performance metrics
- Monitor Core Web Vitals

### Railway Metrics
- Go to Railway dashboard → Metrics
- Monitor CPU, Memory, Network usage
- Check logs for errors

---

## 🎉 Success Checklist

- [ ] Backend deployed to Railway
- [ ] PostgreSQL database created
- [ ] Redis cache created
- [ ] Frontend deployed to Vercel
- [ ] All environment variables set
- [ ] CORS configured correctly
- [ ] All pages loading without errors
- [ ] Authentication working
- [ ] API calls successful
- [ ] Images loading correctly
- [ ] All PageSpeed tests in green zone (90+)

---

## 📝 Post-Deployment

### Optional Enhancements:
1. **Custom Domain:** Add in Vercel/Railway settings
2. **SSL Certificate:** Automatic on both platforms
3. **CDN:** Cloudflare for additional caching
4. **Monitoring:** Sentry for error tracking
5. **Analytics:** Google Analytics or Plausible

### Maintenance:
- Monitor logs regularly
- Update dependencies monthly
- Backup database weekly
- Review performance metrics

---

## 💡 Tips

- **Free Tiers:** Railway ($5/month free), Vercel (generous free tier)
- **Auto-Deploy:** Both platforms auto-deploy on git push
- **Environment Variables:** Can be updated without redeployment
- **Logs:** Access via CLI or dashboard
- **Rollback:** Easy rollback to previous deployments

---

## 🆘 Need Help?

1. Check `DEPLOYMENT_GUIDE.md` for detailed instructions
2. Check `PERFORMANCE_OPTIMIZATION.md` for optimization tips
3. Review Railway/Vercel documentation
4. Check application logs for errors

---

**Estimated Total Time:** 10-15 minutes
**Cost:** $0 (using free tiers)
**Result:** Production-ready full-stack application with green PageSpeed scores!
