"""
Базовые классы для объявлений автомобилей.
Устраняет дублирование кода и обеспечивает единообразие.
"""

from typing import Any, Dict, List, Optional

from django.db.models import QuerySet
from django_filters.rest_framework import DjangoFilterBackend
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import generics, status
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.ads.filters import CarAdFilter
from apps.ads.models.car_ad_model import CarAd
from apps.ads.serializers.car_ad_serializer import CarAdSerializer
from core.pagination import CarAdPagination
from core.permissions import IsOwnerOrSuperUserWrite


class BaseAdListView(generics.ListAPIView):
    """
    Базовый класс для списка объявлений.
    Содержит общую логику фильтрации, поиска и пагинации.
    """

    serializer_class = CarAdSerializer
    pagination_class = CarAdPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = CarAdFilter
    search_fields = ["title", "description", "model"]
    ordering_fields = [
        "created_at",
        "updated_at",
        "price",
        "title",
        "year_sort",
        "mileage_sort",
    ]
    ordering = ["-created_at"]
    permission_classes = [AllowAny]

    def get_queryset(self) -> QuerySet:
        """
        Оптимизированный queryset с select_related для избежания N+1.
        """
        return (
            CarAd.objects.filter(status="active")
            .select_related(
                "account", "account__user", "mark", "moderated_by", "region", "city"
            )
            .prefetch_related("images")
        )


class BaseAdCreateView(generics.CreateAPIView):
    """
    Базовый класс для создания объявлений.
    Содержит общую логику валидации и создания.
    """

    serializer_class = CarAdSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer) -> None:
        """
        Создание объявления с автоматическим созданием аккаунта.
        """
        from apps.accounts.models import AddsAccount
        from core.enums.ads import AdStatusEnum

        # Получаем или создаем аккаунт пользователя
        account, created = AddsAccount.objects.get_or_create(
            user=self.request.user,
            defaults={
                "organization_name": f"{self.request.user.email} Account",
                "role": "seller",
                "account_type": "BASIC",
            },
        )

        # Устанавливаем аккаунт и статус
        serializer.save(account=account, status=AdStatusEnum.PENDING.value)


class BaseAdDetailView(generics.RetrieveAPIView):
    """
    Базовый класс для детального просмотра объявлений.
    Содержит общую логику отслеживания просмотров.
    """

    serializer_class = CarAdSerializer
    permission_classes = [AllowAny]

    def get_queryset(self) -> QuerySet:
        """Возвращает все объявления для просмотра."""
        return (
            CarAd.objects.all()
            .select_related(
                "account", "account__user", "mark", "moderated_by", "region", "city"
            )
            .prefetch_related("images")
        )

    def retrieve(self, request, *args, **kwargs) -> Response:
        """
        Переопределяем для отслеживания просмотров.
        """
        instance = self.get_object()
        self._track_ad_view(instance, request)

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def _track_ad_view(self, ad: CarAd, request) -> None:
        """
        Отслеживание просмотра объявления.
        """
        from ..models.car_metadata_model import CarMetadataModel
        from ..services.view_tracker import AdViewTracker

        # Получаем информацию о клиенте
        client_ip = self._get_client_ip(request)
        user_agent = request.META.get("HTTP_USER_AGENT", "")

        # Создаем трекер
        tracker = AdViewTracker()
        tracker.track_view(
            ad=ad,
            user=request.user if request.user.is_authenticated else None,
            ip_address=client_ip,
            user_agent=user_agent,
        )

    def _get_client_ip(self, request) -> str:
        """Получение IP адреса клиента."""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0]
        return request.META.get("REMOTE_ADDR", "")


class BaseAdUpdateView(generics.UpdateAPIView):
    """
    Базовый класс для обновления объявлений.
    Содержит общую логику валидации и обновления.
    """

    serializer_class = CarAdSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self) -> QuerySet:
        """Возвращает объявления для редактирования."""
        if not self.request.user.is_authenticated:
            return CarAd.objects.none()
        return CarAd.objects.all().select_related("account")

    def perform_update(self, serializer) -> None:
        """
        Обновление объявления с логированием.
        """
        import logging

        from django.utils import timezone

        from core.enums.ads import AdStatusEnum

        logger = logging.getLogger(__name__)

        # Обновляем статус и время
        serializer.save(status=AdStatusEnum.PENDING.value, updated_at=timezone.now())

        logger.info(
            f"Car ad {serializer.instance.id} updated by user {self.request.user.id}"
        )


class BaseAdDeleteView(generics.DestroyAPIView):
    """
    Базовый класс для удаления объявлений.
    Содержит общую логику проверки прав и удаления.
    """

    serializer_class = CarAdSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self) -> QuerySet:
        """Возвращает объявления для удаления."""
        if not self.request.user.is_authenticated:
            return CarAd.objects.none()
        return CarAd.objects.all().select_related("account")

    def perform_destroy(self, instance) -> None:
        """
        Удаление объявления с логированием.
        """
        import logging

        logger = logging.getLogger(__name__)

        ad_id = instance.id
        user_id = self.request.user.id

        instance.delete()

        logger.info(f"Car ad {ad_id} deleted by user {user_id}")


class BaseAdListCreateView(generics.ListCreateAPIView):
    """
    Базовый класс для списка и создания объявлений.
    Объединяет функциональность BaseAdListView и BaseAdCreateView.
    """

    serializer_class = CarAdSerializer
    pagination_class = CarAdPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = CarAdFilter
    search_fields = ["title", "description", "model"]
    ordering_fields = [
        "created_at",
        "updated_at",
        "price",
        "title",
        "year_sort",
        "mileage_sort",
    ]
    ordering = ["-created_at"]

    def get_queryset(self) -> QuerySet:
        """Возвращает queryset в зависимости от метода."""
        if self.request.method == "GET":
            return (
                CarAd.objects.filter(status="active")
                .select_related(
                    "account", "account__user", "mark", "moderated_by", "region", "city"
                )
                .prefetch_related("images")
            )
        return CarAd.objects.all()

    def get_permissions(self):
        """Возвращает права доступа в зависимости от метода."""
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated()]


class BaseAdRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """
    Базовый класс для полного CRUD объявлений.
    Объединяет функциональность всех базовых классов.
    """

    serializer_class = CarAdSerializer

    def get_queryset(self) -> QuerySet:
        """Возвращает queryset в зависимости от метода."""
        if self.request.method == "GET":
            return (
                CarAd.objects.all()
                .select_related(
                    "account", "account__user", "mark", "moderated_by", "region", "city"
                )
                .prefetch_related("images")
            )
        return CarAd.objects.all().select_related("account")

    def get_permissions(self):
        """Возвращает права доступа в зависимости от метода."""
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated()]

    def retrieve(self, request, *args, **kwargs) -> Response:
        """Переопределяем для отслеживания просмотров."""
        instance = self.get_object()
        self._track_ad_view(instance, request)

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def _track_ad_view(self, ad: CarAd, request) -> None:
        """Отслеживание просмотра объявления."""
        from ..services.view_tracker import AdViewTracker

        client_ip = self._get_client_ip(request)
        user_agent = request.META.get("HTTP_USER_AGENT", "")

        tracker = AdViewTracker()
        tracker.track_view(
            ad=ad,
            user=request.user if request.user.is_authenticated else None,
            ip_address=client_ip,
            user_agent=user_agent,
        )

    def _get_client_ip(self, request) -> str:
        """Получение IP адреса клиента."""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0]
        return request.META.get("REMOTE_ADDR", "")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0]
        return request.META.get("REMOTE_ADDR", "")
