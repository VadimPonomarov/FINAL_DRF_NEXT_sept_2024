# 📦 Інструкція з налаштування змінних оточення

## 🎯 Централізована архітектура

Проект використовує **повністю централізовану архітектуру** змінних оточення з єдиною папкою `env-config/` для забезпечення:
- ✅ Єдиного джерела істини для всіх змінних
- ✅ Безпечного зберігання секретів
- ✅ Підтримки Docker та локального запуску
- ✅ Простоти підтримки та масштабування
- ✅ DRY принципу - кожна змінна визначена тільки в одному місці

## 📁 Структура змінних оточення

```
env-config/                    # ВСІ змінні оточення в одній папці
├── .env.base                  # Базові змінні + всі сервіс-специфічні
├── .env.secrets               # Секрети (НЕ коммітяться в git)
├── .env.docker                # Переопределения для Docker среды
├── .env.local                 # Переопределения для локальной разработки
└── load-env.py                # Загрузчик окружения для тестирования
```

**Важливо:** Всі локальні `.env` файли в папках сервісів видалені! Тепер все централізовано в `env-config/`.

## 🚀 Швидке налаштування

### 1. Перевірка файлів
Всі необхідні файли вже створені в `env-config/`:
- ✅ `.env.base` - базові змінні (вже налаштовано)
- ✅ `.env.secrets` - секрети (перевірте значення)
- ✅ `.env.docker` - Docker переопределения (вже налаштовано)
- ✅ `.env.local` - локальні переопределения (вже налаштовано)

### 2. Налаштування секретів
Перевірте та за потреби оновіть `env-config/.env.secrets`:

```bash
# Обов'язкові секрети для роботи:
POSTGRES_PASSWORD=password                    # Пароль PostgreSQL
SECRET_KEY=django-insecure-your-secret-key... # Django secret key
NEXTAUTH_SECRET=bXL+w0/zn9FX477unDrwiDMw...   # NextAuth secret

# Google OAuth (незашифровані для простоти):
GOOGLE_CLIENT_ID=317007351021-lhq7qt2ppsnihugttrs2f81nmvjbi0vr...
GOOGLE_CLIENT_SECRET=GOCSPX-test_secret_key_for_development
GOOGLE_API_KEY=test_google_api_key_for_development

# Опціональні (для email):
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password

# Примітка: Зашифровані версії (ENCRYPTED_*) залишені для сумісності,
# але використовуються незашифровані версії для простоти розробки
```

### 3. Готово!
Система вже налаштована та готова до роботи. Локальні перевизначення в `.env.local` та Docker налаштування в `.env.docker` вже оптимізовані.

## 📋 Детальний опис файлів

### 🔧 env-config/.env.base
**Призначення:** Базові змінні + всі сервіс-специфічні змінні
**Коммітиться:** ✅ Так (публічні дані)

Містить всі змінні в логічних розділах:
- **Основні налаштування проекту** (назва, версія, compose project)
- **Мережеві налаштування** (PostgreSQL, Redis, RabbitMQ хости/порти)
- **URL сервісів** (внутрішні Docker URL та публічні browser URL)
- **NextAuth налаштування** (URL для аутентифікації)
- **Celery налаштування** (result backend)
- **Django специфічні** (порт, settings, медіа, кеш, сесії, безпека)
- **Frontend специфічні** (Next.js порт, build ID, telemetry)
- **Celery специфічні** (worker concurrency, prefetch, beat schedule)

### 🔐 env-config/.env.secrets
**Призначення:** Секретні дані
**Коммітиться:** ❌ НІ (додано в .gitignore)

Містить секрети в логічних групах:
- **Основні секрети системи** (Django SECRET_KEY, JWT secret, NextAuth secret)
- **Паролі баз даних** (PostgreSQL, RabbitMQ паролі)
- **OAuth секрети** (Google Client ID/Secret)
- **API ключі** (Google API, Google Maps, Tavily AI)
- **Email секрети** (SMTP username/password)

### 🐳 env-config/.env.docker
**Призначення:** Переопределения для Docker среды
**Коммітиться:** ✅ Так

Містить тільки переопределения для Docker:
- `IS_DOCKER=true` / `NEXT_PUBLIC_IS_DOCKER=true`
- `DJANGO_ENV=production`
- CORS налаштування для Docker контейнерів
- Redis URL для фронтенда (внутрішні Docker URL)

### 🏠 env-config/.env.local
**Призначення:** Переопределения для локальної розробки
**Коммітиться:** ✅ Так

Містить тільки переопределения для локального запуску:
- `IS_DOCKER=false` / `NEXT_PUBLIC_IS_DOCKER=false`
- `DJANGO_ENV=development`
- Локальні хости (`localhost` замість `redis`, `pg`, `rabbitmq`)
- DEBUG режими та детальне логування

## ⚙️ Порядок завантаження змінних

### 🐳 Docker Compose
Використовується YAML anchor для всіх сервісів:

```yaml
# Централізований блок файлів окружения
x-env-files: &env-files
  - ./env-config/.env.base       # 1. Базові + всі сервіс-специфічні
  - ./env-config/.env.secrets    # 2. Секрети
  - ./env-config/.env.docker     # 3. Docker переопределения

services:
  app:
    env_file: *env-files         # Одна строка для всех сервисов!

  frontend:
    env_file: *env-files

  # ... всі інші сервіси використовують той же блок
```

### 💻 Локальна розробка

#### 🐍 Python сервіси (Django/Celery)
Для локального запуску використовуйте `.env.local` замість `.env.docker`:

```python
# Python (Django/Celery)
from dotenv import load_dotenv
load_dotenv("env-config/.env.base")      # Базові змінні
load_dotenv("env-config/.env.secrets")   # Секрети
load_dotenv("env-config/.env.local")     # Локальні переопределения
```

#### ⚛️ Next.js Frontend
Next.js має власну систему завантаження `.env` файлів, але для інтеграції з централізованою архітектурою використовується програмна загрузка в `next.config.js`.

**Підхід:** Програмна загрузка переменних з `env-config/` в `frontend/next.config.js`

```javascript
// frontend/next.config.js
// Загрузка переменных среды из централизованной env-config/ директории
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Функция для загрузки .env файла
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};

  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#') && line.includes('=')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=');
      env[key.trim()] = value.trim();
    }
  });

  return env;
}

// Загружаем переменные из env-config/ в правильном порядке
const envConfigDir = path.resolve(__dirname, '../env-config');
const baseEnv = loadEnvFile(path.join(envConfigDir, '.env.base'));
const secretsEnv = loadEnvFile(path.join(envConfigDir, '.env.secrets'));
const localEnv = loadEnvFile(path.join(envConfigDir, '.env.local'));

// Объединяем переменные (поздние перезаписывают ранние)
const allEnv = { ...baseEnv, ...secretsEnv, ...localEnv };

// Устанавливаем переменные в process.env
Object.entries(allEnv).forEach(([key, value]) => {
  if (!process.env[key]) {
    process.env[key] = value;
  }
});

console.log('🔧 Loaded environment variables from env-config/');
```

**Переваги цього підходу:**
- ✅ **Повне дотримання DRY** - змінні визначені тільки в `env-config/`
- ✅ **Централізована архітектура** - жодного дублювання
- ✅ **Автоматична загрузка** - Next.js завантажує при старті
- ✅ **Правильний порядок** - base → secrets → local
- ✅ **Немає локальних .env файлів** в `frontend/` директорії
- ✅ **Автоматична розшифровка** - зашифровані змінні (`ENCRYPTED_*`) автоматично розшифровуються

**Обробка зашифрованих змінних:**
Frontend автоматично розшифровує `ENCRYPTED_GOOGLE_CLIENT_SECRET` та інші зашифровані змінні через `cryptoUtils.ts`.

### 🧪 Тестування конфігурації
Використовуйте `load-env.py` для перевірки:

```bash
cd env-config
python load-env.py
```

### 🔄 Автоматична синхронізація
Frontend автоматично завантажує всі змінні з `env-config/` при кожному запуску через `next.config.js`.

**Жодної ручної синхронізації не потрібно:**
- ✅ Зміни в `env-config/.env.base` → автоматично доступні у frontend
- ✅ Зміни в `env-config/.env.secrets` → автоматично доступні у frontend
- ✅ Зміни в `env-config/.env.local` → автоматично доступні у frontend
- ✅ Перезапуск `npm run dev` завантажує нові значення

## 🔐 Безпека

### ⚠️ Критично важливо:
1. **НЕ коммітити** `env-config/.env.secrets` в git
2. **Файл вже додано** в `.gitignore`
3. **Використовувати** сильні паролі та ключі
4. **Регулярно ротувати** секрети в продакшені

### ✅ Файли в git:
- ✅ `env-config/.env.base` - базові + всі сервіс-специфічні змінні
- ✅ `env-config/.env.docker` - Docker переопределения
- ✅ `env-config/.env.local` - локальні переопределения
- ✅ `env-config/load-env.py` - тестування конфігурації
- ✅ `frontend/next.config.js` - програмна загрузка з env-config/

### ❌ НЕ в git:
- ❌ `env-config/.env.secrets` - секретні дані

### 🚫 Файли, які НЕ повинні існувати:
- ❌ `frontend/.env.local` - видалено (порушував DRY принцип)
- ❌ `frontend/.env.docker` - видалено (дублював env-config/.env.docker)
- ❌ `backend/.env*` - видалено (використовує env-config/ через load_dotenv)

### 📝 Примітка про архітектуру:
**Повна централізація:** Всі змінні оточення визначені **тільки** в `env-config/` директорії.
Frontend завантажує їх програмно через `next.config.js`, backend - через `load_dotenv()`.

### ❌ Файли НЕ в git:
- ❌ `.env/.env.secrets` - реальні секрети

## 🧪 Перевірка конфігурації

### Перевірка завантаження змінних:
```bash
# Перевірити конфігурацію Docker Compose
docker-compose config

# Перевірити змінні в контейнері
docker-compose exec app env | grep POSTGRES
docker-compose exec app env | grep SECRET_KEY
```

### Перевірка секретів:
```bash
# Переконатися, що секрети завантажені
docker-compose exec app printenv | grep -E "(PASSWORD|SECRET|KEY)" | head -5
```

## 🔧 Додавання нового сервіса

1. **Створити папку сервіса:**
   ```bash
   mkdir new-service
   ```

2. **Створити .env файл сервіса:**
   ```bash
   touch new-service/.env
   ```

3. **Додати тільки специфічні змінні:**
   ```bash
   # new-service/.env
   NEW_SERVICE_PORT=9000
   NEW_SERVICE_SPECIFIC_CONFIG=value
   ```

4. **Оновити docker-compose.yml:**
   ```yaml
   new-service:
     env_file:
       - ./.env/.env.base
       - ./.env/.env.secrets
       - ./.env/.env.local
       - ./new-service/.env
   ```

## 🎯 Переваги нової архітектури

✅ **DRY принцип** - кожна змінна визначена тільки в одному місці
✅ **Безпека** - секрети централізовані та не коммітяться
✅ **Масштабованість** - легко додавати нові сервіси
✅ **Гнучкість** - підтримка Docker та локальної розробки
✅ **Прозорість** - ясно, де яка змінна визначена

## 🚨 Усунення неполадок

### Змінна не знайдена:
1. Перевірити `.env/.env.base` - загальні змінні
2. Перевірити `.env/.env.secrets` - секретні змінні
3. Перевірити `service/.env` - специфічні змінні
4. Перевірити порядок завантаження в docker-compose.yml

### Конфлікт змінних:
- Змінні з пізніших файлів перекривають попередні
- Порядок: base → secrets → local → service-specific

### Секрети не завантажуються:
1. Переконатися, що `.env/.env.secrets` існує
2. Перевірити права доступу до файлу
3. Переконатися, що файл вказаний в docker-compose.yml

### Проблеми з Docker Compose:
```bash
# Перевірити синтаксис конфігурації
docker-compose config

# Перевірити, які змінні завантажені
docker-compose exec app env | head -20

# Перезапустити з новими змінними
docker-compose down && docker-compose up -d
```

Ця архітектура забезпечує **максимальну безпеку**, **простоту управління** та **легке масштабування**! 🎯
