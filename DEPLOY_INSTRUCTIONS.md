# 🚀 ПОШАГОВАЯ ИНСТРУКЦИЯ ПО ДЕПЛОЮ

## ✅ Коммит запушен в GitHub успешно!

---

## ШАГ 1: РЕГИСТРАЦИЯ/ВХОД В RENDER

### 1. Откройте Render:
👉 **https://render.com**

### 2. Нажмите "Get Started" или "Sign In"

### 3. Выберите "Sign in with GitHub"
- Авторизуйтесь через GitHub
- Разрешите доступ к репозиториям

---

## ШАГ 2: СОЗДАНИЕ СЕРВИСОВ НА RENDER

### Вариант A: Через Blueprint (Рекомендуется - автоматически)

1. После входа перейдите в **Dashboard**
2. Нажмите **"New +"** → **"Blueprint"**
3. Выберите репозиторий: **VadimPonomarov/FINAL_DRF_NEXT_sept_2024**
4. Render обнаружит файл `render.yaml` и покажет:
   - PostgreSQL Database
   - Redis
   - Web Service (Django)
   - Worker (Celery)
5. Нажмите **"Apply"**

### Вариант B: Вручную (если Blueprint не работает)

#### 2.1 Создайте PostgreSQL:
1. Dashboard → **"New +"** → **"PostgreSQL"**
2. Name: `autoria-db`
3. Database: `autoria`
4. User: `autoria_user`
5. Region: **Frankfurt**
6. Plan: **Free**
7. Create Database
8. **Скопируйте Internal Database URL**

#### 2.2 Создайте Redis:
1. Dashboard → **"New +"** → **"Redis"**
2. Name: `autoria-redis`
3. Region: **Frankfurt**
4. Plan: **Free**
5. Create Redis
6. **Скопируйте Internal Redis URL**

#### 2.3 Создайте Web Service:
1. Dashboard → **"New +"** → **"Web Service"**
2. Connect repository: **VadimPonomarov/FINAL_DRF_NEXT_sept_2024**
3. Настройки:
   - **Name**: `autoria-backend`
   - **Region**: Frankfurt
   - **Branch**: master
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

---

## ШАГ 3: НАСТРОЙКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ В RENDER

В настройках Web Service → **Environment**:

```env
# Django Core
DEBUG=False
SECRET_KEY=django-insecure-CHANGE-THIS-TO-RANDOM-STRING
DJANGO_SETTINGS_MODULE=config.settings
ALLOWED_HOSTS=.onrender.com,.vercel.app

# Database (Internal URL из PostgreSQL)
DATABASE_URL=postgresql://autoria_user:password@dpg-xxx-a.frankfurt-postgres.render.com/autoria

# Redis (Internal URL из Redis)
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

**Нажмите "Save Changes"**

---

## ШАГ 4: ДОЖДИТЕСЬ ДЕПЛОЯ BACKEND

1. Render начнет сборку (5-10 минут)
2. Статус изменится на **"Live"**
3. **Скопируйте URL**: `https://autoria-backend-xxx.onrender.com`

---

## ШАГ 5: СОЗДАЙТЕ СУПЕРПОЛЬЗОВАТЕЛЯ

1. В Render Dashboard → ваш сервис
2. Перейдите в **"Shell"** (вкладка справа)
3. Выполните:
```bash
python manage.py createsuperuser
```
4. Введите:
   - Email: `admin@autoria.com`
   - Password: (ваш пароль)

---

## ШАГ 6: ДЕПЛОЙ FRONTEND НА VERCEL

### 1. Откройте Vercel:
👉 **https://vercel.com**

### 2. Нажмите "Sign Up" или "Login"
- Войдите через GitHub

### 3. Создайте новый проект:
1. Dashboard → **"Add New..."** → **"Project"**
2. Import Git Repository
3. Найдите: **VadimPonomarov/FINAL_DRF_NEXT_sept_2024**
4. Нажмите **"Import"**

### 4. Настройте проект:
- **Framework Preset**: Next.js (автоматически)
- **Root Directory**: `frontend` ⚠️ **ВАЖНО!**
- **Build Command**: `npm run build` (автоматически)
- **Output Directory**: `.next` (автоматически)
- **Install Command**: `npm install --legacy-peer-deps`

### 5. Добавьте Environment Variables:

Нажмите **"Environment Variables"** и добавьте (для **Production**):

```env
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=bXL+w0/zn9FX477unDrwiDMw8Tn4uC2Jv5fK3pL9mN6qR8sT1vW4xY7zA0bC
NEXT_PUBLIC_BACKEND_URL=https://autoria-backend-xxx.onrender.com
BACKEND_URL=https://autoria-backend-xxx.onrender.com
REDIS_URL=redis://red-xxx-a.frankfurt-redis.render.com:6379
GOOGLE_CLIENT_ID=317007351021-lhq7qt2ppsnihugttrs2f81nmvjbi0vr.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret-here
NEXT_PUBLIC_GOOGLE_CLIENT_ID=317007351021-lhq7qt2ppsnihugttrs2f81nmvjbi0vr.apps.googleusercontent.com
NODE_ENV=production
NEXT_PUBLIC_IS_DOCKER=false
IS_DOCKER=false
NEXT_TELEMETRY_DISABLED=1
```

⚠️ **Замените**:
- `https://autoria-backend-xxx.onrender.com` → ваш реальный Render URL
- `redis://red-xxx...` → ваш реальный Redis URL из Render

### 6. Нажмите **"Deploy"**

Vercel начнет сборку (2-3 минуты)

### 7. После деплоя:
**Скопируйте URL**: `https://your-app-xxx.vercel.app`

---

## ШАГ 7: ОБНОВИТЕ ПЕРЕМЕННЫЕ

### В Render:
1. Backend Service → **Environment**
2. Найдите `CORS_ALLOWED_ORIGINS`
3. Замените на реальный Vercel URL:
   ```
   CORS_ALLOWED_ORIGINS=https://your-app-xxx.vercel.app
   ```
4. **Save Changes**
5. Render автоматически передеплоит

### В Vercel:
1. Project Settings → **Environment Variables**
2. Найдите `NEXTAUTH_URL`
3. Замените на реальный Vercel URL:
   ```
   NEXTAUTH_URL=https://your-app-xxx.vercel.app
   ```
4. Найдите `NEXT_PUBLIC_BACKEND_URL`
5. Замените на реальный Render URL:
   ```
   NEXT_PUBLIC_BACKEND_URL=https://autoria-backend-xxx.onrender.com
   ```
6. **Save**
7. Перейдите в **Deployments**
8. Нажмите **"..."** → **"Redeploy"**

---

## ШАГ 8: ПРОВЕРКА РАБОТОСПОСОБНОСТИ

### Автоматическая проверка:

Откройте PowerShell и выполните:

```powershell
cd D:\myDocuments\studying\Projects\FINAL_DRF_NEXT_sept_2024

.\CHECK_RENDER_DEPLOYMENT.ps1 `
  -BackendUrl "https://autoria-backend-xxx.onrender.com" `
  -FrontendUrl "https://your-app-xxx.vercel.app"
```

**Замените URL на ваши реальные!**

### Ручная проверка:

#### Backend:
- ✅ Health: `https://autoria-backend-xxx.onrender.com/health`
- ✅ Admin: `https://autoria-backend-xxx.onrender.com/admin`
- ✅ API: `https://autoria-backend-xxx.onrender.com/api/`

#### Frontend:
- ✅ Homepage: `https://your-app-xxx.vercel.app`
- ✅ Login: `https://your-app-xxx.vercel.app/login`
- ✅ Ads: `https://your-app-xxx.vercel.app/autoria/ads`

---

## ШАГ 9: PAGESPEED INSIGHTS

Запустите тестирование:

```powershell
.\test-pagespeed.ps1 -FrontendUrl "https://your-app-xxx.vercel.app"
```

Или вручную откройте:
- https://pagespeed.web.dev/analysis?url=https://your-app-xxx.vercel.app

**Цель**: все страницы > 90 (зеленая зона)

---

## 📊 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:

```
====================================
📋 Итоговый Отчет
====================================

Backend (Render):
  Health Endpoint: ✅ OK
  Admin Panel: ✅ OK
  API Root: ✅ OK
  API Docs: ✅ OK

Frontend (Vercel):
  Homepage: ✅ OK
  Login Page: ✅ OK
  Ads Listing: ✅ OK

API Proxy (Rewrites):
  API через Proxy: ✅ OK

Результат: 9/9 проверок пройдено

🎉 Деплой успешен!

PageSpeed Insights:
  Homepage: 95/100 ✅
  Ads Listing: 93/100 ✅
  Login: 96/100 ✅
```

---

## ✅ ЧЕКЛИСТ:

- [ ] Зарегистрировался на Render
- [ ] Подключил GitHub репозиторий
- [ ] Создал PostgreSQL (1 GB)
- [ ] Создал Redis
- [ ] Создал Web Service (Django)
- [ ] Настроил переменные окружения
- [ ] Backend задеплоен (статус Live)
- [ ] Скопировал Backend URL
- [ ] Создал суперпользователя
- [ ] Зарегистрировался на Vercel
- [ ] Импортировал репозиторий
- [ ] Настроил Root Directory: frontend
- [ ] Добавил все переменные окружения
- [ ] Frontend задеплоен (статус Ready)
- [ ] Скопировал Frontend URL
- [ ] Обновил CORS в Render
- [ ] Обновил переменные в Vercel
- [ ] Передеплоил Vercel
- [ ] Запустил скрипт проверки
- [ ] Все проверки прошли ✅
- [ ] PageSpeed все страницы > 90 ✅

---

## 🆘 TROUBLESHOOTING:

### Render Blueprint не работает:
**Решение**: Используйте ручное создание сервисов (Вариант B)

### Backend долго отвечает:
**Причина**: Auto-sleep (первый запрос 30-60 сек)
**Решение**: Подождите, backend "просыпается"

### CORS ошибки:
**Причина**: Неверный URL в CORS_ALLOWED_ORIGINS
**Решение**: Используйте точный Vercel URL без trailing slash

### Vercel Build Failed:
**Причина**: Root Directory не указана
**Решение**: Убедитесь что Root Directory = `frontend`

### Database connection error:
**Причина**: Используется External URL вместо Internal
**Решение**: Используйте Internal Database URL из Render

---

## 💰 СТОИМОСТЬ:

**$0 / месяц** (полностью бесплатно!)

- Render: 750 часов/месяц
- PostgreSQL: 1 GB
- Redis: бесплатно
- Vercel: 100 GB bandwidth
- SSL: автоматически

---

**НАЧНИТЕ С ШАГА 1! Откройте https://render.com и войдите через GitHub!** 🚀
