# GitHub Pages Unified Proxy (Бесплатно)

## Почему GitHub Pages?
- **Абсолютно бесплатно** для public repos
- **Автоматический HTTPS** 
- **GitHub Actions CI/CD**
- **Custom domain** поддержка
- **Статический хостинг** с JavaScript proxy
- **99.9% uptime** GitHub инфраструктура

## Архитектура
```
GitHub Pages (Proxy) → Vercel Frontend
                      → Railway Backend
                      → Redis (через Vercel API)
```

## Настройка

### 1. Включить GitHub Pages
```bash
# В репозитории GitHub:
# Settings → Pages → Source: GitHub Actions
```

### 2. Настроить Custom Domain (опционально)
```bash
# В доменном регистраторе добавить CNAME:
# www.your-domain.com → your-username.github.io

# В GitHub Settings → Pages → Custom domain:
# www.your-domain.com
```

### 3. Commit и push
```bash
git add .github/workflows/deploy-proxy.yml
git commit -m "add: GitHub Pages proxy deployment"
git push origin main
```

### 4. Дождаться деплоя
- Actions → Deploy Unified Proxy → View deployment
- Страница будет доступна: `https://your-username.github.io/FINAL_DRF_NEXT_sept_2024`

## Environment Variables для Vercel

```bash
# Обновить Vercel environment
vercel env add NEXT_PUBLIC_FRONTEND_URL production
# Ввести: https://your-username.github.io/FINAL_DRF_NEXT_sept_2024

vercel env add NEXT_PUBLIC_BACKEND_URL production
# Ввести: https://your-username.github.io/FINAL_DRF_NEXT_sept_2024

vercel env add NEXTAUTH_URL production  
# Ввести: https://your-username.github.io/FINAL_DRF_NEXT_sept_2024
```

## JavaScript Proxy для API

Создать `proxy.js` в GitHub Pages:

```javascript
// API Proxy через GitHub Pages
class APIProxy {
    constructor() {
        this.baseURL = 'https://autoria-clone.vercel.app';
        this.backendURL = 'https://autoria-web-production.up.railway.app';
    }

    async request(url, options = {}) {
        // Route API calls to appropriate service
        if (url.startsWith('/api/users/') || url.startsWith('/admin/')) {
            return fetch(this.backendURL + url, options);
        } else if (url.startsWith('/api/redis') || url.startsWith('/api/auth/')) {
            return fetch(this.baseURL + url, options);
        } else {
            return fetch(this.baseURL + url, options);
        }
    }
}

window.apiProxy = new APIProxy();
```

## Преимущества

### ✅ Плюсы:
- **Бесплатно** - нет никаких затрат
- **Надежно** - GitHub инфраструктура
- **HTTPS** автоматически
- **CI/CD** встроен
- **Custom domain** поддержка
- **Нет сервера** для обслуживания

### ⚠️ Ограничения:
- **Static только** - нет server-side
- **CORS ограничения** для cross-origin запросов
- **Rate limiting** GitHub (100GB/month bandwidth)
- **Build time** ограничения

## Тестирование

```bash
# Proxy страница
curl https://your-username.github.io/FINAL_DRF_NEXT_sept_2024

# Прямые сервисы
curl https://autoria-clone.vercel.app/api/redis-simple
curl https://autoria-web-production.up.railway.app/api/users/public/list/
```

## Альтернативы

### 1. Netlify (тоже бесплатно)
```yaml
# netlify.toml
[[redirects]]
  from = "/api/*"
  to = "https://autoria-clone.vercel.app/api/:splat"
  status = 200

[[redirects]]
  from = "/admin/*"
  to = "https://autoria-web-production.up.railway.app/admin/:splat"
  status = 200
```

### 2. Vercel Edge Functions
```javascript
// api/[[...route]].js
export async function onRequest(context) {
  const url = new URL(context.request.url);
  
  if (url.pathname.startsWith('/api/users/')) {
    // Proxy to Railway
    return fetch('https://autoria-web-production.up.railway.app' + url.pathname);
  }
  
  // Default to Vercel
  return context.next();
}
```

### 3. Cloudflare Workers (бесплатно)
```javascript
// worker.js
export default {
  async fetch(request) {
    const url = new URL(request.url);
    
    if (url.pathname.startsWith('/api/users/')) {
      return fetch('https://autoria-web-production.up.railway.app' + url.pathname, request);
    }
    
    return fetch('https://autoria-clone.vercel.app' + url.pathname, request);
  }
};
```

## Production рекомендации

1. **Использовать Cloudflare Tunnel** для полной функциональности
2. **GitHub Pages** для статических страниц и документации  
3. **Netlify** если нужен больше serverless функций
4. **Vercel Edge** для максимальной производительности

## Мониторинг

```bash
# GitHub Pages status
curl -I https://your-username.github.io/FINAL_DRF_NEXT_sept_2024

# Service health checks
curl https://autoria-clone.vercel.app/api/redis-simple
curl https://autoria-web-production.up.railway.app/health/
```

## Заключение

**GitHub Pages** - отличный бесплатный вариант для:
- Статических страниц и документации
- Простого proxy для API
- Быстрого прототипирования
- Educational проектов

Для production с Redis и сложной логики лучше использовать **Cloudflare Tunnel**.
