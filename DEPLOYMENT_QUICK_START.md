# 🚀 Quick Start - Развертывание Проекта

## ⚡ Быстрый Запуск (1 команда)

```bash
docker-compose up -d --build
```

**Что произойдет автоматически:**
- ✅ PostgreSQL БД создастся с named volume
- ✅ Миграции применятся
- ✅ Справочные данные загрузятся (марки, модели, регионы)
- ✅ **Сгенерируется 10 тестовых объявлений** (если их меньше 10)
- ✅ Mailing запустит FastAPI + RabbitMQ consumer
- ✅ Backend будет доступен на http://localhost:8000
- ✅ Admin панель: http://localhost:8000/admin
- ✅ API Docs: http://localhost:8000/api/doc

---

## 📋 Что Было Исправлено

### 1. PostgreSQL Volume ✅
**Было:** `./pg/data` (локальная директория)  
**Стало:** `postgres-data` (named volume)

**Преимущество:** Данные не теряются при удалении `./pg/data`

### 2. Mailing Service ✅
**Запускает одновременно:**
- FastAPI сервер (порт 8001)
- RabbitMQ consumer (обработка email)

**Проверка:**
```bash
curl http://localhost:8001/health
# {"status":"healthy","service":"mailing"}
```

### 3. Автогенерация Объявлений ✅
**Логика:**
- Проверяет: `count(active ads) >= 10` ?
- Если НЕТ → генерирует 10 тестовых объявлений
- Если ДА → пропускает генерацию

**Типы объявлений:**
- 🚗 Легковые (BMW, Mercedes, Toyota)
- 🚚 Грузовики (Volvo, MAN, Scania)
- 🏗️ Спецтехника (Caterpillar, Komatsu)
- 🏍️ Мотоциклы (Harley, Yamaha)

---

## 🔍 Проверка После Запуска

### 1. Проверить контейнеры
```bash
docker-compose ps

# Должно быть все в статусе "running"
```

### 2. Проверить объявления
```bash
# Через API
curl http://localhost:8000/api/ads/ | jq '.count'
# Должно быть >= 10

# Через админку
# http://localhost:8000/admin
# Login: admin@autoria.com
# Password: (из .env.secrets)
```

### 3. Проверить mailing
```bash
docker logs mailing

# Должно быть:
# ✅ Starting consumer in Docker mode
# ✅ Consumer connected to RabbitMQ
```

---

## 🛠️ Полезные Команды

### Остановить проект
```bash
docker-compose down
```

### Остановить + удалить volumes
```bash
docker-compose down -v
```

### Пересборка
```bash
docker-compose up -d --build
```

### Логи
```bash
# Все сервисы
docker-compose logs -f

# Только backend
docker-compose logs -f app

# Только mailing
docker-compose logs -f mailing
```

### Перегенерировать объявления
```bash
# Зайти в контейнер
docker exec -it app bash

# Удалить текущие
python manage.py shell -c "from apps.ads.models import CarAd; CarAd.objects.all().delete()"

# Перезапустить контейнер (автогенерация сработает)
docker-compose restart app
```

---

## 📦 Backup/Restore PostgreSQL

### Backup
```bash
docker run --rm -v postgres-data:/data -v $(pwd):/backup \
  postgres:17-alpine tar czf /backup/postgres-backup.tar.gz /data
```

### Restore
```bash
docker run --rm -v postgres-data:/data -v $(pwd):/backup \
  postgres:17-alpine tar xzf /backup/postgres-backup.tar.gz -C /
```

---

## 🆘 Troubleshooting

### Проблема: PostgreSQL не запускается
```bash
# Проверить логи
docker logs pg

# Удалить volume и пересоздать
docker-compose down -v
docker-compose up -d
```

### Проблема: Нет тестовых объявлений
```bash
# Проверить логи app контейнера
docker logs app | grep "test ads"

# Должно быть:
# ✅ Test ads already exist (count >= 10)
# ИЛИ
# 🚀 Generating test ads (count < 10)...
# ✅ Test ads generated

# Если нет, вручную запустить:
docker exec -it app python manage.py generate_test_ads_with_images --count=10 --with-images
```

### Проблема: Mailing не запускается
```bash
# Проверить RabbitMQ
docker logs rabbitmq

# Проверить mailing
docker logs mailing

# Перезапустить mailing
docker-compose restart mailing
```

---

## 🎯 Что Дальше

1. **Frontend:** Раскомментировать секцию frontend в `docker-compose.yml`
2. **Production:** Настроить `.env.secrets` для production
3. **Nginx:** Настроить SSL и домены
4. **Мониторинг:** Настроить логирование и алерты

---

## 📚 Полная Документация

- **Детальные изменения:** `DEPLOYMENT_FIXES.md`
- **Генерация объявлений:** `backend/TEST_ADS_GENERATION_GUIDE.md`
- **Система безопасности:** `frontend/AUTH_SYSTEM_FINAL.md`
- **Переводы:** `docs/translations/README.md`

---

**Версия:** 2.1  
**Дата:** 8 ноября 2024  
**Статус:** ✅ Production Ready
