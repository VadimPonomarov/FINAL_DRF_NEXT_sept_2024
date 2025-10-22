"""
Сервисный слой для объявлений автомобилей.
Содержит всю бизнес-логику и обеспечивает разделение ответственности.
"""
import logging
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Avg, Count, Max, Min, Q, QuerySet

from apps.accounts.models import AddsAccount
from apps.ads.models.car_ad_model import CarAd
from core.dto.car_ad_dto import (
    BodyTypeDTO,
    CarAdCreateDTO,
    CarAdListDTO,
    CarAdResponseDTO,
    CarAdUpdateDTO,
    ConditionDTO,
    CurrencyDTO,
    FuelTypeDTO,
    TransmissionDTO,
)
from core.enums.ads import AdStatusEnum
from core.exceptions.car_ad_exceptions import (
    CarAdImageError,
    CarAdLimitExceededError,
    CarAdModerationError,
    CarAdNotFoundError,
    CarAdPermissionError,
    CarAdValidationError,
)

logger = logging.getLogger(__name__)


class CarAdService:
    """
    Сервис для работы с объявлениями автомобилей.
    Содержит всю бизнес-логику и обеспечивает единообразный API.
    """

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def create_car_ad(self, user, dto: CarAdCreateDTO) -> CarAdResponseDTO:
        """
        Создание нового объявления автомобиля.
        
        Args:
            user: Пользователь, создающий объявление
            dto: DTO с данными объявления
            
        Returns:
            CarAdResponseDTO: Созданное объявление
            
        Raises:
            CarAdValidationError: Ошибка валидации
            CarAdLimitExceededError: Превышен лимит объявлений
        """
        try:
            # Проверяем лимиты аккаунта
            self._check_account_limits(user)
            
            # Валидируем данные
            self._validate_car_ad_data(dto)
            
            # Получаем или создаем аккаунт
            account = self._get_or_create_account(user)
            
            with transaction.atomic():
                # Создаем объявление
                car_ad = CarAd.objects.create(
                    title=dto.title,
                    description=dto.description,
                    price=dto.price,
                    currency=dto.currency.value if hasattr(dto.currency, 'value') else dto.currency,
                    year=dto.year,
                    mileage=dto.mileage,
                    brand=dto.brand,
                    model=dto.model,
                    generation=dto.generation,
                    modification=dto.modification,
                    color=dto.color,
                    region=dto.region,
                    city=dto.city,
                    contact_phone=dto.contact_phone,
                    contact_email=dto.contact_email,
                    features=dto.features or [],
                    condition=dto.condition.value if dto.condition and hasattr(dto.condition, 'value') else dto.condition,
                    fuel_type=dto.fuel_type.value if dto.fuel_type and hasattr(dto.fuel_type, 'value') else dto.fuel_type,
                    transmission=dto.transmission.value if dto.transmission and hasattr(dto.transmission, 'value') else dto.transmission,
                    body_type=dto.body_type.value if dto.body_type and hasattr(dto.body_type, 'value') else dto.body_type,
                    engine_size=dto.engine_size,
                    horsepower=dto.horsepower,
                    doors=dto.doors,
                    seats=dto.seats,
                    vin=dto.vin,
                    license_plate=dto.license_plate,
                    owners_count=dto.owners_count,
                    account=account,
                    status=AdStatusEnum.PENDING.value
                )
                
                # Обрабатываем изображения
                if dto.images:
                    self._process_images(car_ad, dto.images)
                
                self.logger.info(f"Car ad {car_ad.id} created by user {user.id}")
                
                return self._convert_to_response_dto(car_ad)
                
        except ValidationError as e:
            raise CarAdValidationError(
                detail=str(e),
                field_errors=getattr(e, 'field_errors', {})
            )
        except Exception as e:
            self.logger.error(f"Error creating car ad: {str(e)}")
            raise CarAdValidationError(detail="Failed to create car advertisement")

    def update_car_ad(self, user, ad_id: int, dto: CarAdUpdateDTO) -> CarAdResponseDTO:
        """
        Обновление объявления автомобиля.
        
        Args:
            user: Пользователь, обновляющий объявление
            ad_id: ID объявления
            dto: DTO с обновляемыми данными
            
        Returns:
            CarAdResponseDTO: Обновленное объявление
            
        Raises:
            CarAdNotFoundError: Объявление не найдено
            CarAdPermissionError: Нет прав на обновление
            CarAdValidationError: Ошибка валидации
        """
        try:
            car_ad = self._get_car_ad_by_id(ad_id)
            
            # Проверяем права доступа
            if not self._can_edit_car_ad(user, car_ad):
                raise CarAdPermissionError("You don't have permission to edit this advertisement")
            
            # Валидируем данные
            if dto.to_dict():
                self._validate_car_ad_data(dto, is_update=True)
            
            with transaction.atomic():
                # Обновляем поля
                update_data = dto.to_dict()
                for field, value in update_data.items():
                    if hasattr(car_ad, field):
                        setattr(car_ad, field, value)
                
                car_ad.status = AdStatusEnum.PENDING.value
                car_ad.save()
                
                # Обрабатываем изображения
                if dto.images is not None:
                    self._process_images(car_ad, dto.images)
                
                self.logger.info(f"Car ad {car_ad.id} updated by user {user.id}")
                
                return self._convert_to_response_dto(car_ad)
                
        except CarAdNotFoundError:
            raise
        except CarAdPermissionError:
            raise
        except ValidationError as e:
            raise CarAdValidationError(
                detail=str(e),
                field_errors=getattr(e, 'field_errors', {})
            )
        except Exception as e:
            self.logger.error(f"Error updating car ad {ad_id}: {str(e)}")
            raise CarAdValidationError(detail="Failed to update car advertisement")

    def delete_car_ad(self, user, ad_id: int) -> bool:
        """
        Удаление объявления автомобиля.
        
        Args:
            user: Пользователь, удаляющий объявление
            ad_id: ID объявления
            
        Returns:
            bool: True если удалено успешно
            
        Raises:
            CarAdNotFoundError: Объявление не найдено
            CarAdPermissionError: Нет прав на удаление
        """
        try:
            car_ad = self._get_car_ad_by_id(ad_id)
            
            # Проверяем права доступа
            if not self._can_edit_car_ad(user, car_ad):
                raise CarAdPermissionError("You don't have permission to delete this advertisement")
            
            with transaction.atomic():
                car_ad.delete()
                self.logger.info(f"Car ad {ad_id} deleted by user {user.id}")
                return True
                
        except CarAdNotFoundError:
            raise
        except CarAdPermissionError:
            raise
        except Exception as e:
            self.logger.error(f"Error deleting car ad {ad_id}: {str(e)}")
            raise

    def get_car_ad(self, ad_id: int, user=None) -> CarAdResponseDTO:
        """
        Получение объявления автомобиля по ID.
        
        Args:
            ad_id: ID объявления
            user: Пользователь (опционально)
            
        Returns:
            CarAdResponseDTO: Данные объявления
            
        Raises:
            CarAdNotFoundError: Объявление не найдено
        """
        try:
            car_ad = self._get_car_ad_by_id(ad_id)
            
            # Отслеживаем просмотр
            if user:
                self._track_view(car_ad, user)
            
            return self._convert_to_response_dto(car_ad)
            
        except CarAdNotFoundError:
            raise
        except Exception as e:
            self.logger.error(f"Error getting car ad {ad_id}: {str(e)}")
            raise

    def get_car_ads_list(self, filters: Optional[Dict[str, Any]] = None, 
                        search: Optional[str] = None, ordering: Optional[str] = None,
                        page: int = 1, page_size: int = 50) -> CarAdListDTO:
        """
        Получение списка объявлений с фильтрацией и пагинацией.
        
        Args:
            filters: Словарь фильтров
            search: Поисковый запрос
            ordering: Поле сортировки
            page: Номер страницы
            page_size: Размер страницы
            
        Returns:
            CarAdListDTO: Список объявлений с метаданными
        """
        try:
            queryset = self._build_filtered_queryset(filters, search, ordering)
            
            # Применяем пагинацию
            start = (page - 1) * page_size
            end = start + page_size
            
            total_count = queryset.count()
            car_ads = queryset[start:end]
            
            # Преобразуем в DTO
            results = [self._convert_to_response_dto(ad) for ad in car_ads]
            
            return CarAdListDTO(
                count=total_count,
                next=f"?page={page + 1}" if end < total_count else None,
                previous=f"?page={page - 1}" if page > 1 else None,
                results=results
            )
            
        except Exception as e:
            self.logger.error(f"Error getting car ads list: {str(e)}")
            raise

    def _check_account_limits(self, user) -> None:
        """Проверка лимитов аккаунта."""
        try:
            account = AddsAccount.objects.get(user=user)
            current_count = CarAd.objects.filter(account=account).count()
            
            if account.account_type == 'BASIC' and current_count >= 1:
                raise CarAdLimitExceededError(
                    detail="Basic account limit exceeded. Upgrade to premium for unlimited ads.",
                    current_count=current_count,
                    limit=1
                )
        except AddsAccount.DoesNotExist:
            # Аккаунт будет создан автоматически
            pass

    def _validate_car_ad_data(self, dto, is_update: bool = False) -> None:
        """Валидация данных объявления."""
        errors = {}
        
        # Валидация обязательных полей
        if not is_update or dto.title is not None:
            if not dto.title or len(dto.title.strip()) < 10:
                errors['title'] = "Title must be at least 10 characters long"
        
        if not is_update or dto.description is not None:
            if not dto.description or len(dto.description.strip()) < 50:
                errors['description'] = "Description must be at least 50 characters long"
        
        if not is_update or dto.price is not None:
            if dto.price is None or dto.price <= 0:
                errors['price'] = "Price must be positive"
        
        if not is_update or dto.year is not None:
            if dto.year is None or dto.year < 1900 or dto.year > 2030:
                errors['year'] = "Year must be between 1900 and 2030"
        
        if not is_update or dto.mileage is not None:
            if dto.mileage is None or dto.mileage < 0:
                errors['mileage'] = "Mileage must be non-negative"
        
        if errors:
            raise CarAdValidationError(
                detail="Validation failed",
                field_errors=errors
            )

    def _get_or_create_account(self, user) -> AddsAccount:
        """Получение или создание аккаунта пользователя."""
        account, created = AddsAccount.objects.get_or_create(
            user=user,
            defaults={
                'organization_name': f"{user.email} Account",
                'role': 'seller',
                'account_type': 'BASIC'
            }
        )
        return account

    def _get_car_ad_by_id(self, ad_id: int) -> CarAd:
        """Получение объявления по ID."""
        try:
            return CarAd.objects.select_related(
                'account', 'account__user', 'mark', 'moderated_by',
                'region', 'city'
            ).prefetch_related('images').get(id=ad_id)
        except CarAd.DoesNotExist:
            raise CarAdNotFoundError(f"Car advertisement with ID {ad_id} not found")

    def _can_edit_car_ad(self, user, car_ad: CarAd) -> bool:
        """Проверка прав на редактирование объявления."""
        return (user.is_authenticated and 
                (user.is_staff or car_ad.account.user == user))

    def _build_filtered_queryset(self, filters: Optional[Dict[str, Any]] = None,
                               search: Optional[str] = None, ordering: Optional[str] = None) -> QuerySet:
        """Построение отфильтрованного queryset."""
        queryset = CarAd.objects.filter(status='active').select_related(
            'account', 'account__user', 'mark', 'moderated_by',
            'region', 'city'
        ).prefetch_related('images')
        
        # Применяем фильтры
        if filters:
            if 'min_price' in filters:
                queryset = queryset.filter(price__gte=filters['min_price'])
            if 'max_price' in filters:
                queryset = queryset.filter(price__lte=filters['max_price'])
            if 'min_year' in filters:
                queryset = queryset.filter(year__gte=filters['min_year'])
            if 'max_year' in filters:
                queryset = queryset.filter(year__lte=filters['max_year'])
            if 'brand' in filters:
                queryset = queryset.filter(brand__iexact=filters['brand'])
            if 'model' in filters:
                queryset = queryset.filter(model__iexact=filters['model'])
            if 'region' in filters:
                queryset = queryset.filter(region__iexact=filters['region'])
            if 'city' in filters:
                queryset = queryset.filter(city__iexact=filters['city'])
            if 'currency' in filters:
                queryset = queryset.filter(currency=filters['currency'])
        
        # Применяем поиск
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(model__icontains=search)
            )
        
        # Применяем сортировку
        if ordering:
            queryset = queryset.order_by(ordering)
        else:
            queryset = queryset.order_by('-created_at')
        
        return queryset

    def _process_images(self, car_ad: CarAd, images: List[str]) -> None:
        """Обработка изображений объявления."""
        try:
            from apps.ads.models import AddImageModel

            # Удаляем старые изображения
            car_ad.images.all().delete()
            
            # Добавляем новые изображения
            for i, image_url in enumerate(images[:10]):  # Максимум 10 изображений
                AddImageModel.objects.create(
                    car_ad=car_ad,
                    image_url=image_url,
                    order=i,
                    is_primary=(i == 0)
                )
        except Exception as e:
            self.logger.error(f"Error processing images for car ad {car_ad.id}: {str(e)}")
            raise CarAdImageError(
                detail="Failed to process images",
                image_errors={'images': str(e)}
            )

    def _track_view(self, car_ad: CarAd, user) -> None:
        """Отслеживание просмотра объявления."""
        try:
            from ..services.view_tracker import AdViewTracker
            
            tracker = AdViewTracker()
            tracker.track_view(
                ad=car_ad,
                user=user if user.is_authenticated else None,
                ip_address="",  # IP будет получен в view
                user_agent=""
            )
        except Exception as e:
            self.logger.error(f"Error tracking view for car ad {car_ad.id}: {str(e)}")

    def _convert_to_response_dto(self, car_ad: CarAd) -> CarAdResponseDTO:
        """Преобразование модели в DTO ответа."""
        return CarAdResponseDTO(
            id=car_ad.id,
            title=car_ad.title,
            description=car_ad.description,
            price=car_ad.price,
            currency=car_ad.currency,
            year=car_ad.year,
            mileage=car_ad.mileage,
            brand=car_ad.brand,
            model=car_ad.model,
            generation=car_ad.generation,
            modification=car_ad.modification,
            color=car_ad.color,
            region=car_ad.region,
            city=car_ad.city,
            contact_phone=car_ad.contact_phone,
            contact_email=car_ad.contact_email,
            images=[img.image_url for img in car_ad.images.all()] if hasattr(car_ad, 'images') else [],
            features=car_ad.features or [],
            condition=car_ad.condition,
            fuel_type=car_ad.fuel_type,
            transmission=car_ad.transmission,
            body_type=car_ad.body_type,
            engine_size=car_ad.engine_size,
            horsepower=car_ad.horsepower,
            doors=car_ad.doors,
            seats=car_ad.seats,
            vin=car_ad.vin,
            license_plate=car_ad.license_plate,
            owners_count=car_ad.owners_count,
            status=car_ad.status,
            created_at=car_ad.created_at,
            updated_at=car_ad.updated_at,
            view_count=getattr(car_ad, 'view_count', 0),
            seller={
                'id': car_ad.account.user.id,
                'username': car_ad.account.user.username,
                'account_type': car_ad.account.account_type,
                'verified': car_ad.account.user.is_verified if hasattr(car_ad.account.user, 'is_verified') else False
            } if car_ad.account else None
        )
            owners_count=car_ad.owners_count,
            status=car_ad.status,
            created_at=car_ad.created_at,
            updated_at=car_ad.updated_at,
            view_count=getattr(car_ad, 'view_count', 0),
            seller={
                'id': car_ad.account.user.id,
                'username': car_ad.account.user.username,
                'account_type': car_ad.account.account_type,
                'verified': car_ad.account.user.is_verified if hasattr(car_ad.account.user, 'is_verified') else False
            } if car_ad.account else None
        )
