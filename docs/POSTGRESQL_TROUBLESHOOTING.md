# Вирішення проблем з PostgreSQL

## Проблема: Container pg is unhealthy

Ця помилка означає, що контейнер PostgreSQL не може стартувати або не проходить health check.

### Автоматичне вирішення

Скрипт `deploy.py` тепер автоматично:
- ✅ Перевіряє чи порт 5432 вільний
- ✅ Перевіряє доступність volume `pg/data`
- ✅ Виправляє проблеми з правами доступу
- ✅ Чекає 60 секунд на ініціалізацію PostgreSQL
- ✅ Надає детальні повідомлення про помилки

### Ручне вирішення

#### 1. Перевірте логи PostgreSQL

```bash
docker-compose logs pg
```

Шукайте помилки типу:
- `permission denied`
- `could not bind IPv4 address`
- `database system was not properly shut down`

#### 2. Перевірте чи порт 5432 вільний

**Windows:**
```powershell
netstat -ano | findstr :5432
```

**Linux/Mac:**
```bash
lsof -i :5432
```

Якщо порт зайнятий іншим процесом PostgreSQL:
```bash
# Знайдіть PID процесу і завершіть його
taskkill /PID <номер_процесу> /F  # Windows
kill -9 <номер_процесу>           # Linux/Mac
```

#### 3. Видаліть problematic volume

```bash
# Зупиніть всі контейнери
docker-compose down

# Видаліть volumes (⚠️ це видалить ВСІ дані!)
docker-compose down -v

# Або видаліть тільки PostgreSQL volume
docker volume rm final_drf_next_sept_2024_pg-data
```

#### 4. Видаліть папку pg/data вручну

**Windows:**
```powershell
# Зупиніть Docker Desktop
# Видаліть папку
Remove-Item -Recurse -Force .\pg\data
# Запустіть Docker Desktop
```

**Linux/Mac:**
```bash
sudo rm -rf ./pg/data
```

#### 5. Перевірте права доступу (Linux/Mac)

```bash
# Дайте права на запис
sudo chmod -R 777 ./pg/data

# Або змініть власника на поточного користувача
sudo chown -R $USER:$USER ./pg/data
```

#### 6. Збільште час очікування

Якщо PostgreSQL просто повільно стартує, відредагуйте `docker-compose.yml`:

```yaml
pg:
  healthcheck:
    start_period: 120s  # Збільште з 60s до 120s
    interval: 15s       # Збільште інтервал
    retries: 10         # Більше спроб
```

## Типові причини проблем

### 1. Порт зайнятий
- **Симптом**: `could not bind IPv4 address "0.0.0.0":5432`
- **Рішення**: Зупиніть інший процес PostgreSQL або змініть порт в docker-compose.yml

### 2. Проблеми з volume
- **Симптом**: `permission denied` в логах
- **Рішення**: Видаліть `pg/data` та дозвольте Docker створити його заново

### 3. Попереднє некоректне завершення
- **Симптом**: `database system was not properly shut down`
- **Рішення**: Видаліть `pg/data/postmaster.pid` або весь volume

### 4. Недостатньо ресурсів
- **Симптом**: PostgreSQL стартує дуже повільно
- **Рішення**: Збільште memory limit для Docker Desktop

### 5. Проблеми з Docker Desktop (Windows)
- **Симптом**: Контейнер постійно перезапускається
- **Рішення**: 
  - Перезапустіть Docker Desktop
  - Оновіть Docker Desktop до останньої версії
  - Очистіть Docker: Settings → Resources → Disk Image → Clean/Purge

## Повне очищення та пересборка

Якщо нічого не допомагає:

```bash
# 1. Зупиніть всі контейнери
docker-compose down -v

# 2. Видаліть всі образи проекту
docker images | grep final_drf_next | awk '{print $3}' | xargs docker rmi -f

# 3. Видаліть папку даних PostgreSQL
rm -rf pg/data  # Linux/Mac
Remove-Item -Recurse -Force .\pg\data  # Windows PowerShell

# 4. Очистіть Docker
docker system prune -a --volumes

# 5. Запустіть заново
python deploy.py
```

## Запобігання проблемам

### 1. Завжди коректно зупиняйте контейнери

```bash
# Правильно
docker-compose down

# НЕ робіть
docker-compose kill
```

### 2. Регулярно робіть backup бази даних

```bash
# Створення backup
docker-compose exec pg pg_dump -U postgres autoria_db > backup.sql

# Відновлення з backup
docker-compose exec -T pg psql -U postgres autoria_db < backup.sql
```

### 3. Моніторте health status

```bash
# Перевірка статусу
docker-compose ps

# Перевірка health check
docker inspect pg | grep -A 10 Health
```

## Налаштування в docker-compose.yml

Оптимальні налаштування healthcheck для PostgreSQL:

```yaml
pg:
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-autoria_db} || exit 1"]
    interval: 10s        # Перевіряти кожні 10 секунд
    timeout: 5s          # Таймаут для команди
    retries: 5           # 5 спроб перед помилкою
    start_period: 60s    # 60 секунд на ініціалізацію
```

## Підтримка

Якщо проблема не вирішується:
1. Збережіть логи: `docker-compose logs pg > pg_logs.txt`
2. Збережіть статус: `docker-compose ps > status.txt`
3. Збережіть інформацію про систему: `docker info > docker_info.txt`
4. Створіть issue на GitHub з цими файлами

