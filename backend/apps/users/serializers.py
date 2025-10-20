from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import ProfileModel
from config.extra_config.logger_config import logger
from core.enums.msg import MessagesEnum
from core.serializers.base import BaseModelSerializer
from core.serializers.file_upload import FileUploadSerializer
from core.services.jwt import JwtService, ActivateToken
from core.services.send_email import send_email_service

UserModel = get_user_model()


class ProfileSerializer(FileUploadSerializer, BaseModelSerializer):
    avatar = serializers.SerializerMethodField(read_only=True)
    avatar_url = serializers.URLField(required=False, allow_null=True)

    class Meta(BaseModelSerializer.Meta):
        model = ProfileModel
        fields = ("id", "name", "surname", "age", "avatar", "avatar_url", "created_at", "updated_at")

    def get_avatar(self, obj):
        """Return avatar URL - prioritize avatar_url (generated) over avatar (uploaded file)"""
        if obj.avatar_url:
            return obj.avatar_url
        elif obj.avatar:
            return obj.avatar.url
        return None


class UserSerializer(BaseModelSerializer):
    profile = ProfileSerializer(required=False, allow_null=True)
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta(BaseModelSerializer.Meta):
        model = UserModel
        fields = (
            "id",  # Добавляем поле id
            "email",
            "password",
            "password_confirm",
            "is_active",
            "is_staff",
            "is_superuser",
            "profile",
        )
        # id, created_at, updated_at автоматически наследуются от BaseModelSerializer
        # BaseModelSerializer.Meta.extra_kwargs already handles id, created_at, updated_at
        extra_kwargs = {
            **BaseModelSerializer.Meta.extra_kwargs,
            "password": {"write_only": True},
            "is_active": {"read_only": True},
            "is_staff": {"read_only": True},
            "is_superuser": {"read_only": True},
        }

    def validate_password(self, value):
        """Validate password using Django's password validators."""
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def validate(self, data):
        """Validate that passwords match."""
        password = data.get('password')
        password_confirm = data.get('password_confirm')

        if password and password_confirm and password != password_confirm:
            raise serializers.ValidationError({
                'password_confirm': 'Passwords do not match.'
            })

        return data

    @transaction.atomic
    def create(self, validated_data):
        try:
            with transaction.atomic():
                profile_data = validated_data.pop("profile", None)
                validated_data.pop("password_confirm", None)  # Remove password_confirm
                
                # Create the user
                user = UserModel.objects.create_user(
                    email=validated_data["email"],
                    password=validated_data["password"],
                    **{k: v for k, v in validated_data.items() if k not in ["email", "password"]}
                )

                # Create user profile if data provided
                if profile_data:
                    ProfileModel.objects.create(user=user, **profile_data)

                # Generate JWT activation token
                token = JwtService.create_token(user, ActivateToken)
                message = MessagesEnum.EMAIL_ACTIVATE.get_message(
                    token=token, resource="api/users/activate"
                )

                # Send activation email
                send_email_service(
                    title="Activate your account",
                    message=message,
                    to_email=validated_data["email"]
                )

                # Generate JWT tokens for the new user
                try:
                    # Create JWT refresh token (which also contains access token)
                    refresh = RefreshToken.for_user(user)
                    access_token = str(refresh.access_token)

                    # Store tokens as user attributes for API response
                    user._access_token = access_token
                    user._refresh_token = str(refresh)
                    user._token_type = 'Bearer'

                except Exception as token_error:
                    logger.warning(f"JWT token generation failed: {token_error}. User created without tokens.")

                # Always return the user object
                return user
                    
        except Exception as e:
            logger.error(f"Error in user creation: {e}")
            raise

    def to_representation(self, instance):
        """Add JWT tokens to the representation if they exist"""
        data = super().to_representation(instance)

        # Add tokens if they were generated during creation
        if hasattr(instance, '_access_token'):
            data['access_token'] = instance._access_token
        if hasattr(instance, '_refresh_token'):
            data['refresh_token'] = instance._refresh_token
        if hasattr(instance, '_token_type'):
            data['token_type'] = instance._token_type

        return data

    @transaction.atomic
    def update(self, instance, validated_data):
        import logging
        logger = logging.getLogger(__name__)

        logger.info(f"🔧 UserEditSerializer.update called with validated_data: {validated_data}")

        profile_data = validated_data.pop("profile", None)
        logger.info(f"🔧 Profile data extracted: {profile_data}")

        user = super().update(instance, validated_data)

        if profile_data:
            logger.info(f"🔧 Processing profile data: {profile_data}")

            if "avatar" in profile_data and profile_data["avatar"] is None:
                profile_data.pop("avatar")

            # Обрабатываем avatar_url для сгенерированных аватаров
            if "avatar_url" in profile_data:
                # Если передан avatar_url, сохраняем его и очищаем загруженный файл
                avatar_url = profile_data.get("avatar_url")
                if avatar_url:
                    profile_data["avatar_url"] = avatar_url
                    logger.info(f"🔧 Setting avatar_url: {avatar_url}")
                    # Не очищаем avatar файл, если он уже есть
                    # profile_data["avatar"] = None

            logger.info(f"🔧 Final profile_data before update_or_create: {profile_data}")
            profile, created = ProfileModel.objects.update_or_create(user=user, defaults=profile_data)
            logger.info(f"🔧 Profile {'created' if created else 'updated'}: {profile.id}")
            logger.info(f"🔧 Profile after save - avatar_url: {profile.avatar_url}, name: {profile.name}")
        else:
            logger.warning("🔧 No profile data to update")

        return user


class UserEditSerializer(UserSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = UserModel
        fields = ("id", "email", "is_staff", "is_superuser", "profile")
        extra_kwargs = {
            **BaseModelSerializer.Meta.extra_kwargs,
            "email": {"required": False},
            "is_staff": {"read_only": True},
            "is_superuser": {"read_only": True},
        }


class RequestPasswordResetSerializer(serializers.Serializer):
    """
    Serializer for requesting password reset by email.
    """
    email = serializers.EmailField(required=True)


class UserPasswordSerializer(BaseModelSerializer):
    token = serializers.CharField(required=True)

    class Meta(BaseModelSerializer.Meta):
        model = UserModel
        fields = ("password", "token")


class UserActivateSerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = UserModel
        fields = ("is_active",)


class UserSeedSerializer(BaseModelSerializer):
    """
    Serializer for creating users in seed commands without email activation.
    """
    profile = ProfileSerializer(required=False, allow_null=True)

    class Meta(BaseModelSerializer.Meta):
        model = UserModel
        fields = (
            "email",
            "password",
            "is_active",
            "is_staff",
            "is_superuser",
            "profile",
        )
        # id, created_at, updated_at are inherited from BaseModelSerializer
        extra_kwargs = {
            **BaseModelSerializer.Meta.extra_kwargs,
            "password": {"write_only": True},
        }

    @transaction.atomic
    def create(self, validated_data):
        """Create user without sending activation email."""
        try:
            profile_data = validated_data.pop("profile", None)
            # Use the manager's create_user method instead of direct creation
            user = UserModel.objects.create_user(
                email=validated_data["email"],
                password=validated_data["password"],
                **{k: v for k, v in validated_data.items() if k not in ["email", "password"]}
            )

            if profile_data:
                ProfileModel.objects.create(user=user, **profile_data)

            # No email sending for seed data
            return user
        except Exception as e:
            logger.error(f"Error in create(): {e}")
            raise


class AdminUserSerializer(BaseModelSerializer):
    """
    Serializer for admin operations on users (grant/revoke staff rights, etc.)
    """
    profile = ProfileSerializer(read_only=True)

    class Meta(BaseModelSerializer.Meta):
        model = UserModel
        fields = (
            "id",
            "email",
            "is_active",
            "is_staff",
            "is_superuser",
            "profile",
            "created_at",
            "updated_at",
        )
        # BaseModelSerializer.Meta.extra_kwargs already handles id, created_at, updated_at
        extra_kwargs = {
            **BaseModelSerializer.Meta.extra_kwargs,
            "email": {"read_only": True},
            "is_superuser": {"read_only": True},  # Only superuser can change this
        }

    def update(self, instance, validated_data):
        """Update user with admin privileges"""
        # Only allow updating specific admin fields
        allowed_fields = ['is_active', 'is_staff']
        for field in allowed_fields:
            if field in validated_data:
                setattr(instance, field, validated_data[field])

        instance.save()
        return instance


class UserPermissionsSerializer(serializers.Serializer):
    """
    Serializer for updating user permissions
    """
    is_staff = serializers.BooleanField(required=False)
    is_active = serializers.BooleanField(required=False)

    def validate(self, data):
        if not data:
            raise serializers.ValidationError("At least one permission field must be provided")
        return data


class AvatarSerializer(FileUploadSerializer, BaseModelSerializer):
    avatar = serializers.ImageField(required=True, allow_null=False)

    class Meta(BaseModelSerializer.Meta):
        model = ProfileModel
        fields = ("avatar",)

    def validate_avatar(self, value):
        """Validate uploaded avatar file"""
        if value is None:
            raise serializers.ValidationError("Avatar file is required")
        return self.validate_file(value)

    def update(self, instance, validated_data):
        """Update avatar file and clear generated avatar URL"""
        avatar_file = validated_data.get('avatar')
        if avatar_file:
            # Save uploaded file
            instance.avatar = avatar_file
            # Clear generated avatar URL when uploading new file
            instance.avatar_url = None
            instance.save()
        return instance
