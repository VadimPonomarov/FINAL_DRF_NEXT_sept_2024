"""
Оптимизированная пагинация с улучшенной производительностью.
"""
from typing import Any, Dict, List, Optional

from django.core.paginator import Paginator
from django.db.models import QuerySet
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class OptimizedPageNumberPagination(PageNumberPagination):
    """
    Оптимизированная пагинация с улучшенной производительностью.
    Совместима с существующим CarAdPagination.
    """
    
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 10000  # Сохраняем совместимость с существующим кодом
    
    def paginate_queryset(self, queryset: QuerySet, request, view=None) -> Optional[List[Any]]:
        """
        Пагинация queryset с оптимизацией.
        
        Args:
            queryset: QuerySet для пагинации
            request: HTTP запрос
            view: View класс
            
        Returns:
            Список объектов страницы или None
        """
        # Получаем размер страницы
        page_size = self.get_page_size(request)
        
        # Если page_size=0, возвращаем все объекты
        if page_size == 0:
            return list(queryset)
        
        # Создаем пагинатор
        paginator = Paginator(queryset, page_size)
        
        # Получаем номер страницы
        page_number = request.query_params.get(self.page_query_param, 1)
        
        try:
            page_number = int(page_number)
        except (TypeError, ValueError):
            page_number = 1
        
        # Проверяем границы
        if page_number < 1:
            page_number = 1
        elif page_number > paginator.num_pages:
            page_number = paginator.num_pages
        
        # Получаем страницу
        try:
            page = paginator.page(page_number)
        except Exception:
            page = paginator.page(1)
        
        # Сохраняем информацию о пагинации
        self.page = page
        self.request = request
        
        return list(page.object_list)
    
    def get_paginated_response(self, data: List[Any]) -> Response:
        """
        Создание ответа с пагинацией.
        
        Args:
            data: Данные страницы
            
        Returns:
            Response с пагинацией
        """
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data,
            'page_info': {
                'current_page': self.page.number,
                'total_pages': self.page.paginator.num_pages,
                'page_size': self.page.paginator.per_page,
                'has_next': self.page.has_next(),
                'has_previous': self.page.has_previous()
            }
        })
    
    def get_next_link(self) -> Optional[str]:
        """Получение ссылки на следующую страницу."""
        if not self.page.has_next():
            return None
        
        url = self.request.build_absolute_uri()
        page_number = self.page.next_page_number()
        return self._replace_query_param(url, self.page_query_param, page_number)
    
    def get_previous_link(self) -> Optional[str]:
        """Получение ссылки на предыдущую страницу."""
        if not self.page.has_previous():
            return None
        
        url = self.request.build_absolute_uri()
        page_number = self.page.previous_page_number()
        return self._replace_query_param(url, self.page_query_param, page_number)
    
    def _replace_query_param(self, url: str, key: str, value: Any) -> str:
        """
        Замена параметра в URL.
        
        Args:
            url: URL
            key: Ключ параметра
            value: Новое значение
            
        Returns:
            URL с замененным параметром
        """
        from urllib.parse import parse_qs, urlencode, urlparse, urlunparse
        
        parsed = urlparse(url)
        query_params = parse_qs(parsed.query)
        query_params[key] = [str(value)]
        
        new_query = urlencode(query_params, doseq=True)
        return urlunparse((
            parsed.scheme, parsed.netloc, parsed.path,
            parsed.params, new_query, parsed.fragment
        ))


class CursorPagination(PageNumberPagination):
    """
    Пагинация с курсором для больших наборов данных.
    """
    
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 1000
    cursor_query_param = 'cursor'
    
    def paginate_queryset(self, queryset: QuerySet, request, view=None) -> Optional[List[Any]]:
        """
        Пагинация с курсором.
        
        Args:
            queryset: QuerySet для пагинации
            request: HTTP запрос
            view: View класс
            
        Returns:
            Список объектов страницы или None
        """
        # Получаем курсор
        cursor = request.query_params.get(self.cursor_query_param)
        
        if cursor:
            # Фильтруем по курсору
            queryset = queryset.filter(id__gt=cursor)
        
        # Получаем размер страницы
        page_size = self.get_page_size(request)
        
        # Ограничиваем queryset
        queryset = queryset[:page_size + 1]
        
        # Получаем объекты
        objects = list(queryset)
        
        # Проверяем, есть ли следующая страница
        has_next = len(objects) > page_size
        if has_next:
            objects = objects[:page_size]
        
        # Сохраняем информацию
        self.has_next = has_next
        self.next_cursor = objects[-1].id if objects and has_next else None
        
        return objects
    
    def get_paginated_response(self, data: List[Any]) -> Response:
        """
        Создание ответа с пагинацией курсора.
        
        Args:
            data: Данные страницы
            
        Returns:
            Response с пагинацией
        """
        response_data = {
            'results': data,
            'has_next': self.has_next,
            'next_cursor': self.next_cursor
        }
        
        if self.next_cursor:
            response_data['next'] = self._get_next_url()
        
        return Response(response_data)
    
    def _get_next_url(self) -> str:
        """Получение URL следующей страницы."""
        url = self.request.build_absolute_uri()
        return self._replace_query_param(url, self.cursor_query_param, self.next_cursor)
    
    def _replace_query_param(self, url: str, key: str, value: Any) -> str:
        """Замена параметра в URL."""
        from urllib.parse import parse_qs, urlencode, urlparse, urlunparse
        
        parsed = urlparse(url)
        query_params = parse_qs(parsed.query)
        query_params[key] = [str(value)]
        
        new_query = urlencode(query_params, doseq=True)
        return urlunparse((
            parsed.scheme, parsed.netloc, parsed.path,
            parsed.params, new_query, parsed.fragment
        ))
        ))
