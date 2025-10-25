# 🧪 Керівництво з тестування AutoRia API через Postman

## 📋 Зміст

1. [Швидкий старт](#-швидкий-старт)
2. [Доступні колекції](#-доступні-колекції)
3. [Автоматична ініціалізація](#-автоматична-ініціалізація)
4. [Запуск через Newman](#-запуск-через-newman)
5. [Структура колекцій](#-структура-колекцій)
6. [Відладка та вирішення проблем](#-відладка-та-вирішення-проблем)

## 🚀 Швидкий старт

### Вимоги

- **Backend запущено** на `http://localhost:8000` в DEBUG режимі
- **Newman** встановлено: `npm install -g newman`
- **Postman** (опціонально, для візуального тестування)

### 📦 Канонічні колекції

| Колекція | Запитів | Використання |
|----------|---------|--------------|
| **Complete Test Suite** ⭐ | 94 | Повний набір тестів (рекомендується) |
| **Core API** | 32 | Основні API endpoints |
| **Currency API** | 7 | Валютні операції |
| **Moderation API** | 5 | Модерація контенту |
| **Full Swagger** | 197 | Всі endpoints з Swagger |

### Крок 1: Створіть тестового суперкористувача

```bash
# З директорії backend
python ensure_test_superuser.py
```

Це створить/оновить користувача `pvs.versia@gmail.com` з правами superuser.

### Крок 2: Запуск всіх тестів

```bash
# З директорії backend
newman run AutoRia_API_Complete_Test_Suite.postman_collection.json \
    -e AutoRia_API_Complete_Test_Suite.postman_environment.json
```

### Запуск конкретної колекції

```bash
# Core API (32 запити)
newman run AutoRia_API_Core.postman_collection.json \
    -e AutoRia_API_Complete_Test_Suite.postman_environment.json

# Currency API (7 запитів)
newman run AutoRia_API_Currency.postman_collection.json \
    -e AutoRia_API_Complete_Test_Suite.postman_environment.json

# Moderation API (5 запитів)
newman run AutoRia_API_Moderation.postman_collection.json \
    -e AutoRia_API_Complete_Test_Suite.postman_environment.json

# Full Swagger (197 ендпоінтів)
newman run AutoRia_Complete_197_Endpoints_FULL_SWAGGER.postman_collection.json \
    -e AutoRia_API_Complete_Test_Suite.postman_environment.json \
    --timeout-request 30000
```

### Запуск конкретних груп (папок) всередині колекції

```bash
# Критичні endpoints
newman run AutoRia_API_Complete_Test_Suite.postman_collection.json \
    -e AutoRia_API_Complete_Test_Suite.postman_environment.json \
    --folder "📁 Essential Endpoints (11 requests)"

# Основні API
newman run AutoRia_API_Complete_Test_Suite.postman_collection.json \
    -e AutoRia_API_Complete_Test_Suite.postman_environment.json \
    --folder "📁 Core API (32 requests)"

# Адміністративні функції
newman run AutoRia_API_Complete_Test_Suite.postman_collection.json \
    -e AutoRia_API_Complete_Test_Suite.postman_environment.json \
    --folder "📁 Administration (13 requests)"

# AI сервіси
newman run AutoRia_API_Complete_Test_Suite.postman_collection.json \
    -e AutoRia_API_Complete_Test_Suite.postman_environment.json \
    --folder "📁 AI Services (9 requests)"
```

## 📦 Доступні колекції

| Колекція | Файл | Запитів | Опис |
|----------|------|---------|------|
| **Complete Test Suite** | `AutoRia_API_Complete_Test_Suite.postman_collection.json` | 94 | Повний набір тестів всіх основних функцій |
| **Core API** | `AutoRia_API_Core.postman_collection.json` | 32 | Базові операції: auth, users, accounts, ads, references |
| **Currency API** | `AutoRia_API_Currency.postman_collection.json` | 7 | Конвертація валют та курси |
| **Moderation API** | `AutoRia_API_Moderation.postman_collection.json` | 5 | Контент-модерація та цензура |
| **Full Swagger** | `AutoRia_Complete_197_Endpoints_FULL_SWAGGER.postman_collection.json` | 197 | Всі ендпоінти зі Swagger документації |

## 🤖 Автоматична ініціалізація

### Як це працює

Всі колекції **повністю самодостатні** і не потребують ручного налаштування:

1. **Pre-request Scripts на рівні колекції** автоматично:
   - Створюють/оновлюють тестового суперкористувача через `/api/users/test/ensure-superuser/`
   - Логінять під різними користувачами (regular, admin, superuser)
   - Зберігають токени в змінних оточення

2. **Test Scripts** на рівні запиту перевіряють:
   - Статус-коди відповідей
   - Структуру даних
   - Бізнес-логіку

3. **Динамічні змінні** (`{{base_url}}`, `{{admin_access_token}}`) підставляються автоматично

### Тестові облікові дані

Створюються автоматично при першому запуску:

| Роль | Email | Пароль |
|------|-------|--------|
| **Superuser/Admin** | `pvs.versia@gmail.com` | `12345678` |
| **Regular User** | `test.user@example.com` | `12345678` |
| **Seller** | `seller1@gmail.com` | `12345678` |

### Використовувані Backend Endpoints

#### Перевірка поточного користувача

```http
GET {{base_url}}/api/users/profile/
Authorization: Bearer {{access_token}}
```

Відповідь:
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

#### Створення суперкористувача

Використовуйте Django management command перед запуском тестів:

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

### Базові команди

```bash
# З дефолтним таймаутом
newman run <collection>.postman_collection.json \
    -e AutoRia_API_Complete_Test_Suite.postman_environment.json

# З збільшеним таймаутом (для повільних ендпоінтів)
newman run <collection>.postman_collection.json \
    -e AutoRia_API_Complete_Test_Suite.postman_environment.json \
    --timeout-request 30000

# З звітом в HTML
newman run <collection>.postman_collection.json \
    -e AutoRia_API_Complete_Test_Suite.postman_environment.json \
    --reporters cli,html \
    --reporter-html-export ./test-results.html

# З JSON звітом
newman run <collection>.postman_collection.json \
    -e AutoRia_API_Complete_Test_Suite.postman_environment.json \
    --reporters cli,json \
    --reporter-json-export ./test-results.json
```

### Параметри Newman

| Параметр | Опис | Приклад |
|----------|------|---------|
| `--timeout-request` | Максимальний час очікування відповіді (мс) | `30000` (30 сек) |
| `--delay-request` | Затримка між запитами (мс) | `100` |
| `--bail` | Зупинка при першій помилці | `--bail` |
| `--folder` | Запуск тільки певної папки | `--folder "Authentication"` |
| `--reporters` | Формати звітів | `cli,html,json` |
| `--color` | Кольоровий вивід | `on` або `off` |

## 📊 Структура колекцій

### Collection Pre-request Script

```javascript
// Автоматичний логін адміна/суперкористувача
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
        
        // Перевіряємо права користувача
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
// Використання збереженого токена
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
// Перевірка статусу
pm.test("✅ Запит успішний", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 201]);
});

// Перевірка структури
pm.test("✅ Структура відповіді валідна", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('id');
    pm.expect(jsonData).to.have.property('email');
});

// Збереження змінної
pm.test("✅ Збереження ID користувача", function () {
    const jsonData = pm.response.json();
    pm.environment.set('created_user_id', jsonData.id);
});
```

## 🔍 Відладка та вирішення проблем

### Перевірка backend

```bash
curl http://localhost:8000/health
```

Очікується:
```json
{
    "status": "healthy",
    "timestamp": "2025-01-01T12:00:00Z"
}
```

### Перевірка DEBUG режиму

Backend повинен бути запущений з `DEBUG=True` в налаштуваннях, інакше тестові endpoints не будуть доступні.

### Перевірка створення суперкористувача

```bash
curl -X POST http://localhost:8000/api/users/test/ensure-superuser/ \
    -H "Content-Type: application/json" \
    -d '{"email":"pvs.versia@gmail.com","password":"12345678"}'
```

### Часті помилки

#### 403 Forbidden на адмінських ендпоінтах

**Причина:** Не створено суперкористувача або токен не збережено

**Рішення:**
1. Перевірте Pre-request Script колекції
2. Переконайтеся, що `admin_access_token` встановлено в environment
3. Запустіть ендпоінт `/api/users/test/ensure-superuser/` вручну

#### 500 Internal Server Error

**Причина:** Проблема на backend або відсутні дані

**Рішення:**
1. Перевірте логи Django: `backend/logs/django.log`
2. Перевірте консоль backend
3. Переконайтеся, що база даних містить необхідні reference дані

#### Timeout errors

**Причина:** Повільні endpoints (AI generation, bulk operations)

**Рішення:**
```bash
newman run collection.json \
    -e environment.json \
    --timeout-request 60000  # Збільште до 60 секунд
```

#### 404 Not Found зі змінними

**Причина:** Змінна не встановлена (наприклад, `{{ad_id}}`)

**Рішення:**
1. Запустіть попередні запити, які створюють ресурс
2. Перевірте Test Scripts - вони повинні зберігати IDs
3. Використовуйте реальні значення замість змінних

### Логування

Увімкніть детальне логування в Newman:

```bash
newman run collection.json \
    -e environment.json \
    --verbose
```

В Postman Console (View > Show Postman Console) ви побачите:
- Pre-request script logs
- Request/Response details
- Test script logs
- Environment variables changes

## 📈 Інтерпретація результатів

### Успішний запуск

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

### Часткові провали

```
   #  failure        detail
                                                                                
 1.  AssertionErr…  ✅ Користувач створений успішно
                    expected 403 to equal 201
                    at assertion:0 in test-script
                    inside "Create User"
```

**Аналіз:** 
- Assertion № 0 провалився
- Очікувався код 201, отримано 403
- Проблема з правами доступу

### Критичні помилки

```
newman

AutoRia API - Complete Test Suite

✗ Health Check
  ECONNREFUSED: Connection refused

→ User Login
  SKIPPED
```

**Причина:** Backend не запущено або не доступний на вказаному URL

## 🎯 Best Practices

1. **Завжди запускайте Complete Test Suite** перед комітом змін
2. **Перевіряйте конкретні колекції** при розробці нових фіч
3. **Використовуйте `--bail`** для швидкої перевірки на помилки
4. **Генеруйте HTML звіти** для документування результатів
5. **Запускайте тести в CI/CD** для безперервної інтеграції

## 📝 Додавання нових тестів

### Крок 1: Створіть запит в Postman

1. Додайте новий request в відповідну папку
2. Налаштуйте Pre-request Script (якщо потрібна auth)
3. Додайте Test Script для перевірки відповіді

### Крок 2: Використовуйте змінні

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

### Крок 3: Додайте tests

```javascript
pm.test("✅ Запит успішний", () => {
    pm.response.to.have.status(200);
});

pm.test("✅ Відповідь має дані", () => {
    const json = pm.response.json();
    pm.expect(json).to.have.property('id');
});
```

### Крок 4: Експортуйте колекцію

1. File > Export
2. Collection v2.1 (recommended)
3. Збережіть в `backend/`

## 🔗 Корисні посилання

- [Newman Documentation](https://learning.postman.com/docs/running-collections/using-newman-cli/command-line-integration-with-newman/)
- [Postman Learning Center](https://learning.postman.com/)
- [Chai Assertion Library](https://www.chaijs.com/api/bdd/)
- [pm.* API Reference](https://learning.postman.com/docs/writing-scripts/script-references/postman-sandbox-api-reference/)

---

## 📝 Історія змін

- **v1.1** (2025-01-25): Об'єднання з POSTMAN_USAGE_GUIDE, додана секція про запуск конкретних папок, переклад на українську
- **v1.0** (2025-01-24): Перша версія керівництва

**Версія:** 1.1  
**Останнє оновлення:** 2025-01-25
