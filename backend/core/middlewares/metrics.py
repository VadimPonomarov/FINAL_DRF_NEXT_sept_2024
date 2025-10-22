"""
Middleware для сбора метрик производительности.
Отслеживает время выполнения запросов, использование памяти и другие показатели.
"""

import logging
import threading
import time
from typing import Any, Dict

import psutil
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)


class MetricsMiddleware(MiddlewareMixin):
    """
    Middleware для сбора метрик производительности.
    """

    def __init__(self, get_response):
        super().__init__(get_response)
        self.metrics = {}
        self.lock = threading.Lock()

    def process_request(self, request):
        """Обработка входящего запроса."""
        # Засекаем время начала обработки
        request._start_time = time.time()

        # Получаем информацию о системе
        request._start_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
        request._start_cpu = psutil.Process().cpu_percent()

        # Логируем начало обработки
        logger.info(f"Request started: {request.method} {request.path}")

    def process_response(self, request, response):
        """Обработка исходящего ответа."""
        try:
            # Вычисляем метрики
            end_time = time.time()
            processing_time = end_time - getattr(request, "_start_time", 0)

            end_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
            memory_used = end_memory - getattr(request, "_start_memory", 0)

            end_cpu = psutil.Process().cpu_percent()
            cpu_used = end_cpu - getattr(request, "_start_cpu", 0)

            # Собираем метрики
            metrics = {
                "path": request.path,
                "method": request.method,
                "status_code": response.status_code,
                "processing_time": round(processing_time, 4),
                "memory_used_mb": round(memory_used, 2),
                "cpu_used_percent": round(cpu_used, 2),
                "timestamp": time.time(),
                "user_agent": request.META.get("HTTP_USER_AGENT", ""),
                "ip_address": self._get_client_ip(request),
                "content_length": len(response.content)
                if hasattr(response, "content")
                else 0,
            }

            # Логируем метрики
            self._log_metrics(metrics)

            # Сохраняем метрики в thread-local storage
            self._store_metrics(metrics)

            # Добавляем заголовки с метриками (только в DEBUG режиме)
            if settings.DEBUG:
                response["X-Processing-Time"] = f"{processing_time:.4f}s"
                response["X-Memory-Used"] = f"{memory_used:.2f}MB"
                response["X-CPU-Used"] = f"{cpu_used:.2f}%"

        except Exception as e:
            logger.error(f"Error collecting metrics: {str(e)}")

        return response

    def process_exception(self, request, exception):
        """Обработка исключений."""
        try:
            # Засекаем время обработки исключения
            end_time = time.time()
            processing_time = end_time - getattr(request, "_start_time", 0)

            # Логируем метрики исключения
            exception_metrics = {
                "path": request.path,
                "method": request.method,
                "exception_type": type(exception).__name__,
                "exception_message": str(exception),
                "processing_time": round(processing_time, 4),
                "timestamp": time.time(),
                "ip_address": self._get_client_ip(request),
            }

            logger.error(f"Request failed: {exception_metrics}")

        except Exception as e:
            logger.error(f"Error collecting exception metrics: {str(e)}")

    def _get_client_ip(self, request) -> str:
        """Получение IP адреса клиента."""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0]
        return request.META.get("REMOTE_ADDR", "")

    def _log_metrics(self, metrics: Dict[str, Any]) -> None:
        """Логирование метрик."""
        # Логируем только медленные запросы (>1 секунды) или ошибки
        if metrics["processing_time"] > 1.0 or metrics["status_code"] >= 400:
            logger.warning(
                f"Slow request detected: {metrics['method']} {metrics['path']} "
                f"took {metrics['processing_time']}s, "
                f"memory: {metrics['memory_used_mb']}MB, "
                f"status: {metrics['status_code']}"
            )
        else:
            logger.info(
                f"Request completed: {metrics['method']} {metrics['path']} "
                f"in {metrics['processing_time']}s "
                f"(status: {metrics['status_code']})"
            )

    def _store_metrics(self, metrics: Dict[str, Any]) -> None:
        """Сохранение метрик в thread-local storage."""
        with self.lock:
            # Сохраняем последние 100 запросов
            if not hasattr(self, "_recent_metrics"):
                self._recent_metrics = []

            self._recent_metrics.append(metrics)

            # Ограничиваем размер списка
            if len(self._recent_metrics) > 100:
                self._recent_metrics.pop(0)

    def get_recent_metrics(self) -> list:
        """Получение последних метрик."""
        with self.lock:
            return getattr(self, "_recent_metrics", []).copy()

    def get_performance_summary(self) -> Dict[str, Any]:
        """Получение сводки по производительности."""
        metrics = self.get_recent_metrics()

        if not metrics:
            return {}

        # Вычисляем статистику
        processing_times = [m["processing_time"] for m in metrics]
        memory_usage = [m["memory_used_mb"] for m in metrics]
        status_codes = [m["status_code"] for m in metrics]

        return {
            "total_requests": len(metrics),
            "avg_processing_time": round(
                sum(processing_times) / len(processing_times), 4
            ),
            "max_processing_time": round(max(processing_times), 4),
            "min_processing_time": round(min(processing_times), 4),
            "avg_memory_usage": round(sum(memory_usage) / len(memory_usage), 2),
            "max_memory_usage": round(max(memory_usage), 2),
            "error_rate": round(
                len([s for s in status_codes if s >= 400]) / len(status_codes) * 100, 2
            ),
            "slow_requests": len([t for t in processing_times if t > 1.0]),
        }


class DatabaseMetricsMiddleware(MiddlewareMixin):
    """
    Middleware для отслеживания метрик базы данных.
    """

    def __init__(self, get_response):
        super().__init__(get_response)
        self.query_count = 0
        self.query_time = 0
        self.lock = threading.Lock()

    def process_request(self, request):
        """Сброс счетчиков для нового запроса."""
        self.query_count = 0
        self.query_time = 0

    def process_response(self, request, response):
        """Добавление метрик БД в заголовки ответа."""
        if settings.DEBUG and hasattr(self, "query_count"):
            response["X-DB-Queries"] = str(self.query_count)
            response["X-DB-Time"] = f"{self.query_time:.4f}s"

        return response
        return response
