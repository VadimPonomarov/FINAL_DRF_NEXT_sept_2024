# 🚀 Deploy Your Application NOW

## Current Status
✅ Node.js v22.12.0 installed
✅ npm v10.9.0 installed  
✅ Vercel CLI v50.28.0 installed
✅ Railway CLI installed

---

## 🎯 Deployment Steps

### STEP 1: Deploy Backend to Railway

Open PowerShell and run:

```powershell
cd D:\myDocuments\studying\Projects\FINAL_DRF_NEXT_sept_2024

# Login to Railway
railway login

# This will open a browser for authentication
# After login, return to terminal

# Create a new project or link existing
railway init

# Add PostgreSQL database
railway add --database postgres

# Add Redis cache  
railway add --database redis

# Set environment variables
railway variables set DEBUG=False
railway variables set SECRET_KEY=your-super-secret-key-change-this-in-production
railway variables set DJANGO_SETTINGS_MODULE=config.settings
railway variables set ALLOWED_HOSTS=.railway.app,.vercel.app
railway variables set CORS_ALLOW_CREDENTIALS=True

# Deploy backend
cd backend
railway up

# Run migrations
railway run python manage.py migrate

# Collect static files
railway run python manage.py collectstatic --noinput

# Create superuser
railway run python manage.py createsuperuser

# Get your backend URL
railway status
```

**Save your backend URL**: `https://your-app-name.railway.app`

---

### STEP 2: Deploy Frontend to Vercel

```powershell
cd D:\myDocuments\studying\Projects\FINAL_DRF_NEXT_sept_2024\frontend

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? autoria-clone (or your choice)
# - Directory? ./ (current directory)
# - Override settings? No
```

**Save your frontend URL**: `https://your-app.vercel.app`

---

### STEP 3: Configure Environment Variables in Vercel

Go to [vercel.com/dashboard](https://vercel.com/dashboard)

1. Select your project
2. Go to **Settings** → **Environment Variables**
3. Add these variables (for **Production**):

```
NEXTAUTH_URL = https://your-app.vercel.app
NEXTAUTH_SECRET = bXL+w0/zn9FX477unDrwiDMw8Tn4uC2Jv5fK3pL9mN6qR8sT1vW4xY7zA0bC
NEXT_PUBLIC_BACKEND_URL = https://your-backend.railway.app
BACKEND_URL = https://your-backend.railway.app
REDIS_URL = (copy from Railway Redis connection string)
GOOGLE_CLIENT_ID = 317007351021-lhq7qt2ppsnihugttrs2f81nmvjbi0vr.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET = (your Google OAuth secret)
NEXT_PUBLIC_GOOGLE_CLIENT_ID = 317007351021-lhq7qt2ppsnihugttrs2f81nmvjbi0vr.apps.googleusercontent.com
NODE_ENV = production
NEXT_PUBLIC_IS_DOCKER = false
IS_DOCKER = false
NEXT_TELEMETRY_DISABLED = 1
```

4. **Redeploy** after adding variables:
```powershell
vercel --prod
```

---

### STEP 4: Update Backend CORS Settings

Go to [railway.app/dashboard](https://railway.app/dashboard)

1. Select your backend service
2. Go to **Variables**
3. Update or add:
```
CORS_ALLOWED_ORIGINS = https://your-actual-app.vercel.app
```
4. Railway will auto-redeploy

---

### STEP 5: Test Your Deployment

1. **Visit frontend**: Open `https://your-app.vercel.app`
2. **Check backend health**: Open `https://your-backend.railway.app/health`
3. **Test login/register**
4. **Create a test ad**
5. **Verify all features work**

---

### STEP 6: Run PageSpeed Tests

```powershell
cd D:\myDocuments\studying\Projects\FINAL_DRF_NEXT_sept_2024

# Run the test script
.\test-pagespeed.ps1 -FrontendUrl "https://your-app.vercel.app"
```

Or test manually:
- Homepage: `https://pagespeed.web.dev/analysis?url=https://your-app.vercel.app`
- Ads: `https://pagespeed.web.dev/analysis?url=https://your-app.vercel.app/autoria/ads`
- Login: `https://pagespeed.web.dev/analysis?url=https://your-app.vercel.app/login`

**Target**: All pages in GREEN ZONE (90+)

---

## 🎯 Performance Optimization

If any page scores below 90, apply these fixes:

### Quick Fixes:

1. **Images**: Ensure all use Next.js Image component
2. **Fonts**: Already optimized with `display: swap`
3. **Caching**: Enable Redis caching in Django
4. **Compression**: Already enabled
5. **Code Splitting**: Use dynamic imports for heavy components

### Detailed Optimization:
See `PERFORMANCE_OPTIMIZATION.md` for comprehensive guide.

---

## 🔧 Troubleshooting

### Issue: "Something went wrong" on frontend
**Solution**: 
- Check all environment variables are set in Vercel
- Verify `NEXTAUTH_SECRET` and `NEXTAUTH_URL`
- Check browser console for errors

### Issue: CORS errors
**Solution**:
- Update `CORS_ALLOWED_ORIGINS` in Railway to include exact Vercel URL
- Ensure `CORS_ALLOW_CREDENTIALS=True`
- Redeploy backend

### Issue: Images not loading
**Solution**:
- Verify `NEXT_PUBLIC_BACKEND_URL` is correct
- Check backend media files are accessible
- Update `next.config.js` image domains

### Issue: Backend not responding
**Solution**:
- Check Railway logs: `railway logs`
- Verify database connection
- Check environment variables

---

## 📊 Success Checklist

- [ ] Railway CLI installed
- [ ] Backend deployed to Railway
- [ ] PostgreSQL database created
- [ ] Redis cache created
- [ ] Backend migrations run
- [ ] Superuser created
- [ ] Frontend deployed to Vercel
- [ ] All environment variables set in Vercel
- [ ] CORS configured in backend
- [ ] Frontend loads without errors
- [ ] Login/register works
- [ ] API calls successful
- [ ] All PageSpeed tests in green zone (90+)

---

## 🎉 You're Done!

Your full-stack application is now live in production!

**Frontend**: https://your-app.vercel.app  
**Backend**: https://your-backend.railway.app  
**Admin**: https://your-backend.railway.app/admin

---

## 📝 Next Steps

1. **Custom Domain**: Add in Vercel/Railway settings (optional)
2. **Monitoring**: Enable Vercel Analytics
3. **Error Tracking**: Set up Sentry (optional)
4. **Backups**: Configure database backups in Railway
5. **Performance**: Monitor Core Web Vitals

---

## 💡 Important Notes

- **Free Tiers**: Railway ($5/month credit), Vercel (generous free tier)
- **Auto-Deploy**: Both platforms auto-deploy on git push to main branch
- **SSL**: Automatic HTTPS on both platforms
- **Logs**: Access via `railway logs` or Vercel dashboard
- **Rollback**: Easy rollback to previous deployments in both dashboards

---

## 🆘 Need Help?

1. Check `DEPLOYMENT_GUIDE.md` for detailed instructions
2. Check `PERFORMANCE_OPTIMIZATION.md` for optimization tips
3. Check `QUICK_DEPLOY.md` for quick reference
4. Review Railway/Vercel documentation
5. Check application logs for errors

---

**Estimated Time**: 15-20 minutes  
**Cost**: $0 (using free tiers)  
**Result**: Production-ready app with green PageSpeed scores!
