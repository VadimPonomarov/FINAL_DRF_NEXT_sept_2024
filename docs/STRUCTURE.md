# Структура проекта - AutoRia Clone

## Полное дерево каталогов

```
FINAL_DRF_NEXT_sept_2024/
├── backend/                           # Django REST API
│   ├── apps/                          # Django приложения
│   │   ├── accounts/                   # Управление пользователями
│   │   ├── ads/                        # Объявления автомобилей
│   │   ├── auth/                       # Аутентификация JWT
│   │   ├── chat/                       # AI чат и генерация изображений
│   │   │   ├── views/
│   │   │   │   ├── image_generation_views.py  # Генерация изображений
│   │   │   │   └── __init__.py               # Импорты представлений
│   │   │   ├── urls.py                  # URL маршруты чата
│   │   │   └── apps.py                  # Конфигурация приложения
│   │   ├── core/                       # Ядро системы
│   │   │   ├── consumers/               # WebSocket потребители
│   │   │   ├── data/                    # Управление данными
│   │   │   ├── decorators/              # Декораторы
│   │   │   ├── services/                # Бизнес-логика
│   │   │   └── utils/                   # Утилиты
│   │   └── __init__.py                 # Инициализация приложений
│   ├── config/                         # Конфигурация Django
│   │   ├── settings.py                 # Базовые настройки
│   │   ├── settings_railway.py          # Настройки Railway
│   │   ├── settings_vercel.py           # Настройки Vercel
│   │   ├── extra_config/                # Дополнительная конфигурация
│   │   │   ├── apps_config.py           # Конфигурация приложений
│   │   │   └── ...                      # Другие конфигурации
│   │   ├── urls.py                      # Главный URL конфиг
│   │   ├── asgi.py                      # ASGI конфигурация
│   │   └── wsgi.py                      # WSGI конфигурация
│   ├── requirements/                   # Зависимости Python
│   ├── .env                            # Переменные окружения
│   ├── manage.py                        # Django management commands
│   └── Dockerfile                      # Docker конфигурация
├── frontend/                          # Next.js приложение
│   ├── src/                            # Исходный код
│   │   ├── app/                        # App Router страницы
│   │   │   ├── (auth)/                 # Аутентификация
│   │   │   ├── autoria/                # Основные страницы
│   │   │   │   ├── page.tsx             # Главная страница
│   │   │   │   └── ...                  # Другие страницы
│   │   │   ├── api/                    # API маршруты
│   │   │   │   ├── (backend)/          # Backend API
│   │   │   │   │   └── autoria/        # AutoRia API
│   │   │   │   │       └── test-ads/   # Тестовые объявления
│   │   │   │   │           └── generate/ # Генерация
│   │   │   │   │               └── route.ts # API endpoint
│   │   │   │   └── auth/               # Auth API
│   │   │   ├── globals.css             # Глобальные стили
│   │   │   ├── layout.tsx              # Корневой layout
│   │   │   └── middleware.ts           # Middleware
│   │   ├── components/                 # UI компоненты
│   │   │   ├── ui/                     # Базовые компоненты
│   │   │   ├── forms/                  # Формы
│   │   │   └── layout/                 # Layout компоненты
│   │   ├── lib/                        # Утилиты и конфигурация
│   │   │   ├── backend-url.ts          # URL бэкенда
│   │   │   └── ...                     # Другие утилиты
│   │   ├── types/                      # TypeScript типы
│   │   ├── hooks/                      # React хуки
│   │   ├── store/                      # State management
│   │   └── i18n/                       # Интернационализация
│   │       ├── locales/                # Файлы переводов
│   │       │   ├── en.json             # Английский
│   │       │   ├── uk.json             # Украинский
│   │       │   └── ru.json             # Русский
│   │       └── config.ts               # Конфигурация i18n
│   ├── public/                         # Статические файлы
│   ├── .env.production                 # Production env
│   ├── .env.local                      # Local env
│   ├── package.json                    # Зависимости
│   ├── next.config.js                  # Next.js конфигурация
│   └── Dockerfile                      # Docker конфигурация
├── celery-service/                    # Celery workers
│   ├── config/                         # Конфигурация Celery
│   ├── tasks/                          # Задачи Celery
│   │   ├── cleanup_tasks.py            # Очистка
│   │   └── data_processing_tasks.py    # Обработка данных
│   ├── main.py                         # Entry point
│   └── requirements.txt                # Зависимости
├── mailing/                           # Email сервис
│   ├── src/                            # Исходный код
│   │   ├── services/                   # Email сервисы
│   │   └── commands/                   # Команды
│   ├── templates/                      # Email шаблоны
│   └── app.py                          # Flask приложение
├── nginx/                             # Nginx конфигурация
│   ├── nginx.conf                      # Основная конфигурация
│   ├── production-nginx.conf           # Production конфигурация
│   └── Dockerfile                      # Docker конфигурация
├── docs/                              # Документация
│   ├── SPEC.md                         # Техническая спецификация
│   ├── ROADMAP.md                      # План разработки
│   ├── STRUCTURE.md                    # Структура проекта
│   ├── DEPLOY.md                       # План развертывания
│   ├── DECISIONS.md                    # Архитектурные решения
│   ├── CONTEXT.md                      # Текущий контекст
│   ├── FULL_RULES.md                   # Правила проекта
│   ├── ARCHITECTURE.md                 # Архитектура
│   └── ...                            # Другая документация
├── scripts/                           # Скрипты
│   ├── testing/                        # Тестовые скрипты
│   ├── check_environment.py            # Проверка окружения
│   └── ...                            # Другие скрипты
├── media/                             # Медиа файлы
├── env-config/                        # Конфигурация окружения
│   ├── .env.base                       # Базовые переменные
│   ├── .env.docker                     # Docker переменные
│   ├── .env.local                      # Local переменные
│   └── .env.production                 # Production переменные
├── .gitignore                         # Git ignore
├── docker-compose.yml                 # Docker Compose
├── docker-compose.with_frontend.yml    # Docker с frontend
├── docker-compose.production.yml       # Production Docker
├── railway.json                       # Railway конфигурация
├── vercel.json                        # Vercel конфигурация
└── README.md                          # Описание проекта
```

## Соглашения именования

### Файлы
- **Python:** snake_case (example: image_generation_views.py)
- **TypeScript/JavaScript:** kebab-case для папок, PascalCase для компонентов (example: test-ads/generate/route.ts)
- **Конфигурации:** kebab-case (example: docker-compose.yml)
- **Документация:** UPPER_CASE для основных файлов (example: SPEC.md)

### Компоненты
- **React:** PascalCase (example: CarCard.tsx)
- **Django apps:** snake_case (example: image_generation)
- **API endpoints:** kebab-case (example: /api/chat/generate-car-images-mock/)

### Переменные
- **Python:** snake_case (example: car_data)
- **TypeScript:** camelCase (example: carData)
- **Константы:** UPPER_SNAKE_CASE (example: MAX_ADS_LIMIT)

## Владение модулями

### Backend слои
- **apps/** - Бизнес-логика и API
  - **accounts/** - Управление пользователями, профили
  - **ads/** - Объявления, поиск, фильтрация
  - **auth/** - JWT аутентификация, токены
  - **chat/** - AI функционал, генерация изображений
  - **core/** - Общая логика, утилиты, сервисы
- **config/** - Конфигурация приложения
- **requirements/** - Зависимости Python

### Frontend слои
- **src/app/** - Страницы и API маршруты (Next.js App Router)
- **src/components/** - UI компоненты
- **src/lib/** - Утилиты и конфигурация
- **src/types/** - TypeScript типы
- **src/hooks/** - React хуки
- **src/store/** - State management
- **src/i18n/** - Интернационализация

### Инфраструктура
- **celery-service/** - Фоновые задачи
- **mailing/** - Email сервис
- **nginx/** - Веб-сервер конфигурация
- **scripts/** - Вспомогательные скрипты

## Правила импорта

### Backend
```python
# ✅ Правильно
from apps.ads.models import CarAdvertisement
from core.services import ImageGenerationService

# ❌ Неправильно
from backend.apps.ads.models import CarAdvertisement
from apps.ads.models import Model, View  # Импорт представлений в модели
```

### Frontend
```typescript
// ✅ Правильно
import { CarCard } from '@/components/ui/CarCard';
import { generateImages } from '@/lib/api';

// ❌ Неправильно
import { CarCard } from '../../../components/ui/CarCard';
import { generateImages } from '../lib/api';
```

### Межслойные импорты
- **UI → API:** ✅ Разрешено через API routes
- **UI → Database:** ❌ Запрещено
- **Backend → Frontend:** ❌ Запрещено
- **Services → Models:** ✅ Разрешено
- **Views → Services:** ✅ Разрешено

## Запрещенные паттерны

### Структура
- ❌ Создание файлов вне согласованной структуры
- ❌ Дублирование логики в разных модулях
- ❌ Циклические импорты
- ❌ Вложенные папки src/src/

### Код
- ❌ Магические числа и строки
- ❌ Hardcoded URL адреса
- ❌ Игнорирование TypeScript ошибок
- ❌ Использование any без необходимости

### Архитектура
- ❌ Прямые запросы к БД из UI
- ❌ Бизнес-логика в UI компонентах
- ❌ Глобальные переменные для состояния
- ❌ Запросы к внешним API без обработки ошибок

## Обязательные файлы в каждом модуле

### Backend apps
```
apps/app_name/
├── __init__.py          # Инициализация
├── apps.py             # Конфигурация Django app
├── models.py           # Модели данных
├── serializers.py      # DRF сериализаторы
├── views.py            # Представления
├── urls.py             # URL маршруты
├── admin.py            # Django admin
└── tests/              # Тесты
    ├── __init__.py
    ├── test_models.py
    ├── test_views.py
    └── test_serializers.py
```

### Frontend компоненты
```
src/components/ComponentName/
├── index.tsx           # Экспорт компонента
├── ComponentName.tsx   # Основной компонент
├── ComponentName.module.scss # Стили
└── ComponentName.test.tsx   # Тесты
```

## Константы окружения

### Обязательные переменные
```bash
# Backend
DATABASE_URL=postgresql://...
SECRET_KEY=...
DEBUG=false
ALLOWED_HOSTS=...

# Frontend
NEXT_PUBLIC_BACKEND_URL=https://...
NEXTAUTH_URL=https://...
NEXTAUTH_SECRET=...

# Общие
CORS_ALLOWED_ORIGINS=https://...
REDIS_URL=redis://...
```

### Файлы конфигурации
- **.env.base** - Общие переменные
- **.env.local** - Локальные переменные
- **.env.docker** - Docker переменные
- **.env.production** - Production переменные

## Тестирование

### Структура тестов
```
tests/
├── unit/               # Unit тесты
│   ├── backend/
│   │   └── apps/
│   │       └── test_app_name.py
│   └── frontend/
│       └── components/
│           └── test_component_name.tsx
├── integration/        # Интеграционные тесты
│   ├── test_api_endpoints.py
│   └── test_user_flows.tsx
└── e2e/               # End-to-end тесты
    ├── test_search_flow.py
    └── test_auth_flow.py
```

### Покрытие
- **Unit тесты:** > 80%
- **Интеграционные тесты:** Основные API endpoints
- **E2E тесты:** Критические пользовательские пути

## Документация

### Обязательная документация
- **API:** Swagger/OpenAPI документация
- **Компоненты:** Storybook или примеры использования
- **Развертывание:** Подробные инструкции
- **Контрибьюторам:** Правила разработки

### Автоматическая документация
- **Python:** Docstrings в Google стиле
- **TypeScript:** JSDoc комментарии
- **API:** Автоматическая генерация из кода
