from .pagination import CustomPageNumberPagination, ReferenceDataPagination

# Alias for backward compatibility
StandardResultsSetPagination = CustomPageNumberPagination

__all__ = ['CustomPageNumberPagination', 'StandardResultsSetPagination', 'ReferenceDataPagination']