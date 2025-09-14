# 🔑 Настройка реальных API ключей

## ⚠️ ВНИМАНИЕ
В файле `env-config/.env.secrets` некоторые ключи имеют placeholder значения и требуют замены на реальные для полной функциональности приложения.

## 🎯 Ключи, которые нужно заменить:

### 1. Google Services API Keys
```bash
# В env-config/.env.secrets замените:
GOOGLE_API_KEY=AIzaSyC_PLACEHOLDER_NEED_REAL_GOOGLE_API_KEY_HERE_39chars
GOOGLE_MAPS_API_KEY=AIzaSyC_PLACEHOLDER_NEED_REAL_GOOGLE_MAPS_KEY_HERE_39chars
```

**Как получить:**
1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте проект или выберите существующий
3. Включите APIs:
   - Google Maps JavaScript API
   - Google Maps Geocoding API
   - Google Places API
4. Создайте API ключи в разделе "Credentials"
5. Настройте ограничения для безопасности

**Используется в:**
- Геокодинг адресов (`apps/accounts/utils/geocoding.py`)
- Google Maps интеграция
- Поиск мест и адресов

### 2. Tavily AI API Key
```bash
# В env-config/.env.secrets замените:
TAVILY_API_KEY=tvly-PLACEHOLDER_NEED_REAL_TAVILY_API_KEY_HERE_32chars
```

**Как получить:**
1. Зарегистрируйтесь на [Tavily.com](https://tavily.com/)
2. Получите API ключ в личном кабинете

**Используется в:**
- Чат-сервис (`apps/chat/nodes/tavily_nodes.py`)
- AI поиск и анализ

### 3. Email/SMTP Credentials
```bash
# В env-config/.env.secrets замените:
GMAIL_USER=PLACEHOLDER_REAL_GMAIL_ADDRESS_NEEDED@gmail.com
GMAIL_PASSWORD=PLACEHOLDER_REAL_GMAIL_APP_PASSWORD_16_CHARS_NEEDED
SMTP_USERNAME=PLACEHOLDER_REAL_SMTP_USERNAME_NEEDED@gmail.com
ENCRYPTED_EMAIL_HOST_PASSWORD=PLACEHOLDER_REAL_ENCRYPTED_SMTP_PASSWORD_NEEDED
```

**Как получить Gmail App Password:**
1. Включите 2FA в Google аккаунте
2. Перейдите в Google Account Settings → Security → App passwords
3. Создайте App Password для приложения
4. Используйте 16-символьный пароль

**Используется в:**
- Отправка email уведомлений
- Регистрация пользователей
- Восстановление паролей

## ✅ Ключи, которые уже настроены:

### OAuth Google (работает)
- ✅ `GOOGLE_CLIENT_ID` - настроен
- ✅ `GOOGLE_CLIENT_SECRET` - настроен
- ✅ `NEXTAUTH_SECRET` - настроен

### Django Security (обновлены)
- ✅ `SECRET_KEY` - сгенерирован безопасный ключ
- ✅ `JWT_SECRET_KEY` - сгенерирован безопасный ключ

## 🚀 Приоритет настройки:

1. **Высокий приоритет** (для основной функциональности):
   - Google Maps API ключи (если используется геокодинг)
   - Email credentials (если нужна отправка email)

2. **Средний приоритет** (для дополнительных функций):
   - Tavily API (если используется AI чат)

3. **Низкий приоритет** (для расширенных функций):
   - Дополнительные Google Services

## 🔧 Как проверить, что ключи работают:

### Google Maps API:
```bash
# Проверьте логи Django при использовании геокодинга
docker-compose logs app | grep -i "google\|geocod"
```

### Email:
```bash
# Попробуйте отправить тестовый email через Django admin
# Проверьте логи mailing сервиса
docker-compose logs mailing
```

### Tavily API:
```bash
# Проверьте логи чат-сервиса
docker-compose logs app | grep -i "tavily"
```

## 📝 Примечания:

- Все placeholder ключи имеют правильную длину и формат
- Приложение будет работать без этих ключей, но с ограниченной функциональностью
- OAuth Google уже настроен и работает
- При получении реальных ключей просто замените placeholder значения в `env-config/.env.secrets`
