# 🔐 OAuth Setup Guide

## Важная информация

Все OAuth ключи в этом проекте **ЗАШИФРОВАНЫ** и хранятся в файле `frontend/.env.local`.

### Зашифрованные ключи

Ключи хранятся с префиксом `ENC_` и используют алгоритм:
- Base64 encoding
- String reversal
- Custom encryption (см. `frontend/src/utils/auth/simple-crypto.ts`)

### Где найти ключи

1. **Frontend OAuth ключи**: `frontend/.env.local`
   - `GOOGLE_CLIENT_ID=ENC_...`
   - `GOOGLE_CLIENT_SECRET=ENC_...`
   - `GITHUB_CLIENT_ID=ENC_...`
   - `GITHUB_CLIENT_SECRET=ENC_...`

2. **Backend OAuth ключи**: `env-config/.env.secrets`
   - Аналогичные ключи для backend

### Автоматическая дешифровка

Все ключи автоматически дешифруются при загрузке приложения через:
- `frontend/src/utils/auth/simple-crypto.ts`
- `frontend/src/lib/auth/authConfig.ts`

## 🚀 Быстрый старт OAuth

### 1. Проверить наличие зашифрованных ключей

```bash
# Проверить frontend ключи
cat frontend/.env.local | grep "ENC_"

# Проверить backend ключи  
cat env-config/.env.secrets | grep "GOOGLE\|GITHUB"
```

### 2. Запустить проект

```bash
docker-compose up -d
```

### 3. OAuth должен работать автоматически

- Google OAuth: `http://localhost:3000`
- GitHub OAuth: `http://localhost:3000`

## 🔧 Если OAuth не работает

### Проверить логи

```bash
# Frontend логи
docker-compose logs frontend

# Backend логи
docker-compose logs backend
```

### Проверить редирект URI

Убедитесь, что в Google/GitHub Console настроены:
- `http://localhost:3000/api/auth/callback/google`
- `http://localhost:3000/api/auth/callback/github`

## 📚 Дополнительная информация

- **Шифрование**: `frontend/src/utils/auth/simple-crypto.ts`
- **Конфигурация**: `frontend/src/lib/auth/authConfig.ts`
- **Callback**: `frontend/src/app/api/auth/[...nextauth]/route.ts`

## ⚠️ Для продакшн

**НЕ ИСПОЛЬЗУЙТЕ** эти настройки в продакшн! 

Для продакшн используйте:
1. Настоящие environment variables
2. Secret management системы (AWS Secrets Manager, HashiCorp Vault)
3. Не коммитьте ключи в репозиторий

---

✅ **Это учебный проект** - все ключи зашифрованы для демонстрационных целей.
