# 🎯 Performance Optimization Guide

## Goal: Achieve Green Zone (90+) on PageSpeed Insights

This guide provides step-by-step optimizations to ensure all pages score in the green zone on PageSpeed Insights.

---

## 📊 Current Optimizations Already Implemented

### ✅ Next.js Configuration
- **Image Optimization**: WebP/AVIF formats enabled
- **Font Optimization**: `display: swap` for Google Fonts
- **Code Splitting**: Automatic with Next.js App Router
- **Compression**: Gzip/Brotli enabled
- **Static Asset Caching**: 1-year cache for immutable assets
- **Remove Console Logs**: Production builds strip console.log

### ✅ Security Headers
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- Referrer-Policy: origin-when-cross-origin
- Permissions-Policy: Restricted camera/microphone/geolocation
- Strict-Transport-Security: HSTS enabled

### ✅ Caching Strategy
- Static assets: 1 year cache
- API responses: no-cache
- Images: Optimized with Next.js Image component

---

## 🚀 Additional Optimizations to Implement

### 1. Image Optimization

#### Use Next.js Image Component Everywhere
```tsx
// ❌ Bad
<img src="/image.jpg" alt="Description" />

// ✅ Good
import Image from 'next/image';

<Image 
  src="/image.jpg" 
  width={800} 
  height={600} 
  alt="Description"
  loading="lazy"
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..."
/>
```

#### Optimize Image Sizes
```bash
# Install sharp for better image optimization
npm install sharp

# Use appropriate sizes
- Thumbnails: 200x200
- Cards: 400x300
- Hero images: 1200x800
- Full width: 1920x1080
```

### 2. Font Optimization

#### Preload Critical Fonts
```tsx
// In app/layout.tsx
<head>
  <link
    rel="preload"
    href="/fonts/geist-sans.woff2"
    as="font"
    type="font/woff2"
    crossOrigin="anonymous"
  />
</head>
```

#### Use Font Subsetting
```tsx
// Only load Latin characters
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
  preload: true,
});
```

### 3. JavaScript Optimization

#### Dynamic Imports for Heavy Components
```tsx
import dynamic from 'next/dynamic';

// Lazy load heavy components
const Chart = dynamic(() => import('./Chart'), {
  loading: () => <Skeleton />,
  ssr: false, // Disable SSR for client-only components
});

const AdminPanel = dynamic(() => import('./AdminPanel'), {
  loading: () => <Loading />,
});
```

#### Code Splitting by Route
```tsx
// Already automatic with App Router
// Each page is automatically code-split
```

### 4. CSS Optimization

#### Remove Unused CSS
```bash
# Install PurgeCSS
npm install @fullhuman/postcss-purgecss

# Configure in postcss.config.js
module.exports = {
  plugins: [
    'tailwindcss',
    'autoprefixer',
    process.env.NODE_ENV === 'production' && [
      '@fullhuman/postcss-purgecss',
      {
        content: [
          './src/**/*.{js,jsx,ts,tsx}',
        ],
        defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
      },
    ],
  ].filter(Boolean),
};
```

#### Critical CSS Inline
```tsx
// In app/layout.tsx - inline critical CSS
<head>
  <style dangerouslySetInnerHTML={{
    __html: `
      /* Critical CSS for above-the-fold content */
      body { margin: 0; font-family: system-ui; }
      .header { height: 64px; }
    `
  }} />
</head>
```

### 5. API Optimization

#### Enable Response Caching
```tsx
// In API routes
export const revalidate = 60; // Revalidate every 60 seconds

export async function GET() {
  const data = await fetchData();
  
  return Response.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
    },
  });
}
```

#### Use SWR for Client-Side Caching
```tsx
import useSWR from 'swr';

function AdsList() {
  const { data, error } = useSWR('/api/ads', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 minute
  });
}
```

### 6. Preconnect to External Domains

#### Update layout.tsx
```tsx
<head>
  {/* Preconnect to backend */}
  <link rel="preconnect" href={process.env.NEXT_PUBLIC_BACKEND_URL} />
  <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_BACKEND_URL} />
  
  {/* Preconnect to image CDN */}
  <link rel="preconnect" href="https://image.pollinations.ai" crossOrigin="anonymous" />
  <link rel="dns-prefetch" href="https://image.pollinations.ai" />
  
  {/* Preconnect to Google Fonts */}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
</head>
```

### 7. Reduce Third-Party Scripts

#### Load Scripts Efficiently
```tsx
import Script from 'next/script';

// Load analytics after page is interactive
<Script
  src="https://www.googletagmanager.com/gtag/js?id=GA_ID"
  strategy="afterInteractive"
/>

// Load non-critical scripts lazily
<Script
  src="https://widget.example.com/script.js"
  strategy="lazyOnload"
/>
```

### 8. Enable Compression

#### Already configured in next.config.js
```js
compress: true, // Enables gzip/brotli
```

### 9. Optimize Server Response Time

#### Backend Optimizations
```python
# Django settings.py

# Enable database connection pooling
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'CONN_MAX_AGE': 600,  # Connection pooling
    }
}

# Enable Redis caching
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'SOCKET_CONNECT_TIMEOUT': 5,
            'SOCKET_TIMEOUT': 5,
            'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
        },
        'KEY_PREFIX': 'autoria',
        'TIMEOUT': 300,
    }
}

# Enable GZip middleware
MIDDLEWARE = [
    'django.middleware.gzip.GZipMiddleware',
    # ... other middleware
]
```

### 10. Implement Service Worker (PWA)

#### Create service worker
```bash
# Install next-pwa
npm install next-pwa
```

```js
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

module.exports = withPWA({
  // ... existing config
});
```

---

## 🧪 Testing Checklist

### Pages to Test on PageSpeed Insights

1. **Homepage**: `/`
2. **Ads Listing**: `/autoria/ads`
3. **Ad Details**: `/autoria/ads/[id]`
4. **User Profile**: `/profile`
5. **Create Ad**: `/autoria/ads/create`
6. **Login**: `/login`
7. **Register**: `/register`

### Testing Script
```bash
#!/bin/bash

FRONTEND_URL="https://your-app.vercel.app"

echo "Testing PageSpeed Insights..."

pages=(
  "/"
  "/autoria/ads"
  "/autoria/ads/1"
  "/profile"
  "/login"
)

for page in "${pages[@]}"; do
  echo "Testing: $FRONTEND_URL$page"
  open "https://pagespeed.web.dev/analysis?url=$FRONTEND_URL$page&form_factor=desktop"
  sleep 5
done
```

---

## 📈 Performance Metrics Targets

### Core Web Vitals
- **LCP (Largest Contentful Paint)**: < 2.5s ✅
- **FID (First Input Delay)**: < 100ms ✅
- **CLS (Cumulative Layout Shift)**: < 0.1 ✅

### PageSpeed Insights Scores
- **Performance**: > 90 (Green) 🎯
- **Accessibility**: > 90 (Green) 🎯
- **Best Practices**: > 90 (Green) 🎯
- **SEO**: > 90 (Green) 🎯

---

## 🔍 Monitoring & Debugging

### Vercel Analytics
```bash
# Enable in Vercel dashboard
# Settings → Analytics → Enable
```

### Lighthouse CI
```bash
npm install -g @lhci/cli

# Run Lighthouse
lhci autorun --collect.url=https://your-app.vercel.app
```

### Chrome DevTools
1. Open DevTools (F12)
2. Go to Lighthouse tab
3. Select categories: Performance, Accessibility, Best Practices, SEO
4. Click "Analyze page load"

---

## 🛠️ Quick Fixes for Common Issues

### Issue: Large JavaScript Bundle
**Solution**: 
- Enable code splitting
- Use dynamic imports
- Remove unused dependencies

### Issue: Unoptimized Images
**Solution**:
- Use Next.js Image component
- Compress images
- Use WebP/AVIF formats

### Issue: Slow Server Response
**Solution**:
- Enable Redis caching
- Add database indexes
- Optimize queries
- Use CDN

### Issue: Render-Blocking Resources
**Solution**:
- Inline critical CSS
- Defer non-critical scripts
- Use font-display: swap

### Issue: Large CSS Files
**Solution**:
- Remove unused CSS
- Use Tailwind's purge
- Split CSS by route

---

## 📝 Implementation Checklist

- [ ] All images use Next.js Image component
- [ ] Fonts preloaded and optimized
- [ ] Heavy components lazy-loaded
- [ ] API responses cached
- [ ] Preconnect to external domains
- [ ] Third-party scripts optimized
- [ ] Service worker enabled (PWA)
- [ ] Database queries optimized
- [ ] Redis caching enabled
- [ ] Static assets on CDN
- [ ] All pages tested on PageSpeed
- [ ] All scores in green zone (90+)

---

## 🎉 Success Criteria

All pages should achieve:
- ✅ Performance: 90-100 (Green)
- ✅ Accessibility: 90-100 (Green)
- ✅ Best Practices: 90-100 (Green)
- ✅ SEO: 90-100 (Green)

---

## 📚 Resources

- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Web.dev Performance](https://web.dev/performance/)
- [Vercel Analytics](https://vercel.com/docs/analytics)
- [PageSpeed Insights](https://pagespeed.web.dev/)
