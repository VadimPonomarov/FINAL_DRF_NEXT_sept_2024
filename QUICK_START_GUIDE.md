# 🚀 Quick Start Scripts - Інструкція

## 📋 Що це?

**Quick Start скрипти** - це автоматизовані скрипти для запуску всього проекту **однією командою**.

```
quick-start.bat    →  Для Windows
quick-start.sh     →  Для Linux/Mac
```

Створені для реалізації концепції **"Out of the Box"** - проект запускається без додаткових налаштувань!

---

## 🎯 Навіщо потрібні?

### ❌ Без Quick Start (вручну):

```bash
# 1. Перевірити Docker
docker --version

# 2. Перевірити Docker Compose
docker-compose --version

# 3. Запустити backend
docker-compose up -d

# 4. Очікувати ініціалізації
# ... чекати 30 секунд ...

# 5. Відкрити frontend в новому терміналі
cd frontend
npm install
npm run dev

# 6. Згадати URLs та облікові дані
# ... пошук в документації ...

# 7. Перевірити логи
docker-compose logs -f
```

**Проблеми:**
- ⏱️ Багато кроків
- 🤔 Потрібно пам'ятати команди
- 📚 Потрібно читати документацію
- 🐛 Легко помилитися

### ✅ З Quick Start:

```bash
# Windows
quick-start.bat

# Linux/Mac
./quick-start.sh
```

**Переваги:**
- ⚡ Одна команда
- 🤖 Все автоматично
- 📊 Виводить всю потрібну інформацію
- ✅ Перевіряє залежності

---

## 🖥️ Для Windows: `quick-start.bat`

### Використання:

```cmd
# Спосіб 1: Подвійний клік
Подвійний клік на quick-start.bat в провіднику

# Спосіб 2: З командного рядка
cd D:\myDocuments\studying\Projects\FINAL_DRF_NEXT_sept_2024
quick-start.bat

# Спосіб 3: З PowerShell
cd D:\myDocuments\studying\Projects\FINAL_DRF_NEXT_sept_2024
.\quick-start.bat
```

### Що відбувається:

```
========================================
  AUTO RIA - QUICK START
========================================

[1/3] Проверка Docker...
✅ Docker установлен
✅ Docker Compose установлен

[2/3] Запуск backend сервисов (Docker)...
Creating network "final_drf_next_sept_2024_default" with the default driver
Creating pg ... done
Creating redis ... done
Creating rabbitmq ... done
Creating app ... done
Creating nginx ... done
Creating celery-worker ... done
Creating celery-beat ... done
Creating flower ... done
Creating mailing ... done

✅ Backend сервисы запущены!

[3/3] Ожидание инициализации БД (30 сек)...

========================================
  ✅ ПРОЕКТ ЗАПУЩЕН!
========================================

🌐 Frontend: http://localhost:3000
🔧 Backend API: http://localhost:8000
📚 API Docs: http://localhost:8000/swagger/
🔴 Redis: localhost:6379
🐘 PostgreSQL: localhost:5432

🎓 ТЕСТОВЫЕ УЧЕТНЫЕ ДАННЫЕ:
   Email: admin@autoria.com
   Password: 12345678
   Role: Superuser

   Email: seller1@gmail.com
   Password: 12345678
   Role: Seller

========================================
  Для остановки нажмите Ctrl+C
========================================

[Дополнительно] Запуск frontend...
Запуск Next.js dev server...

Логи Docker контейнеров:
app-1  | ✅ Database is available!
app-1  | 🔄 Running database migrations...
app-1  | 🌱 Seeding database (forced)...
app-1  | ✅ Created superuser: admin@autoria.com
app-1  | ✅ Created test users
app-1  | 🎉 Application setup complete!
```

---

## 🐧 Для Linux/Mac: `quick-start.sh`

### Використання:

```bash
# 1. Зробити виконуваним (тільки перший раз)
chmod +x quick-start.sh

# 2. Запустити
./quick-start.sh
```

### Що відбувається:

Аналогічно Windows версії, але з Linux/Mac синтаксисом.

---

## 🔍 Детальний розбір

### Крок 1: Перевірка Docker

```batch
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker не установлен!
    echo https://www.docker.com/products/docker-desktop/
    exit /b 1
)
```

**Що робить:**
- Перевіряє чи встановлений Docker
- Якщо ні → виводить посилання для завантаження
- Зупиняє скрипт, якщо Docker відсутній

### Крок 2: Запуск Backend (Docker)

```batch
docker-compose up -d
```

**Що робить:**
- Запускає ВСІ backend сервіси:
  - PostgreSQL (БД)
  - Redis (кеш + sessions)
  - RabbitMQ (черги)
  - Django Backend (API)
  - Nginx (reverse proxy)
  - Celery Worker (асинхронні задачі)
  - Celery Beat (планувальник)
  - Flower (моніторинг Celery)
  - Mailing Service

**Автоматично:**
- ✅ Запускає міграції БД
- ✅ Створює тестових користувачів
- ✅ Наповнює БД даними (brands, models, regions)
- ✅ Створює 10-20 тестових оголошень

### Крок 3: Очікування ініціалізації

```batch
timeout /t 30 /nobreak >nul
```

**Що робить:**
- Очікує 30 секунд для ініціалізації БД
- Дозволяє Django завершити міграції та seeding

### Крок 4: Запуск Frontend (опціонально)

```batch
where node >nul 2>&1
if %errorlevel% equ 0 (
    cd frontend
    if not exist "node_modules" (
        call npm install
    )
    start cmd /k "npm run dev"
)
```

**Що робить:**
- Перевіряє чи встановлений Node.js
- Якщо ні → виводить інструкцію
- Якщо так → запускає Next.js dev server
- Автоматично встановлює залежності (`npm install`) при потребі

### Крок 5: Виведення інформації

```batch
echo 🌐 Frontend: http://localhost:3000
echo 🔧 Backend API: http://localhost:8000
echo 📚 API Docs: http://localhost:8000/swagger/
echo 🎓 ТЕСТОВЫЕ УЧЕТНЫЕ ДАННЫЕ:
echo    Email: admin@autoria.com
echo    Password: 12345678
```

**Що робить:**
- Виводить усі посилання для доступу
- Виводить тестові облікові дані
- Показує інформацію про сервіси

### Крок 6: Моніторинг логів

```batch
docker-compose logs -f
```

**Що робить:**
- Показує логи всіх Docker контейнерів в реальному часі
- Можна побачити що відбувається з backend
- Ctrl+C для виходу

---

## ⏱️ Скільки часу займає?

### Перший запуск (пуста БД):

```
Перевірка Docker:           5 сек
Запуск контейнерів:         30 сек
Ініціалізація БД:           30 сек
Міграції:                   10 сек
Seeding (наповнення БД):    40 сек
Frontend (npm install):     60 сек (якщо Node.js встановлено)
────────────────────────────────────
Загалом:                    ~2-3 хвилини
```

### Повторний запуск (БД існує):

```
Перевірка Docker:           5 сек
Запуск контейнерів:         20 сек
Перевірка БД:              5 сек (пропускає seeding)
Frontend:                  10 сек (node_modules є)
────────────────────────────────────
Загалом:                   ~40 секунд
```

---

## 🎓 Для навчання

### Сценарій: Новий студент отримав проект

**Традиційний підхід (без quick-start):**
```
1. Клонує репозиторій                     (2 хв)
2. Читає README.md                         (10 хв)
3. Читає SETUP.md                          (15 хв)
4. Встановлює Docker                       (20 хв, якщо не було)
5. Створює .env файли вручну               (10 хв)
6. Запускає docker-compose                 (2 хв)
7. Запускає міграції вручну                (2 хв)
8. Створює superuser вручну                (3 хв)
9. Шукає як запустити frontend             (5 хв)
10. Запускає frontend                      (5 хв)
11. Шукає тестові облікові дані            (5 хв)
──────────────────────────────────────────────
Загалом: ~79 хвилин + можливі помилки
```

**З quick-start:**
```
1. Клонує репозиторій                     (2 хв)
2. Запускає quick-start.bat               (2 хв)
3. Проект працює!
──────────────────────────────────────────────
Загалом: ~4 хвилини
```

**Економія часу: ~75 хвилин = 95% швидше! 🚀**

---

## 🛠️ Налаштування

### Змінити час очікування:

```batch
REM Windows (quick-start.bat)
timeout /t 30 /nobreak >nul    ← Змінити 30 на інше значення

# Linux/Mac (quick-start.sh)
sleep 30                       ← Змінити 30 на інше значення
```

### Вимкнути автозапуск frontend:

Видалити або закоментувати секцію:

```batch
REM Запуск frontend (если Node.js установлен)
REM where node >nul 2>&1
REM ...
```

### Додати додаткові перевірки:

```batch
REM Перевірка вільного місця
REM Перевірка портів (8000, 3000, 5432, тощо)
REM Перевірка version Docker (мінімальна версія)
```

---

## ❓ FAQ

### Q: Чи обов'язково використовувати quick-start?

**A:** Ні! Це опціональний зручний інструмент. Можна запустити вручну:
```bash
docker-compose up -d
cd frontend && npm run dev
```

### Q: Що робити якщо Docker не встановлено?

**A:** Скрипт видасть помилку та посилання:
```
❌ Docker не установлен!
Пожалуйста, установите Docker Desktop:
https://www.docker.com/products/docker-desktop/
```

### Q: Чи працює це на Mac з Apple Silicon (M1/M2)?

**A:** Так! Docker Desktop для Mac підтримує ARM архітектуру.

### Q: Чи можна запустити тільки backend без frontend?

**A:** Так! Якщо Node.js не встановлено, запуститься тільки backend.
Або можна закоментувати секцію frontend в скрипті.

### Q: Що робити при помилці "Port already in use"?

**A:** Зупинити інші процеси на портах:
```bash
# Перевірити зайняті порти
docker-compose ps
netstat -ano | findstr ":8000"
netstat -ano | findstr ":3000"

# Зупинити старі контейнери
docker-compose down
```

### Q: Чи можна налаштувати під свій проект?

**A:** Так! Скрипти можна змінювати:
- Змінити назву проекту
- Додати додаткові сервіси
- Змінити порти
- Додати перевірки

---

## ✅ Переваги Quick Start

### Для студентів:
- ⚡ Швидкий старт навчання
- 📚 Не потрібно вивчати всю документацію спочатку
- 🎯 Фокус на коді, а не на налаштуваннях
- ✅ Гарантований робочий стан

### Для викладачів:
- 🎓 Студенти швидше починають роботу
- 📊 Однакове середовище для всіх
- 🐛 Менше питань про налаштування
- ⏱️ Більше часу на навчання, менше на setup

### Для проекту:
- 🚀 "Out of the box" experience
- 📦 Легке демонстрування
- 🔄 Швидке відновлення після проблем
- 🎯 Професійний вигляд

---

## 📊 Статистика використання

```bash
# Перевірити чи запущено проект
docker-compose ps

# Зупинити проект
docker-compose down

# Перезапустити проект
docker-compose restart

# Очистити все (включно з даними БД)
docker-compose down -v

# Повний перезапуск з очищенням
docker-compose down -v
./quick-start.bat  # або ./quick-start.sh
```

---

## 🎯 Висновок

**Quick Start скрипти** - це ключовий елемент концепції **"Out of the Box"**:

✅ Проект запускається **однією командою**  
✅ **Автоматична** перевірка залежностей  
✅ **Автоматичне** наповнення БД  
✅ **Готові** тестові облікові дані  
✅ **Миттєвий** старт роботи

**Результат:** Економія ~75 хвилин на першому запуску проекту! 🚀

---

**Версія:** 1.0  
**Дата:** 2025-10-25  
**Автор:** AI Assistant  
**Статус:** ✅ Працює і протестовано

