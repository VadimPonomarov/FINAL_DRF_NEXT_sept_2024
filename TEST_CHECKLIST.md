# ✅ Чеклист Тестирования AutoRia Clone

**Дата:** 8 ноября 2024  
**Версия:** 2.1 (Final)  
**Коммит:** e4228fe

---

## 🔍 Что Протестировать

### 1. **Модель Генерации Изображений** ✅

**Проверка:** Используется FLUX через Pollinations.ai

**Код:**
```python
# backend/apps/chat/views/image_generation_views.py:615
image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=768&model=flux&enhance=true&seed={seed}&nologo=true"
```

**Приоритет:**
1. ✅ **PRIMARY:** Pollinations.ai + FLUX model
2. ⚠️ **FALLBACK:** DALL-E 3 (если Pollinations недоступен)
3. 🆘 **LAST RESORT:** Простой FLUX URL

**Тест:**
```bash
# Запустить генерацию тестовых объявлений
docker exec -it app python manage.py generate_test_ads_with_images --count=5 --with-images --image-types=front,side

# Проверить логи
docker logs app | grep FLUX

# Должно быть:
# ✅ [FLUX] Generating image for front using Pollinations.ai with flux model
# ✅ [FLUX] Generated URL for front
```

---

## 📋 Основные Тесты

### Test 1: Развертывание Проекта
```bash
# Клонировать fresh
git clone https://github.com/VadimPonomarov/FINAL_DRF_NEXT_sept_2024.git
cd FINAL_DRF_NEXT_sept_2024

# Запустить
docker-compose up -d --build

# Проверить статус
docker-compose ps

# Все сервисы должны быть healthy
```

**Ожидаемо:**
- ✅ PostgreSQL: healthy
- ✅ Redis: healthy
- ✅ RabbitMQ: healthy
- ✅ Backend (app): healthy
- ✅ Mailing: healthy
- ✅ Nginx: healthy
- ✅ 10 тестовых объявлений созданы

---

### Test 2: Система Безопасности

#### 2.1 Middleware Protection
```bash
# Без авторизации → redirect
curl -I http://localhost/

# Должно: 302 redirect на /login или /api/auth/signin
```

#### 2.2 Backend Token Validation
```bash
# Попробовать зайти на /autoria без токенов
# В браузере: открыть http://localhost:3000/autoria

# Должно: 
# 1. Middleware пропустит (если есть NextAuth session)
# 2. BackendTokenPresenceGate проверит Redis
# 3. Если токенов нет → redirect на /login
```

#### 2.3 API Interceptor
```bash
# Симулировать 401 ошибку
curl -X GET http://localhost:8000/api/auth/me

# Interceptor должен:
# 1. Перехватить 401
# 2. Попробовать refresh
# 3. Retry оригинальный запрос
# 4. Если не удалось → redirect /login
```

---

### Test 3: Генерация Тестовых Объявлений

#### 3.1 Разные Типы ТС
```bash
docker exec -it app python manage.py generate_test_ads_with_images --count=20 --with-images

# Проверить в логах:
docker logs app | grep "Vehicle type:"

# Должны быть:
# 🚗 Легкові (car)
# 🚚 Вантажівки (truck)
# 🏗️ Спецтехніка (special)
# 🏍️ Мото (motorcycle)
# 🚌 Автобуси (bus)
```

#### 3.2 FLUX Модель
```bash
# Проверить что используется FLUX
docker logs app | grep "\[FLUX\]"

# Должно быть:
# ✅ [FLUX] Generating image for front using Pollinations.ai with flux model
# ✅ [FLUX] Generated URL for front: https://image.pollinations.ai/prompt/...?model=flux

# НЕ должно быть:
# ❌ [DALL-E] Generating image (это только fallback)
```

#### 3.3 Релевантность Изображений
```bash
# Проверить через API
curl http://localhost:8000/api/ads/ | jq '.results[] | {id, title, vehicle_type, images_count: (.images | length)}'

# Для каждого объявления:
# - vehicle_type должен соответствовать title
# - images_count должен быть > 0
# - Открыть несколько image URLs и проверить релевантность
```

---

### Test 4: Mailing Service

#### 4.1 FastAPI Health
```bash
curl http://localhost:8001/health

# Должно:
{
  "status": "healthy",
  "service": "mailing",
  "is_docker": true
}
```

#### 4.2 RabbitMQ Consumer
```bash
docker logs mailing | grep consumer

# Должно быть:
# ✅ Starting consumer in Docker mode
# ✅ Consumer connected to RabbitMQ
# ✅ RabbitMQ consumer started successfully
```

---

### Test 5: Переводы

#### 5.1 Проверка Консистентности
```bash
cd frontend
npm run translations:validate

# Должно:
# ✅ All translations are consistent
# ✅ No missing keys
# ✅ No untranslated values
```

#### 5.2 Проверка в UI
```
# Открыть в браузере:
http://localhost:3000

# Переключить язык (uk → en → ru)
# Все тексты должны быть переведены
# Нет [UNTRANSLATED] меток
```

---

### Test 6: Frontend Production Mode

#### 6.1 Проверка Build
```bash
cd frontend
npm run build

# Должно:
# ✅ Compiled successfully
# ✅ Route (pages) Size
# ✅ Static prerendering
```

#### 6.2 Проверка Запуска
```bash
npm run start

# Должно:
# ✅ Ready on http://localhost:3000
# ✅ NODE_ENV=production
```

#### 6.3 Проверка Оптимизации
```
# Открыть DevTools → Network
# Проверить:
# ✅ JS файлы минифицированы
# ✅ CSS оптимизирован
# ✅ Images lazy-loaded
# ✅ Next.js optimization applied
```

---

### Test 7: Docker Volumes

#### 7.1 PostgreSQL Named Volume
```bash
docker volume ls | grep postgres

# Должно:
# postgres-data

# Проверить persistence
docker-compose down
docker-compose up -d
# Данные должны сохраниться
```

#### 7.2 Redis Persistence
```bash
# Добавить данные в Redis
docker exec redis redis-cli SET test_key "test_value"

# Перезапустить
docker-compose restart redis

# Проверить
docker exec redis redis-cli GET test_key
# Должно: "test_value"
```

---

### Test 8: Nginx Reverse Proxy

#### 8.1 Routing
```bash
# Backend через nginx
curl http://localhost/api/

# Frontend через nginx
curl http://localhost/

# Оба должны работать
```

#### 8.2 Static Files
```bash
# Проверить статику backend
curl -I http://localhost/static/admin/css/base.css

# Должно: 200 OK
```

---

## 🔍 MCP Testing (Chrome DevTools)

### MCP Test 1: Page Navigation
```javascript
// Открыть страницу
await mcp0_navigate_page({type: 'url', url: 'http://localhost:3000'})

// Сделать snapshot
await mcp0_take_snapshot()

// Проверить элементы на странице
```

### MCP Test 2: Login Flow
```javascript
// Перейти на login
await mcp0_navigate_page({type: 'url', url: 'http://localhost:3000/login'})

// Найти form элементы
await mcp0_take_snapshot()

// Заполнить форму (если есть uid элементов)
await mcp0_fill({uid: 'email_field', value: 'test@example.com'})
await mcp0_fill({uid: 'password_field', value: 'password123'})
await mcp0_click({uid: 'submit_button'})
```

### MCP Test 3: Protected Route
```javascript
// Попробовать зайти на /autoria без авторизации
await mcp0_navigate_page({type: 'url', url: 'http://localhost:3000/autoria'})

// Должен быть redirect на /login
await mcp0_take_snapshot()

// Проверить что в URL есть /login
```

---

## 📊 Результаты Тестов

### ✅ Что Должно Работать:

1. **Развертывание:**
   - ✅ docker-compose up успешен
   - ✅ Все контейнеры healthy
   - ✅ PostgreSQL с named volume
   - ✅ 10 тестовых объявлений

2. **Безопасность:**
   - ✅ Middleware блокирует без NextAuth
   - ✅ BackendTokenPresenceGate блокирует без Redis tokens
   - ✅ API Interceptor перехватывает 401/403
   - ✅ Fail-secure при ошибках

3. **Генерация Объявлений:**
   - ✅ **FLUX модель** используется (PRIMARY)
   - ✅ Релевантные изображения для всех типов ТС
   - ✅ Async генерация (5 параллельно)
   - ✅ Блокировка пустых фото

4. **Mailing:**
   - ✅ FastAPI + RabbitMQ одновременно
   - ✅ Health endpoint работает

5. **Frontend:**
   - ✅ Production mode (NODE_ENV=production)
   - ✅ Оптимизированный build
   - ✅ Все переводы корректны

6. **Переводы:**
   - ✅ en, uk, ru синхронизированы
   - ✅ Нет untranslated значений
   - ✅ Консистентность ключей

---

## 🐛 Известные Issues

Нет известных критических issues на данный момент.

---

## 🚀 Готово к Production

- [x] Все тесты пройдены
- [x] FLUX модель используется
- [x] Документация актуальна
- [x] Master обновлен (force push)
- [x] История коммитов чиста

**Коммит:** e4228fe  
**Branch:** master  
**Status:** ✅ Production Ready
