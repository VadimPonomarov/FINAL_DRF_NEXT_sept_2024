# 🏗️ Canonical Project Structure

## 🎯 Overview

This document describes the canonical (standardized) structure of the Car Sales Platform API project after cleanup and standardization.

## 📁 Project Structure

```
backend/
├── 📚 docs/                          # Documentation
│   ├── README.md                      # Main documentation index
│   ├── API_COMPLETE_GUIDE.md         # Complete API guide
│   ├── ADVANCED_MODERATION_SYSTEM.md # Moderation system docs
│   ├── SUPERUSER_ENDPOINTS.md        # Admin endpoints
│   ├── MOCK_DATA_SYSTEM.md           # Mock data system
│   ├── celery_tasks.md               # Background tasks
│   ├── media_cleanup.md              # Media management
│   └── CANONICAL_STRUCTURE.md        # This file
│
├── 🏗️ core/                          # Core functionality
│   ├── schemas/                       # Common Swagger schemas
│   │   ├── __init__.py               # Schema exports
│   │   └── common_schemas.py         # Canonical schemas & tags
│   ├── management/commands/           # Django commands
│   │   └── export_swagger.py         # Export documentation
│   └── views.py                      # Core views (health check)
│
├── 🔧 config/                        # Django configuration
│   ├── docs/urls.py                  # Swagger documentation URLs
│   ├── extra_config/swagger.py       # Swagger configuration
│   └── settings.py                   # Main settings
│
└── 📱 apps/                          # Django applications
    ├── auth/docs/swagger_schemas.py   # Auth documentation
    ├── ads/
    │   ├── docs/
    │   │   ├── swagger_schemas.py     # Main ads schemas
    │   │   ├── contacts_schemas.py    # Contact schemas
    │   │   └── images_schemas.py      # Image schemas
    │   └── schemas/
    │       └── reference_schemas.py   # Car reference schemas
    └── accounts/docs/swagger_schemas.py # Account documentation
```

## 🏷️ Canonical Tags System

All API endpoints use standardized emoji-based tags:

### 🔐 Authentication & Users
- `🔐 Authentication` - Login, registration, logout, token management
- `👤 Users` - User profiles, settings, and personal data management

### 🏢 Account Management
- `📍 Addresses` - Address CRUD operations with geocoding
- `📞 Contacts` - Phone numbers, emails, and contact details

### 🚗 Car Advertisements
- `🚗 Advertisements` - Car advertisements browsing and management
- `📸 Advertisement Images` - Image upload and management

### 🏷️ Car Reference Data
- `🏷️ Car Marks` - Car manufacturers and brand information
- `🚗 Car Models` - Car models and their specifications
- `📅 Car Generations` - Car generations and model years
- `⚙️ Car Modifications` - Car modifications and specifications
- `🎨 Colors` - Available car colors and color options

### 🌍 Geographic Data
- `🌍 Regions` - Geographic regions and administrative divisions
- `🏙️ Cities` - Cities and location information

### 🚙 Vehicle Information
- `🚙 Vehicle Types` - Vehicle categories and types

### 🔧 System
- `❤️ Health Check` - System health monitoring
- `🔧 API Utilities` - General API utilities

## 📋 Schema Organization

### ✅ Canonical Structure
- **Single source of truth**: `core/schemas/common_schemas.py`
- **Standardized parameters**: Reusable across all apps
- **Consistent responses**: Unified error and success formats
- **Canonical tags**: Centralized tag definitions
- **Helper functions**: Standard response generators

### ❌ Removed Duplications
- Deleted temporary scripts and fix files
- Removed duplicate parameter definitions
- Eliminated redundant swagger_params.py files
- Cleaned up temporary documentation files

## 🔧 Configuration

### Swagger Settings
- **Location**: `config/extra_config/swagger.py`
- **Import**: `config/settings.py` imports unified settings
- **Format**: YAML-first with JSON support
- **Security**: JWT Bearer token authentication

### Documentation URLs
- **Swagger UI**: `/api/doc/`
- **ReDoc**: `/api/redoc/`
- **YAML Export**: `/api/doc/?format=yaml`
- **JSON Export**: `/api/doc/?format=json`

## 📝 Development Guidelines

### Adding New Endpoints
1. **Import canonical schemas**:
   ```python
   from core.schemas import CANONICAL_TAGS, get_list_responses, NO_AUTH
   ```

2. **Use standardized tags**:
   ```python
   tags=[CANONICAL_TAGS['YOUR_TAG']]
   ```

3. **Apply consistent responses**:
   ```python
   responses=get_list_responses()
   ```

4. **Set appropriate security**:
   ```python
   security=NO_AUTH  # For public endpoints
   ```

### Schema File Structure
```python
"""
App-specific Swagger schemas.
"""
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from core.schemas import CANONICAL_TAGS, get_list_responses

# App-specific parameters
app_param = openapi.Parameter(...)

# Schemas
endpoint_schema = swagger_auto_schema(
    operation_summary="🎯 Action Description",
    operation_description="Detailed description...",
    tags=[CANONICAL_TAGS['TAG_NAME']],
    responses=get_list_responses(),
    security=NO_AUTH
)
```

## 🧹 Cleanup Results

### ✅ Removed Files
- `apply_emoji_tags.py`
- `fix_function_decorators.py`
- `fix_remaining_tags.py`
- `fix_swagger_decorators.py`
- `find_tags.py`
- `quick_fix.py`
- `remove_security_locks.py`
- `standardize_tags.py`
- `update_api_tags.py`
- `swagger_documentation*.yaml` (temporary files)
- `API_TAGS_SUMMARY.md`
- `FINAL_TESTING_REPORT.md`
- `POSTMAN_TESTING_README.md`
- `SWAGGER_STANDARDIZATION_REPORT.md`
- `swagger_tags_standard.yaml`
- `apps/*/docs/swagger_params.py` (duplicated parameters)

### ✅ Standardized Files
- `core/schemas/common_schemas.py` - Single source of truth
- `config/settings.py` - Imports unified configuration
- `apps/*/schemas/*.py` - Use canonical imports
- `docs/README.md` - Comprehensive documentation index

## 🎯 Benefits

1. **No Duplication**: Single source of truth for all schemas
2. **Consistency**: All endpoints follow the same patterns
3. **Maintainability**: Easy to update tags and responses globally
4. **Documentation**: Clear structure and comprehensive guides
5. **Developer Experience**: Standardized imports and usage patterns

## 🚀 Next Steps

1. **Update existing schemas** to use canonical imports
2. **Test documentation generation** with new structure
3. **Verify all endpoints** use correct tags
4. **Update deployment scripts** if needed
5. **Train team** on new canonical structure

---

*This canonical structure ensures consistency, maintainability, and excellent developer experience.*
