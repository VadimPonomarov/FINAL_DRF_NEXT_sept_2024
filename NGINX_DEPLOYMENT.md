# Nginx Production Deployment

## Архитектура
```
Internet → Nginx Proxy → Vercel Frontend (Next.js)
                    → Railway Backend (Django)
                    → Railway Redis (через proxy)
```

## Преимущества
- **Единый домен** для всех сервисов
- **Нет зависимости от хостов** в коде
- **CORS решается** на уровне nginx
- **SSL termination** в одной точке
- **Rate limiting** и security headers
- **Load balancing** для масштабирования

## Развертывание

### 1. Подготовка домена
```bash
# Заменить your-domain.com на реальный домен
# Настроить DNS A-запись на IP адрес сервера
```

### 2. Конфигурация
```bash
# Отредактировать production-nginx.conf
sed -i 's/your-domain.com/your-real-domain.com/g' nginx/production-nginx.conf

# Отредактировать .env.nginx
sed -i 's/your-domain.com/your-real-domain.com/g' frontend/.env.nginx
```

### 3. SSL сертификаты (Let's Encrypt)
```bash
# Установить certbot
sudo apt install certbot python3-certbot-nginx

# Получить сертификаты
sudo certbot --nginx -d your-domain.com

# Копировать сертификаты в проект
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/
```

### 4. Запуск
```bash
# Production compose
docker-compose -f docker-compose.production.yml up -d

# Проверить статус
docker-compose -f docker-compose.production.yml ps

# Логи
docker-compose -f docker-compose.production.yml logs -f nginx-proxy
```

### 5. Vercel настройки
```bash
# Обновить environment variables в Vercel
# NEXT_PUBLIC_BACKEND_URL=https://your-domain.com
# REDIS_URL=redis://localhost:6379 (через nginx proxy)
# NEXTAUTH_URL=https://your-domain.com
```

## Тестирование
```bash
# Health check
curl https://your-domain.com/nginx-health

# Frontend
curl https://your-domain.com/

# Backend API
curl https://your-domain.com/api/users/public/list/

# Redis API
curl https://your-domain.com/api/redis?key=test
```

## Мониторинг
```bash
# Nginx логи
tail -f nginx/logs/access.log
tail -f nginx/logs/error.log

# Docker статус
docker stats
```

## Безопасность
- Rate limiting: 10 req/s для API, 5 req/s для auth
- Security headers
- SSL только
- Скрытие server tokens
- CORS только для разрешенных доменов

## Масштабирование
```yaml
# docker-compose.production.yml
services:
  nginx-proxy:
    deploy:
      replicas: 3
  
  # Добавить бэкенд реплики
  backend-replica:
    image: railway-backend
    # ...
```

## Rollback
```bash
# Откат к предыдущей версии
git checkout previous-commit
docker-compose -f docker-compose.production.yml up -d --build
```
