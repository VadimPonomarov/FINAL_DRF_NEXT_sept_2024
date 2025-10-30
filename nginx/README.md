# 🔧 Nginx - Reverse Proxy Configuration

## 📋 Огляд

Конфигурация настраивает обратный прокси:

- `/api/auth/*` обслуживает Next.js (NextAuth)
- Все остальные `/api/*` идут в Django (`app:8000`)
- WebSocket `channels` по пути `/api/chat/*` (с Upgrade/Connection заголовками)
- `/admin/`, `/static/`, `/media/` — в Django
- Все остальное — на frontend (localhost:3000 через `host.docker.internal`)

## 📁 Структура

```
nginx/
├── nginx.conf           # Упрощённая конфигурация Nginx
└── README.md           # Эта документация
```

## ⚙️ Упрощённая конфигурация

### Приоритет маршрутов

```nginx
# 0. NextAuth (frontend)
location ^~ /api/auth/ { proxy_pass http://frontend_localhost/api/auth/; }

# 1. WebSocket Channels
location ^~ /api/chat/ {
    proxy_pass http://backend/api/chat/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
}

# 2. Backend REST API
location ^~ /api/ { proxy_pass http://backend/api/; }

# 2. Django admin
location /admin/ {
    proxy_pass http://backend;
}

# 3. Статические файлы
location /static/ {
    proxy_pass http://backend;
}

location /media/ {
    proxy_pass http://backend;
}

# 5. Frontend (всё остальное)
location / {
    proxy_pass http://host.docker.internal:3000;  # ← localhost:3000
}
```

### Как это работает

```
http://localhost/ 
    ↓
Nginx → http://host.docker.internal:3000 (Frontend, Next.js)

http://localhost/api/ads/
    ↓
Nginx → http://app:8000/api/ads/ (Backend, Django)

ws://localhost/api/chat/ws/room/123
    ↓
Nginx (Upgrade) → ws://app:8000/api/chat/ws/room/123 (Django Channels)

http://localhost/admin/
    ↓
Nginx → http://app:8000/admin/ (Backend, Django Admin)
```

## 🚀 Використання

### Запуск через Docker Compose

```bash
# Запуск Nginx разом з іншими сервісами
docker-compose up -d nginx

# Перезапуск після зміни конфігурації
docker-compose restart nginx

# Перевірка логів
docker-compose logs -f nginx
```

### Перевірка конфігурації

```bash
# Тестування конфігурації перед запуском
docker-compose exec nginx nginx -t

# Перезавантаження конфігурації без downtime
docker-compose exec nginx nginx -s reload
```

## 🔍 Моніторинг

### Логи

```bash
# Логи доступу
docker-compose logs nginx | grep "GET\|POST\|PUT\|DELETE"

# Логи помилок
docker-compose logs nginx | grep "error"

# Real-time моніторинг
docker-compose logs -f nginx
```

### Статус

```bash
# Перевірка чи запущений
docker-compose ps nginx

# Детальна інформація про контейнер
docker inspect nginx
```

## 🛠 Налаштування для Production

### SSL/TLS (HTTPS)

Для production розгортання додайте SSL сертифікати:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # SSL налаштування
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # ... решта конфігурації
}

# Редирект з HTTP на HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### Оптимізація

```nginx
# Gzip стиснення
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;

# Кешування статичних файлів
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general:10m rate=100r/s;

location /api/ {
    limit_req zone=api_limit burst=20;
    proxy_pass http://app:8000/api/;
}
```

## 🔧 Troubleshooting

### Проблема: Frontend не доступен (502 Bad Gateway)

**Причина:** Frontend не запущен на localhost:3000

**Рішення:**
```bash
# Проверьте что frontend запущен локально
# Откройте http://localhost:3000 в браузере

# Если не работает, запустите frontend:
cd frontend
npm run start
```

### Проблема: 502 Bad Gateway для Backend API

**Причина:** Backend сервис недоступен

**Рішення:**
```bash
# Проверьте статус backend
docker-compose ps app

# Перезапустите backend
docker-compose restart app
```

### Проблема: Frontend работает через localhost:3000, но не через nginx

**Причина:** host.docker.internal недоступен или frontend не на том же порту

**Рішення:**
```bash
# Проверьте что frontend слушает на порту 3000
netstat -ano | findstr ":3000"

# Проверьте логи nginx
docker-compose logs nginx | grep "host.docker.internal"
```

## 📚 Додаткові ресурси

- [Офіційна документація Nginx](https://nginx.org/en/docs/)
- [Nginx Reverse Proxy Guide](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [SSL Configuration Generator](https://ssl-config.mozilla.org/)

---

**Назад до:** [Головний README](../README.md)

