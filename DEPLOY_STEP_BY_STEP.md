# 🚀 Пошаговый Деплой - Выполняйте по Порядку

## ⚠️ ВАЖНО: Откройте этот файл и следуйте инструкциям

---

## ЭТАП 1: Деплой Backend на Railway (10 минут)

### 1.1 Создайте аккаунт Railway

1. Откройте: https://railway.app
2. Нажмите **"Start a New Project"**
3. Войдите через GitHub
4. Разрешите доступ к репозиторию

### 1.2 Создайте новый проект

1. На главной странице Railway нажмите **"New Project"**
2. Выберите **"Deploy from GitHub repo"**
3. Найдите и выберите ваш репозиторий: `FINAL_DRF_NEXT_sept_2024`
4. Railway начнет автоматическое развертывание

### 1.3 Настройте Backend Service

1. После создания проекта, кликните на сервис
2. Перейдите в **Settings**:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python manage.py migrate && python manage.py collectstatic --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 4 --timeout 120`

3. Нажмите **"Save"**

### 1.4 Добавьте PostgreSQL

1. В проекте нажмите **"New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway автоматически создаст базу данных
3. Переменная `DATABASE_URL` будет автоматически добавлена

### 1.5 Добавьте Redis

1. Нажмите **"New"** → **"Database"** → **"Add Redis"**
2. Railway автоматически создаст Redis
3. Переменная `REDIS_URL` будет автоматически добавлена

### 1.6 Настройте Environment Variables

В настройках Backend сервиса, перейдите в **Variables** и добавьте:

```env
DEBUG=False
SECRET_KEY=django-insecure-your-secret-key-change-this-in-production-12345
DJANGO_SETTINGS_MODULE=config.settings
ALLOWED_HOSTS=.railway.app,.vercel.app
CORS_ALLOW_CREDENTIALS=True
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app

# Эти переменные Railway добавит автоматически:
# DATABASE_URL (от PostgreSQL)
# REDIS_URL (от Redis)

# Email (опционально)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True

# Media & Static
MEDIA_URL=/media/
STATIC_URL=/static/
MEDIA_ROOT=/app/media
STATIC_ROOT=/app/staticfiles
```

### 1.7 Разверните Backend

1. Railway автоматически начнет деплой после добавления переменных
2. Дождитесь завершения (статус: **"Success"**)
3. Скопируйте URL вашего backend: `https://your-backend.up.railway.app`

### 1.8 Выполните миграции (через Railway CLI)

Откройте PowerShell в папке проекта:

```powershell
cd D:\myDocuments\studying\Projects\FINAL_DRF_NEXT_sept_2024

# Войдите в Railway (откроется браузер)
railway login

# Подключитесь к проекту
railway link

# Выполните миграции
railway run python manage.py migrate

# Соберите статику
railway run python manage.py collectstatic --noinput

# Создайте суперпользователя
railway run python manage.py createsuperuser
```

**Сохраните данные суперпользователя:**
- Email: admin@autoria.com
- Password: (ваш пароль)

### 1.9 Проверьте Backend

Откройте в браузере:
- Health check: `https://your-backend.up.railway.app/health`
- Admin panel: `https://your-backend.up.railway.app/admin`
- API docs: `https://your-backend.up.railway.app/api/doc`

✅ **Backend готов!** Скопируйте URL для следующего этапа.

---

## ЭТАП 2: Деплой Frontend на Vercel (5 минут)

### 2.1 Подготовьте репозиторий

Убедитесь, что все изменения закоммичены:

```powershell
cd D:\myDocuments\studying\Projects\FINAL_DRF_NEXT_sept_2024

git add .
git commit -m "Prepare for production deployment"
git push origin main
```

### 2.2 Создайте проект на Vercel

1. Откройте: https://vercel.com
2. Нажмите **"Add New"** → **"Project"**
3. Импортируйте ваш GitHub репозиторий
4. Настройте проект:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install --legacy-peer-deps`

### 2.3 Настройте Environment Variables

В настройках проекта Vercel, перейдите в **Settings** → **Environment Variables**.

Добавьте следующие переменные для **Production**:

```env
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=bXL+w0/zn9FX477unDrwiDMw8Tn4uC2Jv5fK3pL9mN6qR8sT1vW4xY7zA0bC
NEXT_PUBLIC_BACKEND_URL=https://your-backend.up.railway.app
BACKEND_URL=https://your-backend.up.railway.app
NODE_ENV=production
NEXT_PUBLIC_IS_DOCKER=false
IS_DOCKER=false
NEXT_TELEMETRY_DISABLED=1

# Redis URL (скопируйте из Railway)
REDIS_URL=redis://default:password@containers-us-west-xxx.railway.app:6379

# Google OAuth
GOOGLE_CLIENT_ID=317007351021-lhq7qt2ppsnihugttrs2f81nmvjbi0vr.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret-here
NEXT_PUBLIC_GOOGLE_CLIENT_ID=317007351021-lhq7qt2ppsnihugttrs2f81nmvjbi0vr.apps.googleusercontent.com
```

⚠️ **ВАЖНО**: Замените:
- `https://your-app.vercel.app` на ваш реальный Vercel URL
- `https://your-backend.up.railway.app` на ваш реальный Railway URL
- Redis URL на реальный из Railway

### 2.4 Разверните Frontend

1. Нажмите **"Deploy"**
2. Vercel начнет сборку и деплой
3. Дождитесь завершения (статус: **"Ready"**)
4. Скопируйте URL: `https://your-app.vercel.app`

### 2.5 Обновите CORS в Backend

Вернитесь в Railway:
1. Откройте Backend сервис
2. Перейдите в **Variables**
3. Обновите `CORS_ALLOWED_ORIGINS`:
   ```
   CORS_ALLOWED_ORIGINS=https://your-actual-app.vercel.app
   ```
4. Railway автоматически передеплоит

✅ **Frontend готов!**

---

## ЭТАП 3: Проверка Работоспособности

### 3.1 Проверьте Backend

```powershell
# Health check
curl https://your-backend.up.railway.app/health

# Должен вернуть: {"status": "healthy"}
```

Откройте в браузере:
- ✅ Admin: `https://your-backend.up.railway.app/admin`
- ✅ API Docs: `https://your-backend.up.railway.app/api/doc`
- ✅ API Root: `https://your-backend.up.railway.app/api/`

### 3.2 Проверьте Frontend

Откройте: `https://your-app.vercel.app`

Проверьте:
- ✅ Главная страница загружается
- ✅ Нет ошибок в консоли браузера (F12)
- ✅ Стили применяются корректно
- ✅ Изображения загружаются

### 3.3 Проверьте Аутентификацию

1. Перейдите на страницу логина: `/login`
2. Войдите с данными суперпользователя
3. Проверьте:
   - ✅ Успешный вход
   - ✅ Редирект на главную
   - ✅ Отображается имя пользователя
   - ✅ Доступно меню профиля

### 3.4 Проверьте API Взаимодействие

1. Перейдите на страницу объявлений: `/autoria/ads`
2. Проверьте:
   - ✅ Список объявлений загружается
   - ✅ Изображения отображаются
   - ✅ Фильтры работают
   - ✅ Пагинация работает

### 3.5 Проверьте Создание Объявления

1. Перейдите: `/autoria/ads/create`
2. Заполните форму
3. Загрузите изображение
4. Создайте объявление
5. Проверьте:
   - ✅ Объявление создано
   - ✅ Изображение загружено
   - ✅ Редирект на страницу объявления
   - ✅ Данные отображаются корректно

### 3.6 Проверьте WebSocket (Chat)

1. Откройте чат (если есть)
2. Отправьте сообщение
3. Проверьте:
   - ✅ Сообщение отправлено
   - ✅ Сообщение получено
   - ✅ Real-time обновление работает

### 3.7 Проверьте Redis Кеширование

Откройте консоль браузера (F12) и проверьте Network tab:
- ✅ Повторные запросы быстрее
- ✅ Кешированные данные используются

---

## ЭТАП 4: PageSpeed Insights Тестирование

### 4.1 Запустите автоматическое тестирование

```powershell
cd D:\myDocuments\studying\Projects\FINAL_DRF_NEXT_sept_2024

.\test-pagespeed.ps1 -FrontendUrl "https://your-app.vercel.app"
```

### 4.2 Проверьте каждую страницу вручную

Откройте PageSpeed Insights для каждой страницы:

1. **Главная**: `https://pagespeed.web.dev/analysis?url=https://your-app.vercel.app`
2. **Объявления**: `https://pagespeed.web.dev/analysis?url=https://your-app.vercel.app/autoria/ads`
3. **Детали объявления**: `https://pagespeed.web.dev/analysis?url=https://your-app.vercel.app/autoria/ads/1`
4. **Профиль**: `https://pagespeed.web.dev/analysis?url=https://your-app.vercel.app/profile`
5. **Логин**: `https://pagespeed.web.dev/analysis?url=https://your-app.vercel.app/login`
6. **Регистрация**: `https://pagespeed.web.dev/analysis?url=https://your-app.vercel.app/register`

### 4.3 Целевые показатели (GREEN ZONE)

Каждая страница должна иметь:
- ✅ **Performance**: > 90
- ✅ **Accessibility**: > 90
- ✅ **Best Practices**: > 90
- ✅ **SEO**: > 90

### 4.4 Если есть проблемы

См. `PERFORMANCE_OPTIMIZATION.md` для решений:
- Оптимизация изображений
- Lazy loading компонентов
- Кеширование API
- Минификация CSS/JS

---

## ЭТАП 5: Финальная Проверка

### Чеклист Работоспособности

#### Backend
- [ ] Health endpoint отвечает
- [ ] Admin панель доступна
- [ ] API документация доступна
- [ ] База данных подключена
- [ ] Redis работает
- [ ] Миграции выполнены
- [ ] Статические файлы собраны
- [ ] CORS настроен правильно

#### Frontend
- [ ] Главная страница загружается
- [ ] Нет ошибок в консоли
- [ ] Стили применяются
- [ ] Изображения загружаются
- [ ] Навигация работает
- [ ] Формы работают

#### Аутентификация
- [ ] Регистрация работает
- [ ] Логин работает
- [ ] Logout работает
- [ ] Google OAuth работает (если настроен)
- [ ] Защищенные страницы недоступны без авторизации
- [ ] Токены обновляются автоматически

#### Функциональность
- [ ] Список объявлений загружается
- [ ] Детали объявления отображаются
- [ ] Создание объявления работает
- [ ] Редактирование объявления работает
- [ ] Удаление объявления работает
- [ ] Загрузка изображений работает
- [ ] Фильтры работают
- [ ] Поиск работает
- [ ] Пагинация работает

#### Performance
- [ ] Все страницы в зеленой зоне PageSpeed (90+)
- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1
- [ ] Изображения оптимизированы
- [ ] Шрифты загружаются быстро
- [ ] JavaScript bundle оптимизирован

---

## 🎉 Поздравляем! Деплой Завершен!

### Ваше приложение доступно по адресам:

- **Frontend**: https://your-app.vercel.app
- **Backend**: https://your-backend.up.railway.app
- **Admin**: https://your-backend.up.railway.app/admin
- **API Docs**: https://your-backend.up.railway.app/api/doc

### Следующие шаги:

1. **Мониторинг**:
   - Vercel Analytics: автоматически включен
   - Railway Metrics: доступен в дашборде

2. **Бэкапы**:
   - Railway автоматически создает бэкапы PostgreSQL
   - Настройте расписание в настройках

3. **Домен** (опционально):
   - Добавьте custom domain в Vercel
   - Добавьте custom domain в Railway

4. **SSL**:
   - Автоматически настроен на обеих платформах

5. **Мониторинг ошибок** (опционально):
   - Настройте Sentry для отслеживания ошибок

---

## 📊 Отчет о Деплое

Заполните после завершения:

```
Дата деплоя: _______________
Frontend URL: _______________
Backend URL: _______________

Backend Status: [ ] OK [ ] Issues
Frontend Status: [ ] OK [ ] Issues
Authentication: [ ] OK [ ] Issues
Database: [ ] OK [ ] Issues
Redis: [ ] OK [ ] Issues

PageSpeed Scores:
- Homepage: ___/100
- Ads List: ___/100
- Ad Details: ___/100
- Profile: ___/100
- Login: ___/100

Все в зеленой зоне (90+): [ ] Да [ ] Нет

Проблемы (если есть):
_________________________________
_________________________________
_________________________________
```

---

## 🆘 Troubleshooting

### Backend не отвечает
1. Проверьте логи в Railway
2. Проверьте переменные окружения
3. Проверьте подключение к БД
4. Перезапустите сервис

### Frontend показывает ошибки
1. Проверьте консоль браузера (F12)
2. Проверьте переменные в Vercel
3. Проверьте NEXTAUTH_SECRET
4. Проверьте CORS в backend

### CORS ошибки
1. Убедитесь что CORS_ALLOWED_ORIGINS содержит точный Vercel URL
2. Проверьте CORS_ALLOW_CREDENTIALS=True
3. Передеплойте backend

### Изображения не загружаются
1. Проверьте NEXT_PUBLIC_BACKEND_URL
2. Проверьте domains в next.config.js
3. Проверьте медиа файлы доступны на backend

---

**Время выполнения**: 15-20 минут  
**Стоимость**: $0 (бесплатные тарифы)  
**Результат**: Production-ready приложение с зелеными показателями PageSpeed!
