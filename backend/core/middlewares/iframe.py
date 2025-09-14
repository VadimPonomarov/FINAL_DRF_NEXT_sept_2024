"""
Middleware для полного контроля заголовков iframe
DRY принцип - один источник истины для всех iframe настроек
"""
import logging

logger = logging.getLogger(__name__)

class AllowIframeMiddleware:
    """
    Middleware для полного контроля X-Frame-Options заголовков
    Перехватывает ВСЕ заголовки независимо от источника (Django, nginx, другие middleware)
    """

    # Пути, которые должны быть доступны в iframe
    IFRAME_ALLOWED_PATHS = [
        '/api/doc',      # Swagger документация
        '/api/doc/',     # Swagger документация с слешем
        '/api/docs',     # Альтернативный путь для документации
        '/api/docs/',    # Альтернативный путь для документации с слешем
        '/admin/doc',    # Django admin документация
        '/admin/doc/',   # Django admin документация с слешем
        '/health',       # Health check
        '/static/drf-yasg/',  # Статические файлы Swagger UI
    ]

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        print(f"🔧 AllowIframeMiddleware: Processing {request.path}")
        logger.info(f"🔧 AllowIframeMiddleware: Processing {request.path}")

        response = self.get_response(request)

        # Логируем исходные заголовки
        original_frame_options = response.get('X-Frame-Options', 'НЕТ')
        logger.info(f"📋 Исходный X-Frame-Options: {original_frame_options}")

        # ПРИНУДИТЕЛЬНО удаляем все варианты X-Frame-Options заголовков
        headers_to_remove = [
            'X-Frame-Options',
            'x-frame-options',
            'X-FRAME-OPTIONS',
            'x-Frame-Options'
        ]

        removed_headers = []
        for header in headers_to_remove:
            if header in response:
                del response[header]
                removed_headers.append(header)

        if removed_headers:
            logger.info(f"🗑️ Удалены заголовки: {removed_headers}")

        # Проверяем, разрешен ли путь для iframe
        path_allowed = any(
            request.path.startswith(allowed_path)
            for allowed_path in self.IFRAME_ALLOWED_PATHS
        )

        if path_allowed:
            # Для разрешенных путей - полностью убираем ограничения iframe
            logger.info(f"✅ Путь {request.path} разрешен для iframe - НЕ устанавливаем X-Frame-Options")
        else:
            # Для остальных путей - устанавливаем SAMEORIGIN для безопасности
            response['X-Frame-Options'] = 'SAMEORIGIN'
            logger.info(f"🔒 Путь {request.path} НЕ разрешен для iframe - устанавливаем SAMEORIGIN")

        # Финальная проверка
        final_frame_options = response.get('X-Frame-Options', 'НЕТ')
        logger.info(f"🎯 Финальный X-Frame-Options: {final_frame_options}")

        return response
