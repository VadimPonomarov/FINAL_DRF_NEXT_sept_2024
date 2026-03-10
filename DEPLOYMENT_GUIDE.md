# Deployment Guide & Authentication Test

## Current Status ✅

### Backend (Railway)
- **URL**: https://autoria-web-production.up.railway.app
- **Status**: ✅ Running
- **Test Users**:
  - Admin: `admin@autoria.com` / `12345678`
  - Test: Any user with `test123`

### Frontend (Local)
- **URL**: http://localhost:3000
- **Status**: ✅ Running
- **Build**: ✅ Successful

## Authentication Flow Test

### 1. Access AutoRia Search Page
```bash
# Open in browser
http://localhost:3000/autoria/search
```

**Expected Flow**:
1. Middleware checks NextAuth session → ❌ None found
2. Redirect to `/api/auth/signin?callbackUrl=/autoria/search`
3. Sign in with Google OR use backend login
4. After NextAuth session, BackendTokenPresenceGate checks backend tokens
5. If no backend tokens → redirect to `/login?callbackUrl=/autoria/search`
6. Login with `admin@autoria.com` / `12345678`
7. Backend tokens saved in httpOnly cookies
8. Redirect to `/autoria/search` with full access

### 2. Direct Login Test
```bash
# Test login API directly
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@autoria.com", "password": "12345678"}' \
  -c cookies.txt
```

### 3. Token Check
```bash
# Check saved tokens
curl -X GET http://localhost:3000/api/auth/token \
  -b cookies.txt
```

## Deployment to Vercel

### Method 1: Vercel CLI (if working)
```bash
cd D:\myDocuments\studying\Projects\FINAL_DRF_NEXT_sept_2024
vercel login
vercel --prod
```

### Method 2: GitHub Auto-Deploy
1. Push changes to GitHub
2. Vercel will auto-deploy from `vercel.json` config
3. Environment variables already configured

### Method 3: Manual Deploy
1. Open https://vercel.com/vadimponomarovs-projects/autoria-clone
2. Connect GitHub repo
3. Trigger manual deploy

## Environment Configuration

### Frontend (.env.local)
```env
NEXT_PUBLIC_BACKEND_URL=https://autoria-web-production.up.railway.app
NEXTAUTH_URL=https://autoria-clone.vercel.app  # Update after deploy
```

### Vercel Dashboard Settings
- **BACKEND_URL**: https://autoria-web-production.up.railway.app
- **NEXT_PUBLIC_BACKEND_URL**: https://autoria-web-production.up.railway.app

## Authentication Architecture

### Two-Level Protection
1. **Level 1 (Middleware)**: NextAuth session check
2. **Level 2 (BackendTokenPresenceGate)**: Backend tokens check

### Redirect Flow
```
/autoria/search → [Middleware] → /api/auth/signin → [NextAuth] → 
/login → [Backend Login] → [Tokens Saved] → /autoria/search
```

## Testing Checklist

- [ ] Frontend builds successfully ✅
- [ ] Backend API accessible ✅
- [ ] Login API works ✅
- [ ] Token validation works ✅
- [ ] Search page redirects correctly ✅
- [ ] Full auth flow completed ✅
- [ ] Vercel deployment ready ⏳

## Troubleshooting

### 500 Errors
- Check backend URL in environment variables
- Verify Railway backend is running
- Check CORS settings

### Authentication Loops
- Clear browser cookies
- Check middleware configuration
- Verify NextAuth session

### Token Issues
- Check httpOnly cookie settings
- Verify backend token validation
- Check Railway API status

---

**Ready for Production**: ✅ All systems tested and working
