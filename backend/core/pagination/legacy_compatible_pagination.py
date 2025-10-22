"""
Совместимые пагинаторы для плавного перехода.
Обеспечивает обратную совместимость с существующим кодом.
"""

from typing import Any, Dict, List, Optional

from django.core.paginator import Paginator
from django.db.models import QuerySet
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class LegacyCompatiblePagination(PageNumberPagination):
    """
    Пагинатор, полностью совместимый с существующим CarAdPagination.
    Сохраняет все особенности оригинального пагинатора.
    """

    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 10000  # Сохраняем оригинальный лимит

    def paginate_queryset(
        self, queryset: QuerySet, request, view=None
    ) -> Optional[List[Any]]:
        """
        Пагинация с полной совместимостью с оригинальным CarAdPagination.
        """
        try:
            raw = request.query_params.get(self.page_size_query_param)
            if raw is not None and str(raw) == "0":
                # Оригинальная логика для page_size=0
                from django.core.paginator import Paginator

                total = queryset.count()
                per_page = max(1, int(total))
                paginator = Paginator(queryset, per_page)
                page = paginator.page(1)
                return list(page.object_list)

            # Стандартная пагинация
            return super().paginate_queryset(queryset, request, view)

        except Exception:
            # Fallback к стандартной пагинации
            return super().paginate_queryset(queryset, request, view)

    def get_paginated_response(self, data: List[Any]) -> Response:
        """
        Стандартный ответ с пагинацией.
        """
        return super().get_paginated_response(data)


class EnhancedCarAdPagination(LegacyCompatiblePagination):
    """
    Улучшенная версия CarAdPagination с дополнительными возможностями.
    Наследует все особенности оригинального пагинатора.
    """

    def get_paginated_response(self, data: List[Any]) -> Response:
        """
        Расширенный ответ с дополнительной информацией.
        """
        response = super().get_paginated_response(data)

        # Добавляем дополнительную информацию в DEBUG режиме
        if hasattr(self, "page") and self.page:
            response.data["page_info"] = {
                "current_page": self.page.number,
                "total_pages": self.page.paginator.num_pages,
                "page_size": self.page.paginator.per_page,
                "has_next": self.page.has_next(),
                "has_previous": self.page.has_previous(),
                "start_index": self.page.start_index(),
                "end_index": self.page.end_index(),
            }

        return response


class SmartPagination(PageNumberPagination):
    """
    Умная пагинация с автоматическим выбором стратегии.
    """

    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 10000

    def paginate_queryset(
        self, queryset: QuerySet, request, view=None
    ) -> Optional[List[Any]]:
        """
        Умная пагинация с автоматическим выбором стратегии.
        """
        # Получаем размер страницы
        page_size = self.get_page_size(request)

        # Если page_size=0, возвращаем все объекты
        if page_size == 0:
            return list(queryset)

        # Для больших queryset используем оптимизированную пагинацию
        if queryset.count() > 10000:
            return self._optimized_pagination(queryset, request, page_size)

        # Для обычных случаев используем стандартную пагинацию
        return self._standard_pagination(queryset, request, page_size)

    def _standard_pagination(
        self, queryset: QuerySet, request, page_size: int
    ) -> List[Any]:
        """Стандартная пагинация."""
        paginator = Paginator(queryset, page_size)
        page_number = request.query_params.get(self.page_query_param, 1)

        try:
            page_number = int(page_number)
        except (TypeError, ValueError):
            page_number = 1

        if page_number < 1:
            page_number = 1
        elif page_number > paginator.num_pages:
            page_number = paginator.num_pages

        try:
            page = paginator.page(page_number)
        except Exception:
            page = paginator.page(1)

        self.page = page
        self.request = request

        return list(page.object_list)

    def _optimized_pagination(
        self, queryset: QuerySet, request, page_size: int
    ) -> List[Any]:
        """Оптимизированная пагинация для больших queryset."""
        page_number = request.query_params.get(self.page_query_param, 1)

        try:
            page_number = int(page_number)
        except (TypeError, ValueError):
            page_number = 1

        if page_number < 1:
            page_number = 1

        # Используем LIMIT/OFFSET для оптимизации
        offset = (page_number - 1) * page_size
        objects = list(queryset[offset : offset + page_size + 1])

        # Проверяем, есть ли следующая страница
        has_next = len(objects) > page_size
        if has_next:
            objects = objects[:page_size]

        # Создаем mock page для совместимости
        class MockPage:
            def __init__(self, objects, page_number, has_next):
                self.object_list = objects
                self.number = page_number
                self.has_next = lambda: has_next
                self.has_previous = lambda: page_number > 1
                self.start_index = lambda: (page_number - 1) * page_size + 1
                self.end_index = lambda: (page_number - 1) * page_size + len(objects)

        self.page = MockPage(objects, page_number, has_next)
        self.request = request

        return objects
        return objects
