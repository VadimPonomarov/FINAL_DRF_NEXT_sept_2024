"""
Swagger/OpenAPI configuration for Django application.
"""

import os


def get_swagger_config():
    """Get Swagger configuration based on environment."""
    is_production = os.getenv('DJANGO_ENV', 'development') == 'production'
    
    return {
        'SECURITY_DEFINITIONS': {
            'Bearer': {
                'type': 'apiKey',
                'name': 'Authorization',
                'in': 'header'
            }
        },
        'USE_SESSION_AUTH': False,
        'JSON_EDITOR': True,
        'SUPPORTED_SUBMIT_METHODS': [
            'get',
            'post',
            'put',
            'delete',
            'patch'
        ],
        'OPERATIONS_SORTER': 'alpha',
        'TAGS_SORTER': 'alpha',
        'DOC_EXPANSION': 'none',
        'DEEP_LINKING': True,
        'SHOW_EXTENSIONS': True,
        'DEFAULT_MODEL_RENDERING': 'model',
        'DEFAULT_MODEL_DEPTH': 3,
        'VALIDATOR_URL': None if is_production else 'https://validator.swagger.io/validator',
        'PERSIST_AUTH': True,
        'DISPLAY_OPERATION_ID': False,
        'AUTO_SCHEMA_TYPE': 'openapi',
        'DEFAULT_AUTO_SCHEMA_CLASS': 'drf_yasg.inspectors.SwaggerAutoSchema',
        'DEFAULT_FIELD_INSPECTORS': [
            'drf_yasg.inspectors.CamelCaseJSONFilter',
            'drf_yasg.inspectors.InlineSerializerInspector',
            'drf_yasg.inspectors.RelatedFieldInspector',
            'drf_yasg.inspectors.ChoiceFieldInspector',
            'drf_yasg.inspectors.FileFieldInspector',
            'drf_yasg.inspectors.DictFieldInspector',
            'drf_yasg.inspectors.SimpleFieldInspector',
            'drf_yasg.inspectors.StringDefaultFieldInspector',
        ],
        'DEFAULT_FILTER_INSPECTORS': [
            'drf_yasg.inspectors.CoreAPICompatInspector',
        ],
        'DEFAULT_PAGINATOR_INSPECTORS': [
            'drf_yasg.inspectors.DjangoRestResponsePagination',
            'drf_yasg.inspectors.CoreAPICompatInspector',
        ],
        'REFETCH_SCHEMA_WITH_AUTH': True,
        'REFETCH_SCHEMA_ON_LOGOUT': True,
        'DEFAULT_API_URL': os.getenv('SWAGGER_DEFAULT_API_URL', 'http://localhost:8000'),
    }


# Swagger settings
SWAGGER_SETTINGS = get_swagger_config()

# Use compatibility renderers
SWAGGER_USE_COMPAT_RENDERERS = True
