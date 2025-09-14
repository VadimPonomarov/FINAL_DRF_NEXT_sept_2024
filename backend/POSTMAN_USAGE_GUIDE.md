# 🚀 ПОСІБНИК З ВИКОРИСТАННЯ POSTMAN КОЛЕКЦІЙ AUTORIA

## 📋 КАНОНІЧНІ ФАЙЛИ

### 🎯 Головна колекція (рекомендується):
```bash
newman run AutoRia_API_Complete_Test_Suite.postman_collection.json -e AutoRia_API_Complete_Test_Suite.postman_environment.json
```

### 📚 Спеціалізовані колекції:
```bash
# Основні API ендпоінти
newman run AutoRia_API_Core.postman_collection.json -e AutoRia_API_Complete_Test_Suite.postman_environment.json

# Валютні операції
newman run AutoRia_API_Currency.postman_collection.json -e AutoRia_API_Complete_Test_Suite.postman_environment.json

# Процеси модерації
newman run AutoRia_API_Moderation.postman_collection.json -e AutoRia_API_Complete_Test_Suite.postman_environment.json
```

## 🎯 ТЕСТУВАННЯ КОНКРЕТНИХ ГРУП

### Критичні ендпоінти:
```bash
newman run AutoRia_API_Complete_Test_Suite.postman_collection.json -e AutoRia_API_Complete_Test_Suite.postman_environment.json --folder "📁 Essential Endpoints (11 requests)"
```

### Основні API:
```bash
newman run AutoRia_API_Complete_Test_Suite.postman_collection.json -e AutoRia_API_Complete_Test_Suite.postman_environment.json --folder "📁 Core API (32 requests)"
```

### Административные функции:
```bash
newman run AutoRia_API_Complete_Test_Suite.postman_collection.json -e AutoRia_API_Complete_Test_Suite.postman_environment.json --folder "📁 Administration (13 requests)"
```

### AI сервисы:
```bash
newman run AutoRia_API_Complete_Test_Suite.postman_collection.json -e AutoRia_API_Complete_Test_Suite.postman_environment.json --folder "📁 AI Services (9 requests)"
```

## 📊 ДОПОЛНИТЕЛЬНЫЕ ОПЦИИ

### С детальными отчетами:
```bash
newman run AutoRia_API_Complete_Test_Suite.postman_collection.json -e AutoRia_API_Complete_Test_Suite.postman_environment.json --reporters cli,json,html --reporter-html-export report.html
```

### С остановкой на первой ошибке:
```bash
newman run AutoRia_API_Complete_Test_Suite.postman_collection.json -e AutoRia_API_Complete_Test_Suite.postman_environment.json --bail
```

### С увеличенным таймаутом:
```bash
newman run AutoRia_API_Complete_Test_Suite.postman_collection.json -e AutoRia_API_Complete_Test_Suite.postman_environment.json --timeout-request 30000
```

## 🔧 НАСТРОЙКА ENVIRONMENT

Убедитесь что в environment файле настроены:
- `base_url` - URL вашего API сервера
- `admin_email` / `admin_password` - для админских тестов
- `user_email` / `user_password` - для пользовательских тестов

## 📦 АРХИВНЫЕ ФАЙЛЫ

Старые коллекции сохранены в `archive_old_collections/` и могут быть восстановлены при необходимости.

## 🎉 ГОТОВО К ИСПОЛЬЗОВАНИЮ!

Система канонизирована и готова к ежедневному использованию для тестирования AutoRia API.
