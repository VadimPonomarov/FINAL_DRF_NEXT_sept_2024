# Cloudflare Tunnel Setup (Бесплатно)

## Почему Cloudflare Tunnel?
- **Бесплатно** для личного использования
- **Не нужен сервер** - работает из локальной машины
- **SSL сертификаты** автоматически
- **DDoS защита** и CDN
- **Custom domain** с unified routing
- **WebSocket поддержка**

## Установка и настройка

### 1. Установить Cloudflare CLI
```bash
# Windows (PowerShell)
winget install Cloudflare.cloudflared

# Или скачать с https://github.com/cloudflare/cloudflared/releases/latest
```

### 2. Авторизоваться
```bash
cloudflared tunnel login
# Откроет браузер для авторизации в Cloudflare
```

### 3. Создать tunnel
```bash
cloudflared tunnel create autoria-tunnel
# Сохранить UUID tunnel для конфигурации
```

### 4. Настроить домен
```bash
# Зарегистрировать домен в Cloudflare (можно бесплатно .tk, .ml, .ga)
# Или использовать существующий домен

# Создать DNS записи
cloudflared tunnel route dns autoria-tunnel your-domain.com
cloudflared tunnel route dns autoria-tunnel www.your-domain.com
cloudflared tunnel route dns autoria-tunnel api.your-domain.com
cloudflared tunnel route dns autoria-tunnel redis.your-domain.com
cloudflared tunnel route dns autoria-tunnel admin.your-domain.com
```

### 5. Конфигурация tunnel
```bash
# Создать файл конфигурации
mkdir ~/.cloudflared
cp cloudflare-tunnel.yml ~/.cloudflared/config.yml

# Отредактировать config.yml:
# - Заменить your-tunnel-id на реальный UUID
# - Заменить your-domain.com на реальный домен
```

### 6. Запустить tunnel
```bash
# Тестовый запуск
cloudflared tunnel run autoria-tunnel

# Фоновый запуск (Windows)
# Создать службу Windows или использовать NSSM
```

## Environment Variables для Vercel

После настройки tunnel обновить Vercel environment:

```bash
# В Vercel Dashboard или через CLI
vercel env add NEXT_PUBLIC_FRONTEND_URL production
# Ввести: https://your-domain.com

vercel env add NEXT_PUBLIC_BACKEND_URL production  
# Ввести: https://your-domain.com

vercel env add REDIS_URL production
# Ввести: redis://localhost:6379 (теперь работает через tunnel)

vercel env add NEXTAUTH_URL production
# Ввести: https://your-domain.com
```

## Тестирование

```bash
# Frontend
curl https://your-domain.com/

# Backend API
curl https://api.your-domain.com/api/users/public/list/

# Redis API (через Vercel)
curl https://redis.your-domain.com/api/redis?key=test

# Admin
curl https://admin.your-domain.com/admin/

# Health
curl https://health.your-domain.com/
```

## Автоматический запуск

### Windows Service
```bash
# Установить NSSM
winget install NSSM.NSSM

# Создать службу
nssm install CloudflareTunnel "C:\Program Files\cloudflared\cloudflared.exe" "tunnel run autoria-tunnel"

# Запустить службу
net start CloudflareTunnel

# Автозапуск при загрузке
sc config CloudflareTunnel start= auto
```

### Linux systemd
```bash
sudo tee /etc/systemd/system/cloudflared.service > /dev/null <<EOF
[Unit]
Description=cloudflared
After=network.target

[Service]
Type=simple
User=cloudflared
ExecStart=/usr/local/bin/cloudflared tunnel run autoria-tunnel
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

## Преимущества этой архитектуры

```
Internet → Cloudflare Tunnel → Vercel Frontend
                          → Railway Backend  
                          → Redis (через Vercel API)
```

- **Бесплатно** - нет затрат на сервер
- **Мгновенно** - развертывание за 5 минут
- **Надежно** - Cloudflare инфраструктура
- **Безопасно** - автоматический SSL
- **Масштабируемо** - CDN по всему миру

## Альтернативные бесплатные домены

Если нет домена:
- **Freenom**: .tk, .ml, .ga, .cf (бесплатные домены)
- **No-IP**: dynamic DNS subdomains
- **Cloudflare Pages**: можно использовать .pages.dev subdomain

## Troubleshooting

```bash
# Проверить статус tunnel
cloudflared tunnel info autoria-tunnel

# Проверить логи
cloudflared tunnel run autoria-tunnel --loglevel debug

# Проверить DNS записи
dig your-domain.com
```

## Production considerations

- **Резервирование**: создать backup tunnel
- **Мониторинг**: Cloudflare Analytics
- **Rate limiting**: Cloudflare Firewall Rules
- **CORS**: настроить в Cloudflare Pages Rules
