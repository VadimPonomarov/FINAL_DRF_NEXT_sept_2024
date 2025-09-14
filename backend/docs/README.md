# 📚 AutoRia API - Документація Платформи Продажу Автомобілів

## 🎯 Огляд

Ця директорія містить комплексну документацію для AutoRia API. API дотримується принципів RESTful та надає повну функціональність для маркетплейсу продажу автомобілів.

## 📋 Структура Документації

### 🔧 API Документація
- **Swagger UI**: http://localhost:8000/api/doc/
- **ReDoc**: http://localhost:8000/api/redoc/
- **OpenAPI Schema**: Доступна у форматах YAML та JSON

### 📖 Детальні Посібники
- [`API_COMPLETE_GUIDE.md`](./API_COMPLETE_GUIDE.md) - Повний посібник використання API
- [`ADVANCED_MODERATION_SYSTEM.md`](./ADVANCED_MODERATION_SYSTEM.md) - Документація системи модерації
- [`SUPERUSER_ENDPOINTS.md`](./SUPERUSER_ENDPOINTS.md) - Документація адміністративних ендпоінтів
- [`MOCK_DATA_SYSTEM.md`](./MOCK_DATA_SYSTEM.md) - Система генерації тестових даних
- [`celery_tasks.md`](./celery_tasks.md) - Документація фонових завдань
- [`media_cleanup.md`](./media_cleanup.md) - Документація управління медіа

## 🏷️ Структура API Тегів

API організовано за допомогою стандартизованих тегів з емодзі:

### 🔐 Автентифікація та Користувачі
- **🔐 Автентифікація** - Вхід, реєстрація, вихід, управління токенами
- **👤 Користувачі** - Профілі користувачів, налаштування та управління особистими даними

### 🏢 Управління Акаунтом
- **📍 Адреси** - CRUD операції з адресами з геокодуванням та валідацією
- **📞 Контакти** - Телефонні номери, електронні пошти та управління контактними даними

### 🚗 Оголошення Автомобілів
- **🚗 Оголошення** - Перегляд, пошук та управління оголошеннями автомобілів
- **📸 Зображення Оголошень** - Завантаження та управління зображеннями для оголошень

### 🏷️ Довідкові Дані Автомобілів
- **🏷️ Марки Автомобілів** - Виробники автомобілів та інформація про бренди
- **🚗 Моделі Автомобілів** - Моделі автомобілів та їх специфікації
- **📅 Покоління Автомобілів** - Покоління автомобілів та модельні роки
- **⚙️ Модифікації Автомобілів** - Модифікації та технічні характеристики
- **🎨 Кольори** - Доступні кольори автомобілів та варіанти кольорів

### 🌍 Географічні Дані
- **🌍 Регіони** - Географічні регіони та адміністративні поділи
- **🏙️ Міста** - Міста та інформація про місцезнаходження

### 🚙 Інформація про Транспортні Засоби
- **🚙 Типи Транспортних Засобів** - Категорії та типи транспортних засобів

### 🔧 System
- **❤️ Health Check** - System health monitoring and status checks

## 🚀 Quick Start

### 1. Authentication
```bash
# Register new user
POST /api/users/create/

# Login
POST /api/auth/login/

# Use JWT token in headers
Authorization: Bearer <your-jwt-token>
```

### 2. Browse Cars
```bash
# Get all car marks
GET /api/ads/reference/car-marks/

# Get models for a specific mark
GET /api/ads/reference/car-models/?mark_id=1

# Search advertisements
GET /api/ads/advertisements/?search=BMW
```

### 3. Create Advertisement
```bash
# Create new advertisement
POST /api/ads/advertisements/

# Upload images
POST /api/ads/advertisements/{id}/images/
```

## 🔒 Authentication

The API uses JWT (JSON Web Tokens) for authentication:

1. **Register** or **Login** to get access and refresh tokens
2. **Include** the access token in the `Authorization` header
3. **Refresh** tokens when they expire

```http
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

## 📊 Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "count": 150,
  "next": "http://localhost:8000/api/endpoint/?page=2",
  "previous": null,
  "results": [...]
}
```

### Error Response
```json
{
  "detail": "Error message description",
  "code": "error_code"
}
```

### Validation Error
```json
{
  "field_name": ["This field is required."],
  "another_field": ["Invalid value provided."]
}
```

## 🔧 Development

### Running the API
```bash
# Start development server
python manage.py runserver

# Access documentation
open http://localhost:8000/api/doc/
```

### Testing
```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test apps.ads
```

## 📝 Contributing

When adding new endpoints:

1. **Use standardized tags** from `core.schemas.common_schemas.CANONICAL_TAGS`
2. **Follow naming conventions** with emoji prefixes
3. **Include proper documentation** with operation summaries and descriptions
4. **Add appropriate security** settings for public/private endpoints
5. **Use common parameters** from `core.schemas.common_schemas`

## 🌐 Environment URLs

### Development
- **API Base**: http://localhost:8000/api/
- **Swagger UI**: http://localhost:8000/api/doc/
- **ReDoc**: http://localhost:8000/api/redoc/
- **Admin Panel**: http://localhost:8000/admin/

### Production
- Update URLs according to your production environment
- Ensure HTTPS is enabled
- Configure proper CORS settings

## 📞 Support

For questions or issues:
1. Check the detailed guides in this documentation
2. Review the interactive Swagger UI
3. Contact the development team

---

*This documentation is automatically updated with API changes.*
