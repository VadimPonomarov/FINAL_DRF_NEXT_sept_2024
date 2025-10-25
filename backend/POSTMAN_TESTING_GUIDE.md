# 🧪 Руководство по тестированию AutoRia API через Postman

## 📋 Содержание

1. [Быстрый старт](#-быстрый-старт)
2. [Доступные коллекции](#-доступные-коллекции)
3. [Автоматическая инициализация](#-автоматическая-инициализация)
4. [Запуск через Newman](#-запуск-через-newman)
5. [Структура коллекций](#-структура-коллекций)
6. [Отладка и решение проблем](#-отладка-и-решение-проблем)

## 🚀 Быстрый старт

### Требования

- **Backend запущен** на `http://localhost:8000` в DEBUG режиме
- **Newman** установлен: `npm install -g newman`
- **Postman** (опционально, для визуального тестирования)

### Шаг 1: Создайте тестового суперпользователя

```bash
# Из директории backend
python ensure_test_superuser.py
```

Это создаст/обновит пользователя `pvs.versia@gmail.com` с правами superuser.

### Шаг 2: Запуск всех тестов

```bash
# Из директории backend
newman run AutoRia_API_Complete_Test_Suite.postman_collection.json \
    -e AutoRia_API_Complete_Test_Suite.postman_environment.json
```

### Запуск конкретной коллекции

```bash
# Core API (32 запроса)
newman run AutoRia_API_Core.postman_collection.json \
    -e AutoRia_API_Complete_Test_Suite.postman_environment.json

# Currency API (7 запросов)
newman run AutoRia_API_Currency.postman_collection.json \
    -e AutoRia_API_Complete_Test_Suite.postman_environment.json

# Moderation API (5 запросов)
newman run AutoRia_API_Moderation.postman_collection.json \
    -e AutoRia_API_Complete_Test_Suite.postman_environment.json

# Full Swagger (197 эндпоинтов)
newman run AutoRia_Complete_197_Endpoints_FULL_SWAGGER.postman_collection.json \
    -e AutoRia_API_Complete_Test_Suite.postman_environment.json \
    --timeout-request 30000
```

## 📦 Доступные коллекции

| Коллекция | Файл | Запросов | Описание |
|-----------|------|----------|----------|
| **Complete Test Suite** | `AutoRia_API_Complete_Test_Suite.postman_collection.json` | 94 | Полный набор тестов всех основных функций |
| **Core API** | `AutoRia_API_Core.postman_collection.json` | 32 | Базовые операции: auth, users, accounts, ads, references |
| **Currency API** | `AutoRia_API_Currency.postman_collection.json` | 7 | Конвертация валют и курсы |
| **Moderation API** | `AutoRia_API_Moderation.postman_collection.json` | 5 | Контент-модерация и цензура |
| **Full Swagger** | `AutoRia_Complete_197_Endpoints_FULL_SWAGGER.postman_collection.json` | 197 | Все эндпоинты из Swagger документации |

## 🤖 Автоматическая инициализация

### Как это работает

Все коллекции **полностью самодостаточны** и не требуют ручной настройки:

1. **Pre-request Scripts на уровне коллекции** автоматически:
   - Создают/обновляют тестового суперпользователя через `/api/users/test/ensure-superuser/`
   - Логинятся под разными пользователями (regular, admin, superuser)
   - Сохраняют токены в переменных окружения

2. **Test Scripts** на уровне запроса проверяют:
   - Статус-коды ответов
   - Структуру данных
   - Бизнес-логику

3. **Динамические переменные** (`{{base_url}}`, `{{admin_access_token}}`) подставляются автоматически

### Тестовые учетные данные

Создаются автоматически при первом запуске:

| Роль | Email | Пароль |
|------|-------|--------|
| **Superuser/Admin** | `pvs.versia@gmail.com` | `12345678` |
| **Regular User** | `test.user@example.com` | `12345678` |
| **Seller** | `seller1@gmail.com` | `12345678` |

### Используемые Backend Endpoints

#### Проверка текущего пользователя

```http
GET {{base_url}}/api/users/profile/
Authorization: Bearer {{access_token}}
```

Response:
```json
{
    "id": 2,
    "email": "pvs.versia@gmail.com",
    "is_staff": true,
    "is_superuser": true,
    "profile": {
        "name": "",
        "surname": "",
        "age": null,
        "avatar": null
    }
}
```

#### Создание суперпользователя

Используйте Django management command перед запуском тестов:

```bash
cd backend
python manage.py shell -c "
from apps.users.models import UserModel;
user, created = UserModel.objects.get_or_create(
    email='pvs.versia@gmail.com',
    defaults={'is_staff': True, 'is_superuser': True, 'is_active': True}
);
user.set_password('12345678');
user.is_staff = True;
user.is_superuser = True;
user.is_active = True;
user.save();
print(f'Superuser {\"created\" if created else \"updated\"}: {user.email}')
"
```

## 🏃 Запуск через Newman

### Базовые команды

```bash
# С дефолтным таймаутом
newman run <collection>.postman_collection.json \
    -e AutoRia_API_Complete_Test_Suite.postman_environment.json

# С увеличенным таймаутом (для медленных эндпоинтов)
newman run <collection>.postman_collection.json \
    -e AutoRia_API_Complete_Test_Suite.postman_environment.json \
    --timeout-request 30000

# С отчетом в HTML
newman run <collection>.postman_collection.json \
    -e AutoRia_API_Complete_Test_Suite.postman_environment.json \
    --reporters cli,html \
    --reporter-html-export ./test-results.html

# С JSON отчетом
newman run <collection>.postman_collection.json \
    -e AutoRia_API_Complete_Test_Suite.postman_environment.json \
    --reporters cli,json \
    --reporter-json-export ./test-results.json
```

### Параметры Newman

| Параметр | Описание | Пример |
|----------|----------|--------|
| `--timeout-request` | Максимальное время ожидания ответа (мс) | `30000` (30 сек) |
| `--delay-request` | Задержка между запросами (мс) | `100` |
| `--bail` | Остановка при первой ошибке | `--bail` |
| `--folder` | Запуск только определенной папки | `--folder "Authentication"` |
| `--reporters` | Форматы отчетов | `cli,html,json` |
| `--color` | Цветной вывод | `on` или `off` |

## 📊 Структура коллекций

### Collection Pre-request Script

```javascript
// Автоматический логин админа/суперпользователя
pm.sendRequest({
    url: pm.environment.get('base_url') + '/api/auth/login',
    method: 'POST',
    header: {'Content-Type': 'application/json'},
    body: {
        mode: 'raw',
        raw: JSON.stringify({
            email: pm.environment.get('admin_user_email'),
            password: pm.environment.get('admin_user_password')
        })
    }
}, function(err, res) {
    if (!err && res.code === 200) {
        const jsonData = res.json();
        pm.environment.set('admin_access_token', jsonData.access);
        pm.environment.set('admin_refresh_token', jsonData.refresh);
        console.log('✅ Admin logged in');
        
        // Проверяем права пользователя
        pm.sendRequest({
            url: pm.environment.get('base_url') + '/api/users/profile/',
            method: 'GET',
            header: {
                'Authorization': `Bearer ${jsonData.access}`
            }
        }, function(err, res) {
            if (!err && res.code === 200) {
                const user = res.json();
                console.log(`👤 User: ${user.email}`);
                console.log(`👑 Superuser: ${user.is_superuser}`);
                console.log(`🔧 Staff: ${user.is_staff}`);
            }
        });
    }
});
```

### Request Pre-request Script

```javascript
// Использование сохраненного токена
const adminToken = pm.environment.get('admin_access_token');
if (adminToken) {
    pm.request.headers.add({
        key: 'Authorization',
        value: `Bearer ${adminToken}`
    });
}
```

### Test Script

```javascript
// Проверка статуса
pm.test("✅ Request successful", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 201]);
});

// Проверка структуры
pm.test("✅ Response structure valid", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('id');
    pm.expect(jsonData).to.have.property('email');
});

// Сохранение переменной
pm.test("✅ Save user ID", function () {
    const jsonData = pm.response.json();
    pm.environment.set('created_user_id', jsonData.id);
});
```

## 🔍 Отладка и решение проблем

### Проверка backend

```bash
curl http://localhost:8000/health
```

Expected:
```json
{
    "status": "healthy",
    "timestamp": "2025-01-01T12:00:00Z"
}
```

### Проверка DEBUG режима

Backend должен быть запущен с `DEBUG=True` в настройках, иначе тестовые endpoints не будут доступны.

### Проверка создания суперпользователя

```bash
curl -X POST http://localhost:8000/api/users/test/ensure-superuser/ \
    -H "Content-Type: application/json" \
    -d '{"email":"pvs.versia@gmail.com","password":"12345678"}'
```

### Частые ошибки

#### 403 Forbidden на админских эндпоинтах

**Причина:** Не создан суперпользователь или токен не сохранен

**Решение:**
1. Проверьте Pre-request Script коллекции
2. Убедитесь, что `admin_access_token` установлен в environment
3. Запустите эндпоинт `/api/users/test/ensure-superuser/` вручную

#### 500 Internal Server Error

**Причина:** Проблема на backend или отсутствующие данные

**Решение:**
1. Проверьте логи Django: `backend/logs/django.log`
2. Проверьте консоль backend
3. Убедитесь, что база данных содержит необходимые reference данные

#### Timeout errors

**Причина:** Медленные endpoints (AI generation, bulk operations)

**Решение:**
```bash
newman run collection.json \
    -e environment.json \
    --timeout-request 60000  # Увеличьте до 60 секунд
```

#### 404 Not Found с переменными

**Причина:** Переменная не установлена (например, `{{ad_id}}`)

**Решение:**
1. Запустите предшествующие запросы, которые создают ресурс
2. Проверьте Test Scripts - они должны сохранять IDs
3. Используйте реальные значения вместо переменных

### Логирование

Включите детальное логирование в Newman:

```bash
newman run collection.json \
    -e environment.json \
    --verbose
```

В Postman Console (View > Show Postman Console) вы увидите:
- Pre-request script logs
- Request/Response details
- Test script logs
- Environment variables changes

## 📈 Интерпретация результатов

### Успешный запуск

```
AutoRia API - Complete Test Suite

✓ Health Check
✓ User Login
✓ Admin Login
✓ Create User
...

┌─────────────────────────┬────────────────────┬───────────────────┐
│                         │           executed │            failed │
├─────────────────────────┼────────────────────┼───────────────────┤
│              iterations │                  1 │                 0 │
├─────────────────────────┼────────────────────┼───────────────────┤
│                requests │                 94 │                 0 │
├─────────────────────────┼────────────────────┼───────────────────┤
│            test-scripts │                186 │                 0 │
├─────────────────────────┼────────────────────┼───────────────────┤
│              assertions │                226 │                 0 │
└─────────────────────────┴────────────────────┴───────────────────┘
```

### Частичные провалы

```
   #  failure        detail
                                                                                
 1.  AssertionErr…  ✅ User created successfully
                    expected 403 to equal 201
                    at assertion:0 in test-script
                    inside "Create User"
```

**Анализ:** 
- Assertion № 0 провалился
- Ожидался код 201, получен 403
- Проблема с правами доступа

### Критические ошибки

```
newman

AutoRia API - Complete Test Suite

✗ Health Check
  ECONNREFUSED: Connection refused

→ User Login
  SKIPPED
```

**Причина:** Backend не запущен или не доступен на указанном URL

## 🎯 Best Practices

1. **Всегда запускайте Complete Test Suite** перед коммитом изменений
2. **Проверяйте конкретные коллекции** при разработке новых фич
3. **Используйте `--bail`** для быстрой проверки на ошибки
4. **Генерируйте HTML отчеты** для документирования результатов
5. **Запускайте тесты в CI/CD** для непрерывной интеграции

## 📝 Добавление новых тестов

### Шаг 1: Создайте запрос в Postman

1. Добавьте новый request в соответствующую папку
2. Настройте Pre-request Script (если нужна auth)
3. Добавьте Test Script для проверки ответа

### Шаг 2: Используйте переменные

```javascript
// URL
{{base_url}}/api/ads/cars/{{ad_id}}

// Headers
Authorization: Bearer {{admin_access_token}}

// Body
{
    "title": "{{$randomProductName}}",
    "price": {{$randomInt}}
}
```

### Шаг 3: Добавьте tests

```javascript
pm.test("✅ Request successful", () => {
    pm.response.to.have.status(200);
});

pm.test("✅ Response has data", () => {
    const json = pm.response.json();
    pm.expect(json).to.have.property('id');
});
```

### Шаг 4: Экспортируйте коллекцию

1. File > Export
2. Collection v2.1 (recommended)
3. Сохраните в `backend/`

## 🔗 Полезные ссылки

- [Newman Documentation](https://learning.postman.com/docs/running-collections/using-newman-cli/command-line-integration-with-newman/)
- [Postman Learning Center](https://learning.postman.com/)
- [Chai Assertion Library](https://www.chaijs.com/api/bdd/)
- [pm.* API Reference](https://learning.postman.com/docs/writing-scripts/script-references/postman-sandbox-api-reference/)

---

**Версия:** 1.0
**Последнее обновление:** 2025-01-24

