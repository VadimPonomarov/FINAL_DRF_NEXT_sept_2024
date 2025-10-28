# 🚀 Повне розгортання AutoRia Clone

## ✅ Виправлено проблему з завантаженням даних (2025-10-20)

**Проблема:** Оптимізована збірка Next.js з `output: 'standalone'` не забезпечувала завантаження даних при старті проекту.

**Рішення:** Використовується стандартна збірка Next.js (`npm run build` + `npm run start`) замість standalone output. Детальна інформація: `docs/FRONTEND_BUILD_FIX.md`

---

## 📋 Процес розгортання всього проекту

### 🎯 Варіанти розгортання
- Backend у Docker + Frontend локально (рекомендовано)
- Повний Docker (усі сервіси, включно з Frontend)

---

## ⬇️ Швидкий старт (для нових користувачів)

### 1. Клонування репозиторію
```bash
git clone https://github.com/VadimPonomarov/FINAL_DRF_NEXT_sept_2024.git
cd FINAL_DRF_NEXT_sept_2024
```

### 2. Виберіть спосіб розгортання (ОДИН з двох варіантів)

---

## 🎯 ВАРІАНТ A: Автоматичне розгортання через `deploy.py` (РЕКОМЕНДОВАНО)

```bash
# Windows
python deploy.py

# macOS/Linux
python3 deploy.py
```

**Що робить скрипт автоматично:**
1. ✅ Перевіряє системні вимоги (Python, Node.js, Docker)
2. ✅ Пропонує вибрати режим розгортання
3. ✅ Збирає всі Docker сервіси (backend, PostgreSQL, Redis, RabbitMQ, Celery, Nginx)
4. ✅ Збирає frontend в production режимі з правильними налаштуваннями
5. ✅ Запускає всі сервіси
6. ✅ Перевіряє готовність системи
7. ✅ Надає посилання для доступу

**Інтерактивні опції при запуску:**
- **Опція 0** (РЕКОМЕНДОВАНО): Backend в Docker + Frontend локально
- **Опція 00**: Всі сервіси в Docker

**Переваги автоматичного розгортання:**
- ✅ Найпростіший та найшвидший спосіб
- ✅ Автоматична перевірка всіх залежностей
- ✅ Правильні налаштування React 19 автоматично
- ✅ Перевірка готовності всіх сервісів
- ✅ Детальні повідомлення про прогрес

---

## 🔧 ВАРІАНТ B: Ручне розгортання (повний контроль)

**Якщо ви хочете повний контроль над процесом:**

```bash
# Крок 1: Запустіть всі Docker сервіси (backend + інфраструктура)
docker-compose up --build -d

# Крок 2: Перейдіть в папку frontend
cd frontend

# Крок 3: Встановіть залежності (⚠️ ОБОВ'ЯЗКОВО з --legacy-peer-deps!)
npm install --legacy-peer-deps

# Крок 4: Зберіть frontend в production режимі
npm run build

# Крок 5: Запустіть frontend
npm run start
```

> **⚠️ КРИТИЧНО ВАЖЛИВО**: 
> **ЗАВЖДИ** використовуйте `npm install --legacy-peer-deps`!
> 
> **Чому?** Проект використовує React 19 з налаштуваннями сумісності для бібліотек React 18.
> Без цього флагу встановлення завершиться з помилками конфліктів залежностей.
> 
> **Детальна інформація:**
> - `frontend/QUICK_FIX_REACT.md` - швидкі рішення при проблемах
> - `frontend/REACT_COMPATIBILITY.md` - повна документація

**Переваги ручного розгортання:**
- ✅ Повний контроль над кожним кроком
- ✅ Можливість налаштування перед запуском
- ✅ Легше діагностувати проблеми на кожному етапі
- ✅ Не потрібен Python для розгортання

**Доступ до сервісів після запуску:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000 або http://localhost/api/
- Django Admin: http://localhost:8000/admin
- API Docs (Swagger): http://localhost:8000/api/schema/swagger/
- RabbitMQ Management: http://localhost:15672
- Celery Flower: http://localhost:5555
- Redis Insight: http://localhost:5540

---



### 🧹 Повне очищення та пересбірка (ручні команди):
```bash
docker-compose down -v
docker image prune -f
docker volume prune -f
docker-compose up -d --build --force-recreate
```

<!-- Вилучено: опис перевірок неактуальних файлів -->

<!-- Вилучено: декоративні блоки очікування -->

---

## 🔍 Моніторинг і діагностика
```bash
docker-compose ps
docker-compose logs -f
```

## 🔧 Системні вимоги
- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- 8GB RAM (рекомендовано 16GB)
- SSD

## 🔍 Troubleshooting

### Frontend не завантажує дані
**Проблема:** Сторінки відображаються порожніми, API запити не працюють.

**Рішення:**
1. Перевірте, що використовується стандартна збірка (не standalone)
2. Пересоберіть frontend:
   ```bash
   cd frontend
   rm -rf .next node_modules
   npm install --legacy-peer-deps
   npm run build
   npm run start
   ```

### Порт 3000 зайнятий
```bash
# Windows
npx kill-port 3000

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### Backend не доступний
1. Перевірте статус: `docker-compose ps app`
2. Перевірте логи: `docker-compose logs -f app`
3. Перевірте environment variables у `frontend/.env.local`

## 📚 Додаткова документація
- **Frontend Build Fix**: `docs/FRONTEND_BUILD_FIX.md` - виправлення проблеми з завантаженням даних
- **Image Generation Fix**: `docs/IMAGE_GENERATION_FIX.md` - виправлення проблем з генерацією зображень
- **Authentication**: `docs/NEXTAUTH_SESSION_FIX.md` - налаштування NextAuth
- **CORS Errors**: `docs/CORS_ERRORS_FIX.md` - виправлення CORS помилок

## 📞 Підтримка
- Перевірте стан і логи: `docker-compose ps`, `docker-compose logs -f`
- Перезапуск проєкту: `python deploy.py` (рекомендовано режим `0`)
- Повна пересборка: `python deploy.py --mode full_rebuild`
- Контакти: pvs.versia@gmail.com
