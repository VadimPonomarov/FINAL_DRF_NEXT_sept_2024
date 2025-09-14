# 🌐 Nginx Proxy Configuration Guide

## 🎯 Overview

Nginx serves as a reverse proxy for the comprehensive demo application, providing a unified entry point and routing requests to:
- **Frontend**: UI demonstration application with various interface tools
- **Backend**: Car Sales Platform API for educational integration examples

## 🚀 Quick Start

```bash
# Start all services with nginx proxy
docker-compose up -d

# Access the application
open http://localhost
```

## 📋 Service Routing

### 🏠 Main Application (Port 80)
- **URL**: `http://localhost`
- **Routes to**: Frontend (Next.js) on `frontend:3000`
- **Special routes**:
  - `/api/*` → Backend Django API
  - `/admin/*` → Django Admin
  - `/static/*` → Django static files
  - `/media/*` → Django media files

### 🔧 Development Services

| Service | URL | Internal Target | Description |
|---------|-----|-----------------|-------------|
| **Backend API** | `http://localhost:8000` | `app:8000` | Django REST API |
| **Mailing Service** | `http://localhost:8001` | `mailing:8001` | Email service |
| **Flower** | `http://localhost:5555` | `flower:5555` | Celery monitoring |
| **Redis Insight** | `http://localhost:5540` | `redis-insight:5540` | Redis GUI |
| **RabbitMQ Management** | `http://localhost:15672` | `rabbitmq:15672` | Message queue UI |

## 🔧 Configuration

### Nginx Config Location
```
docker/nginx/nginx.conf
```

### Key Features
- **WebSocket Support**: For real-time features
- **Load Balancing**: Ready for multiple backend instances
- **Health Checks**: Automatic failover support
- **Static File Serving**: Optimized for Django static/media files

## 🛠️ Customization

### Adding New Routes
Edit `docker/nginx/nginx.conf`:

```nginx
# Add new route to main server block
location /new-service/ {
    proxy_pass http://new-service:port;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Adding New Service Proxy
```nginx
# Add new upstream
upstream new-service {
    server new-service:port;
}

# Add new server block
server {
    listen new-port;
    server_name localhost;

    location / {
        proxy_pass http://new-service;
        # ... proxy headers
    }
}
```

### SSL/HTTPS Configuration
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # ... rest of configuration
}
```

## 🔍 Debugging

### Check Nginx Status
```bash
# View nginx logs
docker-compose logs nginx

# Check nginx configuration
docker-compose exec nginx nginx -t

# Reload nginx configuration
docker-compose exec nginx nginx -s reload
```

### Test Service Connectivity
```bash
# Test from nginx container
docker-compose exec nginx curl http://frontend:3000
docker-compose exec nginx curl http://app:8000/health
docker-compose exec nginx curl http://mailing:8001/health
```

### Common Issues

#### 1. Service Not Reachable
**Problem**: `502 Bad Gateway`
**Solution**: Check if target service is running
```bash
docker-compose ps
docker-compose logs [service-name]
```

#### 2. WebSocket Connection Failed
**Problem**: WebSocket connections dropping
**Solution**: Verify WebSocket headers in nginx config:
```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

#### 3. Static Files Not Loading
**Problem**: CSS/JS files return 404
**Solution**: Check static file routing:
```nginx
location /static/ {
    proxy_pass http://backend;
}
```

## 📊 Performance Optimization

### Enable Gzip Compression
```nginx
http {
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript;
}
```

### Enable Caching
```nginx
location /static/ {
    proxy_pass http://backend;
    proxy_cache_valid 200 1d;
    add_header X-Cache-Status $upstream_cache_status;
}
```

### Connection Pooling
```nginx
upstream backend {
    server app:8000;
    keepalive 32;
}
```

## 🔒 Security

### Rate Limiting
```nginx
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
}

server {
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://backend;
    }
}
```

### IP Whitelisting
```nginx
location /admin/ {
    allow 192.168.1.0/24;
    deny all;
    proxy_pass http://backend;
}
```

## 🚀 Production Deployment

### Environment-Specific Config
```bash
# Use different nginx configs for different environments
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Health Checks
```nginx
location /nginx-health {
    access_log off;
    return 200 "healthy\n";
    add_header Content-Type text/plain;
}
```

## 📚 Additional Resources

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Nginx Reverse Proxy Guide](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [Docker Nginx Best Practices](https://docs.docker.com/samples/nginx/)

---

*This configuration provides a robust, scalable proxy solution for the entire application stack.*
