# 🔧 Nginx - Reverse Proxy Configuration

## 📋 Огляд

Nginx налаштований як reverse proxy для маршрутизації запитів між frontend та backend сервісами. 

## 📁 Структура

```
nginx/
├── nginx.conf           # Головна конфігурація Nginx
└── README.md           # Ця документація
```

## ⚙️ Конфігурація

### Основні налаштування

- **Порт**: 80 (HTTP)
- **Worker Processes**: auto (автоматично визначається)
- **Worker Connections**: 1024

### Маршрутизація

```nginx
# Frontend (Next.js)
location / {
    proxy_pass http://frontend:3000;
}

# Backend API (Django)
location /api/ {
    proxy_pass http://app:8000/api/;
}

# Django Admin
location /admin/ {
    proxy_pass http://app:8000/admin/;
}

# Статичні файли Django
location /static/ {
    proxy_pass http://app:8000/static/;
}

# Медіа файли Django
location /media/ {
    proxy_pass http://app:8000/media/;
}
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

### Проблема: 502 Bad Gateway

**Причина:** Backend сервіс недоступний

**Рішення:**
```bash
# Перевірте статус backend
docker-compose ps app

# Перевірте чи backend listening на порті 8000
docker-compose exec app netstat -tulpn | grep 8000

# Перезапустіть backend
docker-compose restart app
```

### Проблема: 504 Gateway Timeout

**Причина:** Backend відповідає занадто довго

**Рішення:**
```nginx
# Збільшіть таймаути в nginx.conf
proxy_connect_timeout 600;
proxy_send_timeout 600;
proxy_read_timeout 600;
send_timeout 600;
```

### Проблема: Статичні файли не завантажуються

**Причина:** Неправильний шлях або права доступу

**Рішення:**
```bash
# Перевірте що статичні файли зібрані
docker-compose exec app python manage.py collectstatic --noinput

# Перевірте права доступу
docker-compose exec app ls -la /backend/staticfiles
```

## 📚 Додаткові ресурси

- [Офіційна документація Nginx](https://nginx.org/en/docs/)
- [Nginx Reverse Proxy Guide](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [SSL Configuration Generator](https://ssl-config.mozilla.org/)

---

**Назад до:** [Головний README](../README.md)

