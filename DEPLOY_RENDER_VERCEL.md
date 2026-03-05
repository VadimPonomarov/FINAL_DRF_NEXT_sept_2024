# 🚀 Деплой: Vercel + Render (Оптимальная Схема)

## Архитектура

```
┌─────────────────┐
│   Vercel        │
│   (Next.js)     │  ← Frontend + SSR + API Proxy
└────────┬────────┘
         │
         │ rewrites /api/* → 
         │
┌────────▼────────┐
│   Render        │
│   (Django DRF)  │  ← Backend API + Admin + Auth
│   + PostgreSQL  │
│   + Redis       │
└─────────────────┘
```

## Преимущества этой схемы:

✅ **Vercel Free Plan**: 
- 100 GB bandwidth/месяц
- Автоматический SSL
- Edge Network (CDN)
- Мгновенный деплой

✅ **Render Free Plan**:
- 750 часов/месяц (достаточно для 1 сервиса 24/7)
- Бесплатный PostgreSQL (1 GB)
- Бесплатный Redis
- Автоматический SSL
- Auto-sleep после 15 мин простоя

✅ **Общие плюсы**:
- Полностью бесплатно
- Автоматические деплои из GitHub
- Встроенный мониторинг
- Логи в реальном времени

---

## ЭТАП 1: Деплой Backend на Render (10 минут)

### Вариант A: Через Dashboard (Рекомендуется)

#### 1. Создайте аккаунт Render
👉 **https://render.com**

#### 2. Создайте PostgreSQL базу данных
1. Dashboard → **New** → **PostgreSQL**
2. Name: `autoria-db`
3. Database: `autoria`
4. User: `autoria_user`
5. Region: **Frankfurt** (ближе к Европе)
6. Plan: **Free**
7. Нажмите **Create Database**
8. **Скопируйте Internal Database URL** (понадобится позже)

#### 3. Создайте Redis
1. Dashboard → **New** → **Redis**
2. Name: `autoria-redis`
3. Region: **Frankfurt**
4. Plan: **Free**
5. Нажмите **Create Redis**
6. **Скопируйте Internal Redis URL**

#### 4. Создайте Web Service (Django)
1. Dashboard → **New** → **Web Service**
2. Connect your GitHub repository
3. Настройки:
   - **Name**: `autoria-backend`
   - **Region**: Frankfurt
   - **Branch**: main
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: 
     ```bash
     pip install -r requirements.txt
     ```
   - **Start Command**:
     ```bash
     python manage.py migrate && python manage.py collectstatic --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 4 --timeout 120
     ```
   - **Plan**: Free

#### 5. Настройте Environment Variables

В настройках Web Service добавьте:

```env
# Django Core
DEBUG=False
SECRET_KEY=django-insecure-generate-random-secret-key-here-change-in-production
DJANGO_SETTINGS_MODULE=config.settings
ALLOWED_HOSTS=.onrender.com,.vercel.app

# Database (скопируйте Internal URL из PostgreSQL)
DATABASE_URL=postgresql://autoria_user:password@dpg-xxx-a.frankfurt-postgres.render.com/autoria

# Redis (скопируйте Internal URL из Redis)
REDIS_URL=redis://red-xxx-a.frankfurt-redis.render.com:6379

# CORS (обновите после получения Vercel URL)
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
CORS_ALLOW_CREDENTIALS=True

# Media & Static
MEDIA_URL=/media/
STATIC_URL=/static/
MEDIA_ROOT=/app/media
STATIC_ROOT=/app/staticfiles

# Email (опционально)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

#### 6. Деплой
1. Нажмите **Create Web Service**
2. Render начнет сборку и деплой
3. Дождитесь статуса **Live** (5-10 минут)
4. **Скопируйте URL**: `https://autoria-backend.onrender.com`

#### 7. Создайте суперпользователя

После успешного деплоя:
1. В Render Dashboard откройте ваш сервис
2. Перейдите в **Shell**
3. Выполните:
```bash
python manage.py createsuperuser
```

### Вариант B: Через render.yaml (Автоматический)

Файл `render.yaml` уже создан в корне проекта!

1. В Render Dashboard → **New** → **Blueprint**
2. Connect repository
3. Render автоматически создаст все сервисы из `render.yaml`
4. Настройте только переменные окружения

---

## ЭТАП 2: Деплой Frontend на Vercel (5 минут)

### 1. Откройте Vercel
👉 **https://vercel.com/new**

### 2. Импортируйте репозиторий
- Войдите через GitHub
- Выберите `FINAL_DRF_NEXT_sept_2024`

### 3. Настройте проект
- **Framework Preset**: Next.js
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install --legacy-peer-deps`

### 4. Environment Variables

Добавьте для **Production**:

```env
# NextAuth
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=bXL+w0/zn9FX477unDrwiDMw8Tn4uC2Jv5fK3pL9mN6qR8sT1vW4xY7zA0bC

# Backend API (Render URL)
NEXT_PUBLIC_BACKEND_URL=https://autoria-backend.onrender.com
BACKEND_URL=https://autoria-backend.onrender.com

# Redis (Internal URL from Render)
REDIS_URL=redis://red-xxx-a.frankfurt-redis.render.com:6379

# Google OAuth
GOOGLE_CLIENT_ID=317007351021-lhq7qt2ppsnihugttrs2f81nmvjbi0vr.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
NEXT_PUBLIC_GOOGLE_CLIENT_ID=317007351021-lhq7qt2ppsnihugttrs2f81nmvjbi0vr.apps.googleusercontent.com

# Production
NODE_ENV=production
NEXT_PUBLIC_IS_DOCKER=false
IS_DOCKER=false
NEXT_TELEMETRY_DISABLED=1
```

⚠️ **Замените**:
- `https://your-app.vercel.app` → ваш реальный Vercel URL (получите после деплоя)
- `https://autoria-backend.onrender.com` → ваш реальный Render URL
- Redis URL → Internal URL из Render

### 5. Deploy
Нажмите **Deploy** и дождитесь завершения

### 6. Обновите переменные
После деплоя:
1. Скопируйте ваш Vercel URL
2. Обновите `NEXTAUTH_URL` в Vercel
3. Обновите `CORS_ALLOWED_ORIGINS` в Render

---

## ЭТАП 3: Проверка

### Автоматическая проверка

```powershell
cd D:\myDocuments\studying\Projects\FINAL_DRF_NEXT_sept_2024

.\CHECK_DEPLOYMENT.ps1 -BackendUrl "https://autoria-backend.onrender.com" -FrontendUrl "https://your-app.vercel.app"
```

### Ручная проверка

#### Backend (Render):
- ✅ Health: `https://autoria-backend.onrender.com/health`
- ✅ Admin: `https://autoria-backend.onrender.com/admin`
- ✅ API: `https://autoria-backend.onrender.com/api/`

#### Frontend (Vercel):
- ✅ Homepage: `https://your-app.vercel.app`
- ✅ Login: `https://your-app.vercel.app/login`
- ✅ Ads: `https://your-app.vercel.app/autoria/ads`

#### API Proxy (через Vercel):
- ✅ API через прокси: `https://your-app.vercel.app/api/`
- ✅ Должно проксироваться на Render backend

---

## ЭТАП 4: PageSpeed Insights

```powershell
.\test-pagespeed.ps1 -FrontendUrl "https://your-app.vercel.app"
```

Цель: **все страницы > 90** (зеленая зона)

---

## Особенности Render Free Plan

### ⚠️ Auto-Sleep
- Сервис засыпает после **15 минут** простоя
- Первый запрос после сна может занять **30-60 секунд**
- Решение: использовать cron для keep-alive пингов

### Keep-Alive решение

Создайте GitHub Action для пинга каждые 10 минут:

`.github/workflows/keep-alive.yml`:
```yaml
name: Keep Render Alive
on:
  schedule:
    - cron: '*/10 * * * *'  # Каждые 10 минут
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping backend
        run: curl https://autoria-backend.onrender.com/health
```

---

## Преимущества Render vs Railway

| Фича | Render | Railway |
|------|--------|---------|
| Free Hours | 750/месяц | $5 credit |
| PostgreSQL | 1 GB бесплатно | Платно после trial |
| Redis | Бесплатно | Платно после trial |
| Auto-sleep | Да (15 мин) | Нет |
| Region | Frankfurt | US/EU |
| Деплой | Медленнее | Быстрее |

**Вывод**: Render лучше для долгосрочных бесплатных проектов.

---

## Мониторинг

### Render Dashboard
- Логи в реальном времени
- Метрики CPU/Memory
- Деплой история
- Shell доступ

### Vercel Dashboard
- Analytics (встроенная)
- Логи функций
- Performance metrics
- Core Web Vitals

---

## Troubleshooting

### Backend долго отвечает
**Причина**: Auto-sleep на Render
**Решение**: 
1. Настройте keep-alive пинги
2. Или используйте платный план ($7/мес)

### CORS ошибки
**Решение**:
1. Убедитесь что `CORS_ALLOWED_ORIGINS` содержит точный Vercel URL
2. Проверьте `CORS_ALLOW_CREDENTIALS=True`
3. Перезапустите Render сервис

### Database connection errors
**Решение**:
1. Используйте **Internal Database URL** из Render
2. Формат: `postgresql://user:pass@host.render-internal.com/db`
3. Не используйте External URL (он платный)

---

## Итоговый Чеклист

- [ ] PostgreSQL создан на Render
- [ ] Redis создан на Render
- [ ] Backend развернут на Render
- [ ] Миграции выполнены
- [ ] Суперпользователь создан
- [ ] Frontend развернут на Vercel
- [ ] Все переменные окружения настроены
- [ ] CORS обновлен с реальным Vercel URL
- [ ] API proxy работает (rewrites)
- [ ] Backend health check отвечает
- [ ] Frontend загружается
- [ ] Аутентификация работает
- [ ] PageSpeed все страницы > 90

---

## 🎉 Готово!

**Frontend**: https://your-app.vercel.app  
**Backend**: https://autoria-backend.onrender.com  
**Admin**: https://autoria-backend.onrender.com/admin

**Стоимость**: $0/месяц  
**Лимиты**: 750 часов backend + 100GB bandwidth frontend

---

## Дополнительно: FastAPI на Fly.io (если нужно)

Если понадобятся микросервисы:

```bash
# Установите Fly CLI
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"

# Деплой FastAPI
cd your-fastapi-service
fly launch
fly deploy
```

Добавьте в `next.config.js`:
```js
{ source: '/ml/:path*', destination: 'https://your-app.fly.dev/:path*' }
```

---

**Время деплоя**: 15-20 минут  
**Результат**: Production-ready приложение на бесплатных тарифах!
