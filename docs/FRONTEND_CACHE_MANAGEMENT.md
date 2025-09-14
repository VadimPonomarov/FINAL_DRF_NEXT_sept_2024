# Frontend Cache Management

## Обзор

Система автоматического управления кэшем фронтенда предотвращает проблемы с неполными или поврежденными билдами Next.js в Docker контейнерах.

## Стратегии кэширования

### 1. Auto (Рекомендуется)
```bash
FRONTEND_CACHE_STRATEGY=auto
```
- **Поведение**: Очищает кэш только при обнаружении поврежденного билда
- **Преимущества**: Быстрый запуск при корректном билде
- **Использование**: Для разработки и продакшена

### 2. Always (Безопасный режим)
```bash
FRONTEND_CACHE_STRATEGY=always
```
- **Поведение**: Всегда очищает кэш при запуске контейнера
- **Преимущества**: Гарантированно чистое состояние
- **Недостатки**: Медленнее запуск
- **Использование**: При частых проблемах с кэшем

## Автоматическая диагностика

Система автоматически проверяет:

1. **Наличие .next папки**
2. **Наличие критических файлов**:
   - `.next/BUILD_ID`
   - `.next/package.json`
3. **Количество файлов в билде** (минимум 5)

## Настройка через переменные окружения

### В docker-compose.yml
```yaml
environment:
  FRONTEND_CACHE_STRATEGY: auto  # или always
```

### В .env файле
```bash
FRONTEND_CACHE_STRATEGY=auto
```

### Через командную строку
```bash
FRONTEND_CACHE_STRATEGY=always docker-compose up frontend
```

## Логи и диагностика

### Успешный запуск (auto режим)
```
🚀 Starting Next.js application...
🔄 Cache strategy: auto
🔍 Auto cache strategy - will clean only if build is corrupted
✅ Found pre-built .next folder - checking integrity...
✅ Build integrity verified
🎯 Starting production server with verified build...
```

### Обнаружение поврежденного билда
```
🚀 Starting Next.js application...
🔄 Cache strategy: auto
⚠️ Incomplete build detected - missing essential files
❌ Pre-built .next folder is corrupted - will rebuild
🧹 Cleaning Next.js cache and build artifacts...
🔧 Building Next.js application from scratch...
```

### Always режим
```
🚀 Starting Next.js application...
🔄 Cache strategy: always
🧹 Always clean cache strategy - performing startup cleanup...
🧹 Cleaning Next.js cache and build artifacts...
```

## Решение проблем

### Проблема: Контейнер не запускается
**Решение**: Установите `FRONTEND_CACHE_STRATEGY=always`

### Проблема: Медленный запуск
**Решение**: Используйте `FRONTEND_CACHE_STRATEGY=auto` и убедитесь, что билд корректный

### Проблема: Ошибки сборки
**Решение**: 
1. Очистите локальный билд: `rm -rf frontend/.next`
2. Пересоберите: `cd frontend && npm run build`
3. Перезапустите контейнер

## Интеграция с деплоем

Система интегрирована с скриптом деплоя:
- Автоматическое восстановление при проблемах
- Ручная очистка кэша через меню
- Мониторинг состояния билда

## Рекомендации

1. **Для разработки**: `FRONTEND_CACHE_STRATEGY=auto`
2. **Для продакшена**: `FRONTEND_CACHE_STRATEGY=auto` с предварительным билдом
3. **При проблемах**: `FRONTEND_CACHE_STRATEGY=always` временно
4. **CI/CD**: Всегда используйте чистый билд

## Файлы конфигурации

- `frontend/start.sh` - Основной скрипт запуска
- `frontend/start-optimized.sh` - Оптимизированный скрипт
- `docker-compose.yml` - Конфигурация контейнера
- `.env` - Переменные окружения
