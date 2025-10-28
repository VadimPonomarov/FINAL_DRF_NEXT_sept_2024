# 📜 Project Scripts

Колекція утиліт та скриптів для проекту.

## 📁 Структура

```
scripts/
├── testing/                    # Тестові скрипти
│   ├── test_encryption_systems.js     # Комплексне тестування всіх систем
│   ├── test_nextjs_decryption.js      # Тест Next.js дешифрування
│   ├── test_backend_decryption.py     # Тест Backend дешифрування
│   ├── test-auth-flow.py              # Тест потоку аутентифікації
│   ├── test-backend-only.py           # Тест тільки backend
│   ├── test-oauth-google.js           # Тест Google OAuth
│   └── README.md                      # Документація тестів
└── README.md                          # Цей файл

backend/scripts/
├── encrypt_keys_for_backend.py        # Шифрування Backend ключів
└── README.md                          # Документація Backend скриптів

frontend/scripts/
├── encrypt_nextjs_oauth_keys.cjs      # Шифрування Next.js ключів
├── encrypt_nextjs_keys.py             # Застаріла Python версія
└── README.md                          # Документація Frontend скриптів
```

## 🚀 Швидкий старт

### Тестування всіх систем:
```bash
node scripts/testing/test_encryption_systems.js
```

### Шифрування ключів:
```bash
# Next.js OAuth ключі
node frontend/scripts/encrypt_nextjs_oauth_keys.cjs

# Backend API ключі
python backend/scripts/encrypt_keys_for_backend.py
```

## 🔐 Системи шифрування

Проект використовує **три незалежні системи шифрування**:

1. **Next.js** - AES-256-GCM для OAuth ключів
2. **Backend Django** - Fernet для API ключів
3. **Mailing Service** - Fernet для email облікових даних

## 🎯 Статус

- ✅ Next.js шифрування - **100% готово**
- ✅ Backend шифрування - **100% готово**
- ✅ Mailing шифрування - **100% готово**
- ✅ Тестування - **100% покриття**
- ✅ Документація - **Повна**

**Всі системи протестовані та готові до production!** 🚀

## 🎯 Активні скрипти

### Основний скрипт деплою
Основний скрипт деплою знаходиться в корені проекту: `../deploy.py`

**Використання:**
```bash
python deploy.py              # Інтерактивний режим з меню
python deploy.py --auto       # Автоматичний режим

# Режими деплою:
# 1 - Швидкий перезапуск
# 2 - Повне перевстановлення (за замовчуванням)
# 3 - Вибіркове перевстановлення
# f - ⚡ FAST режим (паралельна збірка, ~3-4 хвилини)
# s - Skip (тільки статус)
```

### `validate-environment.py`
Скрипт валідації змінних оточення для централізованої архітектури.

**Використання:**
```bash
python scripts/validate-environment.py
```

## 🗑️ Видалені скрипти

Наступні скрипти були видалені як застарілі або дублюючі:
- `deploy_interactive.py` - застарілий (є новий deploy.py з FAST режимом) ✅ 2025-10-28
- `create_test_moderation_data.py` - старі тестові дані ✅ 2025-10-28
- `create_test_moderation_data_fixed.py` - старі тестові дані ✅ 2025-10-28
- `README_ENCRYPTION.md` - застаріла документація шифрування
- `check-build-simple.ps1` - дублюючий скрипт
- `check-frontend-build.*` - застарілі скрипти збірки
- `crypto/` - застаріла система шифрування
- `deploy-local-frontend.py` - застарілий локальний деплой
- `deploy-with-build.*` - дублюючі скрипти
- `encrypt-*` - застарілі скрипти шифрування
- `event-driven-docker-monitor.py` - застарілий моніторинг
- `frontend-build.*` - дублюючі скрипти збірки
- `sample-keys.json` - тестові ключі
- `start-*` - застарілі скрипти запуску
- `test_oauth_decrypt.py` - тестовий файл
- `validate-environment.ps1` - дублюючий скрипт

## 🎯 Причини очистки

1. **Нова архітектура .env** - старі скрипти шифрування більше не потрібні
2. **Централізація** - один основний скрипт деплою замість багатьох
3. **Підтримка** - менше файлів = легше підтримувати
4. **Ясність** - зрозуміло, які скрипти активні
