"""
Serializers for the CarAd model with LLM-based moderation.
"""

from typing import Any, Dict

from django.db.models import OuterRef, Q, Subquery
from rest_framework import serializers

from apps.ads.models import AddImageModel
from apps.ads.models.car_ad_model import CarAd
from apps.currency.services import CurrencyService
from core.serializers.base import BaseModelSerializer

# LLM moderation отключен - обрабатывается в view


class CarAdImageSerializer(serializers.ModelSerializer):
    """Serializer for car ad images"""

    image_display_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = AddImageModel
        fields = [
            "id",
            "image",
            "image_url",
            "image_display_url",
            "order",
            "is_primary",
            "caption",
        ]
        read_only_fields = ["id", "image_display_url"]

    def get_image_display_url(self, obj):
        """Return image URL - prioritize image_url (generated) over image (uploaded file)"""
        url = obj.get_image_url()
        if not url:
            return None
        
        # If URL is already absolute (starts with http), return as is
        if url.startswith('http'):
            return url
        
        # If URL starts with /media/, make it absolute using request context
        if url.startswith('/media/'):
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(url)
            # Fallback: return relative path (frontend will proxy through /api/media/)
            return url
        
        # For other relative paths, return as is (frontend will handle)
        return url


class CarAdSerializer(BaseModelSerializer):
    """
    Serializer for CarAd with LLM-based content moderation.

    This serializer handles standard field validation and LLM-based
    content moderation for titles and descriptions.
    """

    # Dynamic fields for car specifications
    dynamic_fields = serializers.JSONField(
        required=False,
        default=dict,
        help_text="Dynamic fields for car specifications (year, mileage, etc.)",
    )

    # Add choice fields for Swagger dropdowns (will be overridden in __init__)
    mark = serializers.PrimaryKeyRelatedField(
        read_only=True,  # Will be overridden in __init__
        help_text="Car mark/brand",
    )
    model = serializers.CharField(max_length=100, help_text="Car model name")

    # Contacts are now handled through the AdContact model relationship
    currency = serializers.ChoiceField(
        choices=[
            ("USD", "US Dollar"),
            ("EUR", "Euro"),
            ("UAH", "Ukrainian Hryvnia"),
        ],
        default="USD",
        help_text="Price currency",
    )
    seller_type = serializers.ChoiceField(
        choices=[
            ("private", "Private seller"),
            ("dealer", "Car dealer"),
            ("company", "Company"),
        ],
        default="private",
        help_text="Type of seller",
    )
    exchange_status = serializers.ChoiceField(
        choices=[
            ("no_exchange", "No exchange"),
            ("possible", "Exchange possible"),
            ("only_exchange", "Only exchange"),
        ],
        default="no_exchange",
        help_text="Exchange status",
    )

    # Images field
    images = CarAdImageSerializer(many=True, read_only=True)

    # Additional computed fields
    view_count = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()
    year = serializers.SerializerMethodField()
    mileage = serializers.SerializerMethodField()
    phone_views_count = serializers.SerializerMethodField()
    favorites_count = serializers.SerializerMethodField()
    # Debug/diagnostic counters from metadata (not deduplicated)
    meta_views_count = serializers.SerializerMethodField()
    meta_phone_views_count = serializers.SerializerMethodField()

    # Display names for foreign keys
    mark_name = serializers.CharField(source="mark.name", read_only=True)
    region_name = serializers.CharField(source="region.name", read_only=True)
    city_name = serializers.CharField(source="city.name", read_only=True)

    # Vehicle type from mark - both ID and name
    vehicle_type = serializers.IntegerField(
        source="mark.vehicle_type.id", read_only=True
    )
    vehicle_type_name = serializers.CharField(
        source="mark.vehicle_type.name", read_only=True
    )

    # Vehicle specifications
    body_type = serializers.CharField(source="specs.body_type", read_only=True)

    # Price in USD, EUR and UAH (converted from original currency)
    price_usd = serializers.SerializerMethodField()
    price_eur = serializers.SerializerMethodField()
    price_uah = serializers.SerializerMethodField()

    # Per-user favorite flag
    is_favorite = serializers.SerializerMethodField()

    class Meta(BaseModelSerializer.Meta):
        model = CarAd
        fields = [
            "id",
            "account",
            "mark",
            "model",
            "title",
            "description",
            "price",
            "currency",
            "dynamic_fields",
            "region",
            "city",
            "seller_type",
            "exchange_status",
            "is_validated",
            "validation_errors",
            "status",
            "moderated_by",
            "moderated_at",
            "moderation_reason",
            "images",
            "view_count",
            "user",
            "year",
            "mileage",
            "is_favorite",
            "created_at",
            "updated_at",
            "use_profile_contacts",
            "contact_name",
            "additional_info",
            "mark_name",
            "region_name",
            "city_name",
            "vehicle_type",
            "vehicle_type_name",
            "body_type",
            "price_usd",
            "price_eur",
            "price_uah",
            "phone_views_count",
            "favorites_count",
            "meta_views_count",
            "meta_phone_views_count",
        ]
        # Явно указываем все поля, включая наследуемые от BaseModelSerializer
        extra_kwargs = {
            **BaseModelSerializer.Meta.extra_kwargs,
            "account": {"read_only": True},  # Account cannot be changed during update
            "price": {"required": True},  # Цена обязательна
            "currency": {"required": True, "default": "USD"},  # Валюта обязательна с дефолтом
            "is_validated": {"read_only": True},
            "validation_errors": {"read_only": True},
            "status": {"read_only": True},
            "moderated_by": {"read_only": True},
            "moderated_at": {"read_only": True},
            "moderation_reason": {"read_only": True},
        }

    def __init__(self, *args, **kwargs):
        """Initialize serializer with dynamic querysets for dropdowns."""
        super().__init__(*args, **kwargs)

        # Import here to avoid circular imports
        from rest_framework import serializers

        from apps.ads.models import CarMarkModel, CarModel

        # Replace read-only fields with writable ones for dropdowns
        self.fields["mark"] = serializers.PrimaryKeyRelatedField(
            queryset=CarMarkModel.objects.all(),
            allow_null=True,
            required=False,
            help_text="Car mark/brand",
        )
        self.fields["model"] = serializers.CharField(
            max_length=100,
            required=True,
            help_text="Car model name (CharField in model)",
        )

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate the data using standard validation and LLM content moderation.
        Also check account type limitations for basic accounts.

        Args:
            attrs: Dictionary of attribute values

        Returns:
            Validated attributes

        Raises:
            serializers.ValidationError: If moderation fails or account limits exceeded
        """
        attrs = super().validate(attrs)

        # ✅ КРИТИЧЕСКАЯ ВАЛИДАЦИЯ: Проверка цены
        price = attrs.get("price")
        
        # Цена обязательна для создания нового объявления
        if price is None:
            raise serializers.ValidationError(
                {"price": "Price is required. Please specify a price for your ad."}
            )
        
        if price <= 0:
            raise serializers.ValidationError(
                {"price": "Price must be greater than zero."}
            )

        # ✅ КРИТИЧЕСКАЯ ВАЛИДАЦИЯ: Проверка dynamic_fields
        dynamic_fields = attrs.get("dynamic_fields", {})
        if dynamic_fields:
            # Проверка года
            year = dynamic_fields.get("year")
            if year is not None:
                current_year = 2025  # Можно использовать datetime.now().year
                if year < 1900 or year > current_year:
                    raise serializers.ValidationError(
                        {
                            "dynamic_fields": {
                                "year": f"Year must be between 1900 and {current_year}."
                            }
                        }
                    )

            # Проверка пробега
            mileage = dynamic_fields.get("mileage")
            if mileage is not None and mileage < 0:
                raise serializers.ValidationError(
                    {"dynamic_fields": {"mileage": "Mileage cannot be negative."}}
                )

            # Проверка объема двигателя
            engine_volume = dynamic_fields.get("engine_volume")
            if engine_volume is not None and (engine_volume <= 0 or engine_volume > 20):
                raise serializers.ValidationError(
                    {
                        "dynamic_fields": {
                            "engine_volume": "Engine volume must be between 0 and 20 liters."
                        }
                    }
                )

        # Проверка лимитов перенесена в perform_create при переводе в ACTIVE
        # DRAFT объявления создаются без проверки лимитов

        # Perform LLM moderation on content fields
        title = attrs.get("title", "")
        description = attrs.get("description", "")

        if title or description:
            # Интеллектуальная LLM-модерация
            try:
                from core.services.llm_moderation import (
                    llm_moderation_service,
                    moderate_car_ad_content,
                )

                # Собираем все поля для модерации
                all_fields = {
                    "model": attrs.get("model", ""),
                    "region": attrs.get("region", ""),
                    "city": attrs.get("city", ""),
                    "seller_type": attrs.get("seller_type", ""),
                    "exchange_status": attrs.get("exchange_status", ""),
                    "dynamic_fields": attrs.get("dynamic_fields", {}),
                }

                moderation_result = moderate_car_ad_content(
                    title=title or "",
                    description=description or "",
                    price=float(price) if price else None,
                    **all_fields,
                )

                # Проверяем результат модерации
                if moderation_result.status.value == "rejected":
                    # Создаем детальный ответ с цензурированным текстом
                    censored_title = self._apply_censorship(
                        title or "", moderation_result.censored_text
                    )
                    censored_description = self._apply_censorship(
                        description or "", moderation_result.censored_text
                    )

                    raise serializers.ValidationError(
                        {
                            "moderation_error": moderation_result.reason,
                            "suggestions": moderation_result.suggestions,
                            "flagged_content": moderation_result.flagged_text,
                            "censored_content": {
                                "title": censored_title,
                                "description": censored_description,
                                "mapping": moderation_result.censored_text,
                            },
                            "language_detected": moderation_result.language_detected,
                            "confidence": moderation_result.confidence,
                            "processing_time_ms": moderation_result.processing_time_ms,
                            "violations": [
                                v.value for v in moderation_result.violations
                            ],
                        }
                    )

            except ImportError:
                # Fallback к простой проверке если LLM недоступен
                profanity_words = ["блять", "хуй", "пизд", "сука", "дебил"]

                title_lower = title.lower() if title else ""
                description_lower = description.lower() if description else ""

                found_profanity = []
                for word in profanity_words:
                    if word in title_lower or word in description_lower:
                        found_profanity.append(word)

                if found_profanity:
                    raise serializers.ValidationError(
                        {
                            "moderation_error": "Profanity detected in content",
                            "suggestions": [
                                "Remove inappropriate language from title and description"
                            ],
                            "flagged_content": found_profanity,
                        }
                    )

            # Set validation status based on moderation
            attrs["is_validated"] = moderation_result.status.value == "approved"
            attrs["validation_errors"] = {
                "moderation_status": moderation_result.status.value,
                "confidence": moderation_result.confidence,
                "violations": [v.value for v in moderation_result.violations],
            }

        return attrs

    def _apply_censorship(self, text: str, censored_mapping: dict) -> str:
        """
        Применяет цензуру к тексту, заменяя найденные слова на цензурированные версии
        """
        if not text or not censored_mapping:
            return text

        result = text
        for original_word, censored_word in censored_mapping.items():
            # Заменяем слово с учетом регистра
            import re

            pattern = re.compile(re.escape(original_word), re.IGNORECASE)
            result = pattern.sub(censored_word, result)

        return result

    # Проверка лимитов перенесена в perform_create при переводе в ACTIVE
    # Эта функция больше не используется

    def to_representation(self, instance):
        """Customize the output representation."""
        data = super().to_representation(instance)

        # Add moderation status information
        data["moderation_info"] = {
            "status": instance.status,
            "is_validated": instance.is_validated,
            "moderated_at": instance.moderated_at,
            "moderated_by": instance.moderated_by.get_username()
            if instance.moderated_by
            else "Auto-moderation",
            "reason": instance.moderation_reason or "No reason provided",
        }

        # Add contacts from account
        if instance.account and hasattr(instance.account, "contacts"):
            from apps.accounts.serializers.contact_serializers import (
                AddsAccountContactSerializer,
            )

            contacts = instance.account.contacts.all()
            data["contacts"] = AddsAccountContactSerializer(contacts, many=True).data

        # Add LLM validation details if available
        if instance.validation_errors:
            data["moderation_info"].update(
                {
                    "llm_status": instance.validation_errors.get(
                        "moderation_status", "unknown"
                    ),
                    "confidence": instance.validation_errors.get("confidence", 0),
                    "violations": instance.validation_errors.get("violations", []),
                }
            )

        # Add dynamic fields information
        if instance.dynamic_fields:
            data["car_specs"] = {
                "year": instance.dynamic_fields.get("year"),
                "mileage": instance.dynamic_fields.get("mileage"),
                "engine_volume": instance.dynamic_fields.get("engine_volume"),
                "fuel_type": instance.dynamic_fields.get("fuel_type"),
                "transmission": instance.dynamic_fields.get("transmission"),
                "body_type": instance.dynamic_fields.get("body_type"),
                "color": instance.dynamic_fields.get("color"),
                "condition": instance.dynamic_fields.get("condition"),
                "owners_count": instance.dynamic_fields.get("owners_count"),
                "vin": instance.dynamic_fields.get("vin"),
            }

        return data

    def get_view_count(self, obj):
        """Подсчет уникальных просмотров по авторизованным пользователям: 1 user = 1. Анонимные просмотры не учитываются."""
        try:
            from ..models.analytics_models import AdInteraction

            owner_user = (
                obj.account.user
                if getattr(obj, "account", None) and getattr(obj.account, "user", None)
                else None
            )

            qs = AdInteraction.objects.filter(ad=obj, interaction_type="view")
            # Временно включаем владельца для тестирования
            # if owner_user:
            #     qs = qs.exclude(Q(user=owner_user))

            # Временно учитываем всех пользователей (включая анонимных)
            # users_count = qs.exclude(user__isnull=True).values('user_id').distinct().count()
            users_count = qs.values("user_id", "session_id").distinct().count()
            return users_count
        except Exception:
            return 0

    def get_user(self, obj):
        """Get user information for this ad."""
        if obj.account and obj.account.user:
            return {
                "id": obj.account.user.id,
                "email": obj.account.user.email,
                "account_type": "basic",  # For now, all users are basic
            }
        return None

    def get_year(self, obj):
        """Get the year from dynamic_fields."""
        return obj.dynamic_fields.get("year") if obj.dynamic_fields else None

    def get_mileage(self, obj):
        """Get the mileage from dynamic_fields."""
        return obj.dynamic_fields.get("mileage") if obj.dynamic_fields else None

    def get_price_usd(self, obj):
        """Convert price to USD using live rates via CurrencyService (UAH pivot)."""
        try:
            if not obj.price:
                return None
            amount = float(obj.price)
            from_currency = (obj.currency or "USD").upper()

            # Rates are stored as UAH per 1 unit of currency
            usd_uah = CurrencyService.get_rate("UAH", "USD")
            eur_uah = CurrencyService.get_rate("UAH", "EUR")
            if not usd_uah or not eur_uah:
                return None

            # Convert source amount to UAH first
            if from_currency == "UAH":
                amount_uah = amount
            elif from_currency == "USD":
                amount_uah = amount * float(usd_uah)
            elif from_currency == "EUR":
                amount_uah = amount * float(eur_uah)
            else:
                amount_uah = amount

            # Then convert UAH to USD
            price_usd = amount_uah / float(usd_uah)
            return round(price_usd, 2)
        except Exception:
            return None

    def get_price_eur(self, obj):
        """Convert price to EUR using live rates via CurrencyService (UAH pivot)."""
        try:
            if not obj.price:
                return None
            amount = float(obj.price)
            from_currency = (obj.currency or "USD").upper()

            # Rates are stored as UAH per 1 unit of currency
            usd_uah = CurrencyService.get_rate("UAH", "USD")
            eur_uah = CurrencyService.get_rate("UAH", "EUR")
            if not usd_uah or not eur_uah:
                return None

            # Convert source amount to UAH first
            if from_currency == "UAH":
                amount_uah = amount
            elif from_currency == "USD":
                amount_uah = amount * float(usd_uah)
            elif from_currency == "EUR":
                amount_uah = amount * float(eur_uah)
            else:
                amount_uah = amount

            # Then convert UAH to EUR
            price_eur = amount_uah / float(eur_uah)
            return round(price_eur, 2)
        except Exception:
            return None

    def get_price_uah(self, obj):
        """Convert price to UAH using live rates via CurrencyService."""
        try:
            if not obj.price:
                return None
            amount = float(obj.price)
            from_currency = (obj.currency or "USD").upper()

            # If already in UAH, return as is
            if from_currency == "UAH":
                return round(amount, 2)

            # Rates are stored as UAH per 1 unit of currency
            usd_uah = CurrencyService.get_rate("UAH", "USD")
            eur_uah = CurrencyService.get_rate("UAH", "EUR")
            if not usd_uah or not eur_uah:
                print(
                    f"[get_price_uah] Ad {obj.id}: Missing rates - usd_uah={usd_uah}, eur_uah={eur_uah}"
                )
                return None

            # Convert to UAH
            if from_currency == "USD":
                price_uah = amount * float(usd_uah)
            elif from_currency == "EUR":
                price_uah = amount * float(eur_uah)
            else:
                # Unknown currency, return None
                print(f"[get_price_uah] Ad {obj.id}: Unknown currency {from_currency}")
                return None

            return round(price_uah, 2)
        except Exception as e:
            print(f"[get_price_uah] Ad {obj.id}: Exception - {e}")
            return None

    def get_contacts(self, obj):
        """Get contacts from the associated account."""
        if obj.account and hasattr(obj.account, "contacts"):
            from apps.accounts.serializers.contact_serializers import (
                AddsAccountContactSerializer,
            )

            contacts = obj.account.contacts.all()
            return AddsAccountContactSerializer(contacts, many=True).data
        return []

    # Contact handling is now done through the AdContact model relationship

    def _update_account_contacts(self, account, contacts_data):
        """Update contacts for the given account."""
        from apps.accounts.models import AddsAccountContact

        # Clear existing contacts
        account.contacts.all().delete()

        # Create new contacts
        for contact_data in contacts_data:
            AddsAccountContact.objects.create(adds_account=account, **contact_data)
        # Log update
        print(
            f"[CarAdSerializer] Updated {len(contacts_data)} contacts for account {account.id}"
        )

    def get_is_favorite(self, obj):
        """Return whether current authenticated user has this ad in favorites."""
        try:
            request = self.context.get("request") if hasattr(self, "context") else None
            user = getattr(request, "user", None) if request else None
            if not user or not user.is_authenticated:
                return False
            from ..models.favorite_ad_model import FavoriteAd

            return FavoriteAd.objects.filter(user=user, car_ad=obj).exists()
        except Exception:
            return False

    def get_favorites_count(self, obj):
        """Подсчет количества пользователей, у которых это объявление в избранном."""
        try:
            from ..models.favorite_ad_model import FavoriteAd

            return FavoriteAd.objects.filter(car_ad=obj).count()
        except Exception:
            # Fallback: если модель недоступна, возвращаем 0
            return 0

    def get_phone_views_count(self, obj):
        """Уникальные показы телефона: 1 на пользователя, 1 на анонимную сессию. Действия владельца не учитываются."""
        try:
            from django.db.models import Q

            from ..models.analytics_models import AdInteraction

            qs = AdInteraction.objects.filter(ad=obj, interaction_type="phone_reveal")
            # Исключаем действия владельца, если поле owner_action присутствует
            try:
                qs = qs.filter(Q(owner_action=False) | Q(owner_action__isnull=True))
            except Exception:
                pass

            users_count = (
                qs.filter(user__isnull=False).values("user_id").distinct().count()
            )
            anon_count = (
                qs.filter(user__isnull=True).values("session_id").distinct().count()
            )
            return users_count + anon_count
        except Exception:
            # Fallback к метаданным
            try:
                return obj.metadata.phone_views_count if hasattr(obj, "metadata") else 0
            except Exception:
                return 0

    def get_meta_views_count(self, obj):
        """Простой счётчик из метаданных (для отладки инкрементов на бекенде)."""
        try:
            return obj.metadata.views_count if hasattr(obj, "metadata") else 0
        except Exception:
            return 0

    def get_meta_phone_views_count(self, obj):
        """Простой счётчик показа телефона из метаданных (для отладки)."""
        try:
            return obj.metadata.phone_views_count if hasattr(obj, "metadata") else 0
        except Exception:
            return 0
