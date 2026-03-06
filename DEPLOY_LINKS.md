# 🚀 ПРЯМЫЕ ССЫЛКИ ДЛЯ ДЕПЛОЯ

## ✅ Коммит успешно запушен в GitHub!
Commit: `08c1f00` - "Add production deployment configurations for Render + Vercel with..."

---

## 1️⃣ ДЕПЛОЙ BACKEND НА RENDER

### Кликните по этой ссылке:
👉 **https://dashboard.render.com/blueprints**

### Или используйте прямую ссылку на ваш репозиторий:
👉 **https://dashboard.render.com/select-repo?type=blueprint**

### Что делать:
1. Войдите через GitHub
2. Выберите репозиторий: **VadimPonomarov/FINAL_DRF_NEXT_sept_2024**
3. Render обнаружит файл `render.yaml` и автоматически создаст:
   - ✅ PostgreSQL Database (1 GB)
   - ✅ Redis Cache
   - ✅ Django Web Service
   - ✅ Celery Worker
4. Нажмите **"Apply"**
5. Добавьте переменные окружения:
   ```
   SECRET_KEY=django-insecure-YOUR-RANDOM-SECRET-KEY-HERE
   ALLOWED_HOSTS=.onrender.com,.vercel.app
   CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
   ```

### После деплоя:
- Скопируйте Backend URL: `https://autoria-backend-xxx.onrender.com`
- Создайте суперпользователя в Shell:
  ```bash
  python manage.py createsuperuser
  ```

---

## 2️⃣ ДЕПЛОЙ FRONTEND НА VERCEL

### Кликните по этой ссылке:
👉 **https://vercel.com/new/VadimPonomarovs-projects/clone?repository-url=https://github.com/VadimPonomarov/FINAL_DRF_NEXT_sept_2024&root-directory=frontend**

### Что делать:
1. Войдите через GitHub
2. Vercel автоматически настроит:
   - Framework: Next.js
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Install Command: `npm install --legacy-peer-deps`
3. Добавьте Environment Variables (Production):

```env
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=bXL+w0/zn9FX477unDrwiDMw8Tn4uC2Jv5fK3pL9mN6qR8sT1vW4xY7zA0bC
NEXT_PUBLIC_BACKEND_URL=https://autoria-backend-xxx.onrender.com
BACKEND_URL=https://autoria-backend-xxx.onrender.com
REDIS_URL=redis://red-xxx.frankfurt-redis.render.com:6379
GOOGLE_CLIENT_ID=317007351021-lhq7qt2ppsnihugttrs2f81nmvjbi0vr.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
NEXT_PUBLIC_GOOGLE_CLIENT_ID=317007351021-lhq7qt2ppsnihugttrs2f81nmvjbi0vr.apps.googleusercontent.com
NODE_ENV=production
NEXT_PUBLIC_IS_DOCKER=false
IS_DOCKER=false
NEXT_TELEMETRY_DISABLED=1
```

4. Нажмите **"Deploy"**

### После деплоя:
- Скопируйте Frontend URL: `https://your-app-xxx.vercel.app`

---

## 3️⃣ ОБНОВИТЕ ПЕРЕМЕННЫЕ

### В Render:
1. Backend Service → Environment
2. Обновите `CORS_ALLOWED_ORIGINS` на реальный Vercel URL
3. Render автоматически передеплоит

### В Vercel:
1. Settings → Environment Variables
2. Обновите `NEXTAUTH_URL` на реальный Vercel URL
3. Обновите `NEXT_PUBLIC_BACKEND_URL` на реальный Render URL
4. Redeploy

---

## 4️⃣ ПРОВЕРКА

После получения обоих URL, выполните:

```powershell
cd D:\myDocuments\studying\Projects\FINAL_DRF_NEXT_sept_2024

.\CHECK_RENDER_DEPLOYMENT.ps1 `
  -BackendUrl "https://autoria-backend-xxx.onrender.com" `
  -FrontendUrl "https://your-app-xxx.vercel.app"
```

---

## 📊 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:

```
✅ Backend (Render):
   • Health endpoint работает
   • Admin panel доступна
   • API endpoints отвечают
   • PostgreSQL подключена
   • Redis работает

✅ Frontend (Vercel):
   • Homepage загружается
   • Login/Register работают
   • Ads listing отображается
   • API proxy работает

✅ Performance:
   • Все страницы > 90 PageSpeed
   • В зеленой зоне
```

---

**НАЧНИТЕ ДЕПЛОЙ ПРЯМО СЕЙЧАС! Кликните по ссылкам выше!** 🚀
