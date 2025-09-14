from django.core.paginator import EmptyPage
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class CustomPageNumberPagination(PageNumberPagination):
    page_size = 50  # Увеличиваем размер страницы по умолчанию
    page_query_param = "page"
    page_size_query_param = "page_size"
    max_page_size = 10000  # Увеличиваем максимальный размер для справочных данных

    def get_paginated_response(self, data):
        try:
            prev_page = bool(self.page.previous_page_number())
        except EmptyPage:
            prev_page = False

        try:
            next_page = bool(self.page.next_page_number())
        except EmptyPage:
            next_page = False

        return Response(
            {
                "page": self.page.number,
                "total": self.page.paginator.count,
                "page_size": self.page_size,
                "prev": prev_page,
                "next": next_page,
                "results": data,
            }
        )


class ReferenceDataPagination(PageNumberPagination):
    """
    Pagination class for reference data (brands, models, colors, etc.)
    Returns large page sizes to get all reference data in one request
    """
    page_size = 5000  # Большой размер для справочных данных
    page_query_param = "page"
    page_size_query_param = "page_size"
    max_page_size = 10000  # Максимум 10000 записей за раз
