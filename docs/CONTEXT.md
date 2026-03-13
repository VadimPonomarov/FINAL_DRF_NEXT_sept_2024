# Текущий контекст - AutoRia Clone

## Последнее обновление
**Дата:** 2026-03-12
**Commit:** working tree
**Session summary:** Normalized local and Docker environment resolution so backend/frontend runtime now select `.env.local` vs `.env.docker` correctly, rewired local development away from Railway URLs back to `localhost`, and prepared the project for local/Docker verification of avatar saving plus image delete/set-main actions before redeploy.

## Текущий milestone
**M1 — Foundation & MVP**

## Завершено в этой сессии
- **`backend/config/extra_config/environment.py`** — backend env loader теперь выбирает `.env.local` или `.env.docker` по `IS_DOCKER` / `/.dockerenv`
- **`frontend/next.config.js` и `frontend/src/lib/env-loader.ts`** — frontend build/runtime env selection синхронизирован с Docker/local режимом
- **`env-config/.env.local`** — локальная разработка переведена на `localhost` URLs и локальную PostgreSQL-конфигурацию вместо Railway
- **`backend/.env` и `frontend/.env.local`** — локальные service-specific env значения выровнены под dev verification
- **`scripts/setup-frontend-env.py` и `scripts/setup-frontend-env.sh`** — генерация `frontend/.env.local` теперь учитывает активное окружение и корректно выставляет `NODE_ENV` / `IS_DOCKER`
- **`docs/ENVIRONMENT_SETUP.md`** — документация обновлена под фактическую схему env priority и local/docker URL split

## В процессе
- Подготовка к фактическому локальному и Docker прогону avatar/image actions после env-нормализации

## Заблокировано
- Нет по коду и live-проверке

## Следующая задача
**Следующий шаг:**
- Запустить локальный backend/frontend и проверить avatar saving, delete image, set-main image
- Запустить Docker-сценарий и повторить те же проверки
- После успешной проверки перейти к deploy на Railway/Vercel и live re-check

## Последние архитектурные решения (из DECISIONS.md)
- **2026-03-12 — Local/Docker Environment Resolution Normalization**
  - `env-config/` закреплен как источник истины для local/docker runtime
  - backend/frontend loaders выбирают `.env.local` vs `.env.docker` автоматически
  - локальный dev возвращен на `localhost`, без зависания на live Railway URLs
- **2026-03-11 — Image Generation Fix: Safe Imports + Auto-Generation Prevention**
  - Добавлены безопасные импорты для g4f/OpenAI зависимостей
  - Отключена автоматическая генерация через RUN_SEEDS=false
  - Сохранен g4f FREE model с Pollinations.ai fallback
- **2026-03-11 — Chat Endpoints 404 Resolution**
  - Созданы недостающие файлы apps.py и __init__.py
  - Реализован fallback для проблемных импортов
  - Сохранена совместимость с существующими API контрактами
- **2026-03-11 — URL Routing Fix**
  - Исправлена проблема с include('apps.chat.urls') → include(chat_urls)
  - Предотвращает ImportError при загрузке chat приложения
  - Использует существующий try/except pattern для безопасности

## Текущий статус развертывания
- **Frontend (Vercel):** ✅ Работает стабильно - https://autoria-clone.vercel.app
- **Backend (Railway):** ✅ Основной API работает
- **Database:** ✅ PostgreSQL работает
- **Redis:** ✅ Кэш работает
- **Email:** ✅ Сервис работает

## Критические проблемы
- **Chat endpoints 404** - ✅ ИСПРАВЛЕНО (URL routing issue)
- **Самопроизвольная генерация** - ✅ ИСПРАВЛЕНО
- **Автопересоздание тестовых объявлений после delete через `seed-once`** - ✅ ИСПРАВЛЕНО
- **Generated images терялись после create ad** - ✅ ИСПРАВЛЕНО
- **Generated images отображались placeholder-ами из-за `ERR_BLOCKED_BY_ORB` на прямых `pollinations.ai` URL** - ✅ ИСПРАВЛЕНО
- **Avatar UI показывал raw translation keys** - ✅ ИСПРАВЛЕНО
- **Безопасные импорты** - ✅ ИСПРАВЛЕНО
- **Отсутствующие файлы** - ✅ ИСПРАВЛЕНО

## Тестирование проведено
- ✅ Frontend функционал - страницы загружаются, навигация работает
- ✅ Backend API - основные endpoints работают (/api/users/public/list/, /api/ads/public/list/)
- ✅ Аутентификация - вход/регистрация работают
- ✅ MCP-аудит выявил direct backend call из `ImagesForm.tsx`, create-flow persistence gap и broken avatar translation key
- ✅ Live MCP-проверка подтвердила: safe image-text fallback на вкладке `Зображення`, `POST /api/llm/generate-car-images` = 200, 10 generated items появились в галерее, `img.src` идут через `/api/image-proxy?...`

## Файлы изменены в этой сессии
- `backend/config/extra_config/environment.py`
- `frontend/next.config.js`
- `frontend/src/lib/env-loader.ts`
- `env-config/.env.local`
- `backend/.env`
- `frontend/.env.local`
- `scripts/setup-frontend-env.py`
- `scripts/setup-frontend-env.sh`
- `docs/ENVIRONMENT_SETUP.md`
- `docs/ROADMAP.md`
- `docs/CONTEXT.md`
- `docs/DECISIONS.md`

## Следующий сессии должен знать
1. **Local/Docker env selection исправлен:** loaders больше не тянут `.env.local` внутри Docker
2. **Local verification теперь действительно локальный:** `env-config/.env.local` и service env files смотрят на `localhost`, а не на Railway
3. **Следующий обязательный шаг:** поднять локальный и Docker сценарии и проверить avatar saving + image delete/set-main до deploy
4. **Frontend generated env helpers синхронизированы:** оба setup-скрипта учитывают текущее окружение
5. **PROJECT BOOTSTRAP:** Все фундаментальные документы созданы и соответствуют правилам

## Технический долг
- ✅ Нет по env runtime selection
- 🔄 В процессе - локальная и Docker верификация avatar/image actions
- 📋 Планируется - оптимизация производительности генерации изображений в M2

## Готовность к продакшн
- **Frontend:** ✅ Готов
- **Backend:** ✅ Готов для текущего image-generation flow
- **Документация:** ✅ Полная
- **Тестирование:** ✅ Критический image-generation/display regression set подтвержден live
- **Развертывание:** ✅ Автоматизировано

## Коммиты в этой сессии
- `48c587f` - Fix chat URL routing - use chat_urls variable (критическое исправление)
- `dc16cf6` - Add diagnostic endpoint to debug chat app loading issues
- `0ab77e4` - Fix: Add missing __init__.py for chat views - required for imports
- `57a9f26` - Fix: Add missing apps.py for chat app - critical for Django app loading
- `7131ff9` - Fix auto-generation: disable RUN_SEEDS to prevent spontaneous ads creation
- `1d447c9` - Fix chat endpoints: safe imports with g4f FREE models + Pollinations.ai fallback
- `fda5b11` - Fix image generation: ensure chat endpoints are properly configured for Pollinations.ai + FLUX

## Рекомендации для следующей сессии
1. **Довести `docs/SPEC.md`** - внести acceptance criteria для `/api/image-proxy` и safe image-tab fallback другим безопасным способом
2. **Завершить M1** - если других production regressions нет, отметить image-generation/display set как полностью закрытый
3. **Начать планирование M2** - подготовить задачи для Real-time чата и многоязычности
4. **Сохранить evidence** - при необходимости использовать текущие MCP network/DOM подтверждения как доказательство live fix
5. **Обновить CONTEXT.md** - в конце следующей сессии снова синхронизировать фактический статус
6. **Сохранить диагностический endpoint** - оставить /api/ads/diagnostic/ для будущей отладки
