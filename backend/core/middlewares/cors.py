from django.http import HttpResponse
import os


class CORSMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        # Разрешенные источники для разработки
        self.allowed_origins = [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:8000',
            'http://127.0.0.1:8000'
        ]
        print(f"🔧 CORS Middleware initialized with allowed origins: {self.allowed_origins}")

    def __call__(self, request):
        origin = request.META.get('HTTP_ORIGIN', '')
        print(f"🔧 CORS: Processing request {request.method} {request.path} from origin: {origin}")

        # Проверяем, является ли origin разрешенным
        is_allowed_origin = origin in self.allowed_origins

        # Для разрешенных origins используем конкретный origin и разрешаем credentials
        # Для остальных используем '*' и запрещаем credentials
        if is_allowed_origin:
            allow_origin = origin
            allow_credentials = 'true'
            print(f"🔧 CORS: Allowing origin {origin} with credentials")
        else:
            allow_origin = '*'
            allow_credentials = 'false'
            print(f"🔧 CORS: Allowing ALL origins without credentials")

        # Обработка preflight запросов (OPTIONS)
        if request.method == "OPTIONS":
            print(f"🔧 CORS: Handling OPTIONS preflight request")
            response = HttpResponse()
            response["Access-Control-Allow-Origin"] = allow_origin
            response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, X-CSRFToken, X-Frame-Options, Accept, Accept-Encoding, DNT, Origin, User-Agent, X-API-Key, Cache-Control"
            response["Access-Control-Allow-Credentials"] = allow_credentials
            response["Access-Control-Max-Age"] = "86400"  # 24 часа
            response["Access-Control-Expose-Headers"] = "X-Frame-Options, Content-Security-Policy"
            response.status_code = 200
            print(f"🔧 CORS: OPTIONS response sent with status 200")
            return response

        # Обработка обычных запросов
        response = self.get_response(request)

        # Добавляем CORS заголовки к ответу
        response["Access-Control-Allow-Origin"] = allow_origin
        response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, X-CSRFToken, X-Frame-Options, Accept, Accept-Encoding, DNT, Origin, User-Agent, X-API-Key, Cache-Control"
        response["Access-Control-Allow-Credentials"] = allow_credentials
        response["Access-Control-Expose-Headers"] = "X-Frame-Options, Content-Security-Policy"

        print(f"🔧 CORS: Response sent with status {response.status_code}")
        return response