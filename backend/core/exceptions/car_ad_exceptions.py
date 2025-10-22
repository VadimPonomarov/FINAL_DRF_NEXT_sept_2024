"""
Кастомные исключения для объявлений автомобилей.
Обеспечивает четкую обработку ошибок и информативные сообщения.
"""

from rest_framework import status
from rest_framework.exceptions import APIException


class CarAdValidationError(APIException):
    """Ошибка валидации объявления автомобиля."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Car advertisement validation failed"
    default_code = "car_ad_validation_error"

    def __init__(self, detail=None, code=None, field_errors=None):
        super().__init__(detail, code)
        self.field_errors = field_errors or {}


class CarAdNotFoundError(APIException):
    """Объявление автомобиля не найдено."""

    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Car advertisement not found"
    default_code = "car_ad_not_found"


class CarAdPermissionError(APIException):
    """Ошибка прав доступа к объявлению."""

    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "Permission denied for car advertisement"
    default_code = "car_ad_permission_denied"


class CarAdLimitExceededError(APIException):
    """Превышен лимит объявлений для аккаунта."""

    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "Car advertisement limit exceeded for account"
    default_code = "car_ad_limit_exceeded"

    def __init__(self, detail=None, code=None, current_count=None, limit=None):
        super().__init__(detail, code)
        self.current_count = current_count
        self.limit = limit


class CarAdModerationError(APIException):
    """Ошибка модерации объявления."""

    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = "Car advertisement moderation failed"
    default_code = "car_ad_moderation_error"

    def __init__(self, detail=None, code=None, moderation_result=None):
        super().__init__(detail, code)
        self.moderation_result = moderation_result


class CarAdImageError(APIException):
    """Ошибка обработки изображений объявления."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Car advertisement image processing failed"
    default_code = "car_ad_image_error"

    def __init__(self, detail=None, code=None, image_errors=None):
        super().__init__(detail, code)
        self.image_errors = image_errors or {}


class CarAdAnalyticsError(APIException):
    """Ошибка аналитики объявления."""

    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "Car advertisement analytics access denied"
    default_code = "car_ad_analytics_error"

    def __init__(self, detail=None, code=None, upgrade_required=None):
        super().__init__(detail, code)
        self.upgrade_required = upgrade_required


class CarAdSearchError(APIException):
    """Ошибка поиска объявлений."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Car advertisement search failed"
    default_code = "car_ad_search_error"

    def __init__(self, detail=None, code=None, search_errors=None):
        super().__init__(detail, code)
        self.search_errors = search_errors or {}


class CarAdFilterError(APIException):
    """Ошибка фильтрации объявлений."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Car advertisement filtering failed"
    default_code = "car_ad_filter_error"

    def __init__(self, detail=None, code=None, filter_errors=None):
        super().__init__(detail, code)
        self.filter_errors = filter_errors or {}


class CarAdGeocodingError(APIException):
    """Ошибка геокодирования для объявления."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Car advertisement geocoding failed"
    default_code = "car_ad_geocoding_error"

    def __init__(self, detail=None, code=None, location=None):
        super().__init__(detail, code)
        self.location = location


class CarAdFavoriteError(APIException):
    """Ошибка работы с избранными объявлениями."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Car advertisement favorite operation failed"
    default_code = "car_ad_favorite_error"

    def __init__(self, detail=None, code=None, operation=None):
        super().__init__(detail, code)
        self.operation = operation
