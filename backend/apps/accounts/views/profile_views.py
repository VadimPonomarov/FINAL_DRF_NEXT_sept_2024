"""
Unified Profile Views - Cascading data loading for all profile tabs
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db.models import Count, Q, Prefetch
from django.db import transaction
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
import requests
import urllib.parse

from apps.users.serializers import UserSerializer
from apps.accounts.serializers import AddsAccountSerializer
from apps.accounts.models import RawAccountAddress
from apps.accounts.serializers.addresses.serializers import RawAccountAddressSerializer

User = get_user_model()


@swagger_auto_schema(
    method='get',
    operation_summary="👤 Full Profile Data",
    operation_description="Get all profile data in a single request: user profile, account data, addresses, and completion percentage.",
    tags=['👤 Users'],
    responses={
        200: openapi.Response(
            description='Full profile data retrieved successfully',
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                    'data': openapi.Schema(
                        type=openapi.TYPE_OBJECT,
                        properties={
                            'user_profile': openapi.Schema(type=openapi.TYPE_OBJECT),
                            'account_data': openapi.Schema(type=openapi.TYPE_OBJECT),
                            'addresses': openapi.Schema(type=openapi.TYPE_ARRAY, items=openapi.Schema(type=openapi.TYPE_OBJECT)),
                            'profile_completion': openapi.Schema(type=openapi.TYPE_INTEGER, description='Completion percentage')
                        }
                    )
                }
            )
        ),
        401: openapi.Response(description='Authentication required'),
        500: openapi.Response(description='Failed to retrieve profile data')
    }
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_full_profile_data(request):
    """
    Get all profile data in a single request:
    - User profile
    - Account data
    - All addresses

    Returns unified response with all data needed for profile page.
    """
    try:
        user = request.user
        
        # Get user profile
        try:
            profile_serializer = UserSerializer(user)
            profile_data = profile_serializer.data
        except Exception as e:
            profile_data = None
            print(f"Profile error: {e}")
        
        # Get account data
        try:
            if hasattr(user, 'account_adds'):
                account_serializer = AddsAccountSerializer(user.account_adds)
                account_data = account_serializer.data
            else:
                account_data = None
        except Exception as e:
            account_data = None
            print(f"Account error: {e}")

        # Get all addresses
        try:
            if hasattr(user, 'account_adds') and user.account_adds:
                addresses = RawAccountAddress.objects.filter(account=user.account_adds).order_by('-created_at')
                addresses_serializer = RawAccountAddressSerializer(addresses, many=True)
                addresses_data = addresses_serializer.data
            else:
                addresses_data = []
        except Exception as e:
            addresses_data = []
            print(f"Addresses error: {e}")
        
        # Unified response
        response_data = {
            'user': {
                'id': user.id,
                'email': user.email,
                'is_active': user.is_active,
                'created_at': user.created_at,
                'updated_at': user.updated_at,
                'profile': profile_data
            },
            'account': account_data,
            'addresses': addresses_data,
            'stats': {
                'total_addresses': len(addresses_data),
                'profile_completion': calculate_profile_completion(profile_data, account_data, addresses_data)
            }
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {
                'error': 'Failed to load profile data',
                'detail': str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def calculate_profile_completion(profile_data, account_data, addresses_data):
    """Calculate profile completion percentage"""
    try:
        total_fields = 0
        completed_fields = 0

        # Profile fields (только те, что есть в ProfileModel)
        if profile_data and isinstance(profile_data, dict):
            profile_fields = ['name', 'surname', 'age', 'avatar']
            for field in profile_fields:
                total_fields += 1
                if profile_data.get(field):
                    completed_fields += 1

        # Account fields
        if account_data and isinstance(account_data, dict):
            account_fields = ['account_type', 'organization_name']
            for field in account_fields:
                total_fields += 1
                if account_data.get(field):
                    completed_fields += 1
    
        # Addresses
        total_fields += 1
        if addresses_data and isinstance(addresses_data, list) and len(addresses_data) > 0:
            completed_fields += 1

        return int((completed_fields / total_fields) * 100) if total_fields > 0 else 0

    except Exception as e:
        print(f"Error calculating profile completion: {e}")
        return 0


@swagger_auto_schema(
    method='get',
    operation_summary="📊 Profile Statistics",
    operation_description="Get profile statistics including addresses count, geocoding status, and account information.",
    tags=['👤 Users'],
    responses={
        200: openapi.Response(
            description='Profile statistics retrieved successfully',
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'addresses': openapi.Schema(
                        type=openapi.TYPE_OBJECT,
                        properties={
                            'total': openapi.Schema(type=openapi.TYPE_INTEGER),
                            'geocoded': openapi.Schema(type=openapi.TYPE_INTEGER),
                            'not_geocoded': openapi.Schema(type=openapi.TYPE_INTEGER)
                        }
                    ),
                    'account': openapi.Schema(
                        type=openapi.TYPE_OBJECT,
                        properties={
                            'type': openapi.Schema(type=openapi.TYPE_STRING),
                            'is_business': openapi.Schema(type=openapi.TYPE_BOOLEAN)
                        }
                    )
                }
            )
        ),
        401: openapi.Response(description='Authentication required'),
        500: openapi.Response(description='Failed to retrieve profile statistics')
    }
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_profile_stats(request):
    """Get profile statistics"""
    try:
        user = request.user
        
        # Count addresses
        addresses_count = RawAccountAddress.objects.filter(account=user.account_adds).count()

        # Count geocoded addresses
        geocoded_count = RawAccountAddress.objects.filter(
            account=user.account_adds,
            is_geocoded=True
        ).count()

        stats = {
            'addresses': {
                'total': addresses_count,
                'geocoded': geocoded_count,
                'not_geocoded': addresses_count - geocoded_count
            },
            'account': {
                'type': user.account_adds.account_type if hasattr(user, 'account_adds') else None,
                'is_business': user.account_adds.account_type == 'business' if hasattr(user, 'account_adds') else False
            }
        }
        
        return Response(stats, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {
                'error': 'Failed to load profile stats',
                'detail': str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ========================================
# CASCADING TAB ENDPOINTS WITH N+1 OPTIMIZATION
# ========================================

@swagger_auto_schema(
    method='get',
    operation_summary="👤 Personal Info Tab Data",
    operation_description="Get personal information tab data including user profile, settings, and statistics. Optimized with select_related/prefetch_related.",
    tags=['👤 Users'],
    responses={
        200: openapi.Response(
            description='Personal info tab data retrieved successfully',
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'user': openapi.Schema(type=openapi.TYPE_OBJECT),
                    'settings': openapi.Schema(type=openapi.TYPE_OBJECT),
                    'stats': openapi.Schema(type=openapi.TYPE_OBJECT)
                }
            )
        ),
        401: openapi.Response(description='Authentication required'),
        404: openapi.Response(description='User not found'),
        500: openapi.Response(description='Failed to load personal info tab data')
    }
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_personal_info_tab_data(request):
    """
    TAB 1: Особиста інформація
    Cascading load: User Profile + Settings + Statistics
    Optimized with select_related/prefetch_related
    """
    try:
        from django.utils import timezone

        user = request.user

        # Optimized query with select_related to avoid N+1
        user_with_profile = User.objects.select_related(
            'profile',
            'account_adds',
            'account_adds__address'  # OneToOneField, используем select_related
        ).get(id=user.id)

        # Profile data
        profile_serializer = UserSerializer(user_with_profile)
        profile_data = profile_serializer.data

        # User settings (можно расширить)
        user_settings = {
            'language': 'uk',  # Можно добавить поле в модель
            'timezone': 'Europe/Kiev',
            'notifications_enabled': True,
            'email_notifications': True
        }

        # Statistics (OneToOneField - либо есть адрес, либо нет)
        addresses_count = 1 if (hasattr(user_with_profile, 'account_adds') and
                               hasattr(user_with_profile.account_adds, 'address') and
                               user_with_profile.account_adds.address) else 0

        stats = {
            'profile_completion': calculate_profile_completion_optimized(user_with_profile),
            'addresses_count': addresses_count,
            'account_age_days': (timezone.now() - user_with_profile.created_at).days,
            'last_login': user_with_profile.last_login
        }

        response_data = {
            'user': {
                'id': user_with_profile.id,
                'email': user_with_profile.email,
                'is_active': user_with_profile.is_active,
                'created_at': user_with_profile.created_at,
                'updated_at': user_with_profile.updated_at,
                'last_login': user_with_profile.last_login,
                'profile': profile_data.get('profile')
            },
            'settings': user_settings,
            'stats': stats
        }

        return Response(response_data, status=status.HTTP_200_OK)

    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {
                'error': 'Failed to load personal info tab data',
                'detail': str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@swagger_auto_schema(
    method='get',
    operation_summary="⚙️ Account Settings Tab Data",
    operation_description="Get account settings data for TAB 2. Includes account info, business data, notifications, and preferences.",
    tags=['🏢 Account Management'],
    responses={
        200: openapi.Response(
            description='Account settings data retrieved successfully',
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                    'data': openapi.Schema(
                        type=openapi.TYPE_OBJECT,
                        properties={
                            'account_data': openapi.Schema(type=openapi.TYPE_OBJECT),
                            'business_data': openapi.Schema(type=openapi.TYPE_OBJECT),
                            'notification_settings': openapi.Schema(type=openapi.TYPE_OBJECT),
                            'preferences': openapi.Schema(type=openapi.TYPE_OBJECT)
                        }
                    )
                }
            )
        ),
        401: openapi.Response(description='Authentication required'),
        500: openapi.Response(description='Failed to retrieve account settings')
    }
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_account_settings_tab_data(request):
    """
    TAB 2: Налаштування акаунта
    Cascading load: Account + Business Data + Notifications + Preferences
    Optimized with select_related/prefetch_related
    """
    try:
        user = request.user

        # Optimized query to get account with related data
        user_with_account = User.objects.select_related(
            'account_adds',
            'profile'
        ).prefetch_related(
            # Можно добавить связанные модели для уведомлений
        ).get(id=user.id)

        # Account data
        account_data = None
        if hasattr(user_with_account, 'account_adds'):
            account_serializer = AddsAccountSerializer(user_with_account.account_adds)
            account_data = account_serializer.data

        # Business settings (если аккаунт бизнес)
        business_settings = {}
        if account_data and account_data.get('account_type') == 'business':
            business_settings = {
                'business_name': account_data.get('business_name', ''),
                'tax_id': account_data.get('tax_id', ''),
                'business_address': account_data.get('business_address', ''),
                'business_phone': account_data.get('business_phone', ''),
                'business_email': account_data.get('business_email', ''),
                'business_website': account_data.get('business_website', ''),
                'business_description': account_data.get('business_description', '')
            }

        # Notification preferences
        notification_settings = {
            'email_notifications': True,
            'sms_notifications': False,
            'push_notifications': True,
            'marketing_emails': False,
            'new_message_notifications': True,
            'ad_status_notifications': True,
            'system_notifications': True
        }

        # Account preferences
        account_preferences = {
            'language': 'uk',
            'currency': 'UAH',
            'timezone': 'Europe/Kiev',
            'date_format': 'DD.MM.YYYY',
            'auto_renew_ads': True,
            'show_phone_in_ads': True,
            'allow_messages': True
        }

        # Account statistics
        account_stats = {
            'account_type': account_data.get('account_type') if account_data else 'individual',
            'is_verified': account_data.get('is_verified', False) if account_data else False,
            'created_at': account_data.get('created_at') if account_data else user_with_account.created_at,
            'last_updated': account_data.get('updated_at') if account_data else None
        }

        response_data = {
            'account': account_data,
            'business_settings': business_settings,
            'notification_settings': notification_settings,
            'account_preferences': account_preferences,
            'stats': account_stats
        }

        return Response(response_data, status=status.HTTP_200_OK)

    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {
                'error': 'Failed to load account settings tab data',
                'detail': str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@swagger_auto_schema(
    method='get',
    operation_summary="📍 Addresses Tab Data",
    operation_description="Get addresses tab data including all addresses, geocoding statistics, and address analytics. Optimized to avoid N+1 queries.",
    tags=['📍 Addresses'],
    responses={
        200: openapi.Response(
            description='Addresses tab data retrieved successfully',
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'addresses': openapi.Schema(type=openapi.TYPE_ARRAY, items=openapi.Schema(type=openapi.TYPE_OBJECT)),
                    'analytics': openapi.Schema(type=openapi.TYPE_OBJECT),
                    'geocoding_metrics': openapi.Schema(type=openapi.TYPE_OBJECT),
                    'region_distribution': openapi.Schema(type=openapi.TYPE_OBJECT),
                    'locality_distribution': openapi.Schema(type=openapi.TYPE_OBJECT)
                }
            )
        ),
        401: openapi.Response(description='Authentication required'),
        500: openapi.Response(description='Failed to load addresses tab data')
    }
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_addresses_tab_data(request):
    """
    TAB 3: Адреси
    Cascading load: All Addresses + Geocoding Stats + Address Analytics
    Optimized with select_related/prefetch_related to avoid N+1
    """
    try:
        user = request.user

        # Single optimized query to get all address data
        addresses_queryset = RawAccountAddress.objects.filter(
            account=user.account_adds
        ).select_related(
            'account',
            'account__user'
        ).order_by('-created_at')

        # Get addresses with serialization
        addresses_serializer = RawAccountAddressSerializer(addresses_queryset, many=True)
        addresses_data = addresses_serializer.data

        # Calculate statistics in Python to avoid additional queries
        total_addresses = len(addresses_data)
        geocoded_addresses = sum(1 for addr in addresses_data if addr.get('is_geocoded', False))
        not_geocoded_addresses = total_addresses - geocoded_addresses

        # Region statistics
        region_stats = {}
        locality_stats = {}

        for addr in addresses_data:
            # Region stats
            region = addr.get('region') or addr.get('input_region', 'Unknown')
            region_stats[region] = region_stats.get(region, 0) + 1

            # Locality stats
            locality = addr.get('locality') or addr.get('input_locality', 'Unknown')
            locality_stats[locality] = locality_stats.get(locality, 0) + 1

        # Address analytics
        address_analytics = {
            'total_addresses': total_addresses,
            'geocoded_addresses': geocoded_addresses,
            'not_geocoded_addresses': not_geocoded_addresses,
            'geocoding_success_rate': round((geocoded_addresses / total_addresses * 100), 2) if total_addresses > 0 else 0,
            'regions_count': len(region_stats),
            'localities_count': len(locality_stats),
            'most_used_region': max(region_stats, key=region_stats.get) if region_stats else None,
            'most_used_locality': max(locality_stats, key=locality_stats.get) if locality_stats else None
        }

        # Geocoding quality metrics
        geocoding_metrics = {
            'accuracy_levels': {
                'high': sum(1 for addr in addresses_data if addr.get('geocoding_accuracy') == 'high'),
                'medium': sum(1 for addr in addresses_data if addr.get('geocoding_accuracy') == 'medium'),
                'low': sum(1 for addr in addresses_data if addr.get('geocoding_accuracy') == 'low')
            },
            'coordinates_available': sum(1 for addr in addresses_data if addr.get('latitude') and addr.get('longitude')),
            'formatted_addresses': sum(1 for addr in addresses_data if addr.get('formatted_address'))
        }

        response_data = {
            'addresses': addresses_data,
            'analytics': address_analytics,
            'geocoding_metrics': geocoding_metrics,
            'region_distribution': dict(sorted(region_stats.items(), key=lambda x: x[1], reverse=True)),
            'locality_distribution': dict(sorted(locality_stats.items(), key=lambda x: x[1], reverse=True))
        }

        return Response(response_data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {
                'error': 'Failed to load addresses tab data',
                'detail': str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def calculate_profile_completion_optimized(user_with_relations):
    """
    Optimized profile completion calculation using prefetched data
    Avoids additional database queries
    """
    total_fields = 0
    completed_fields = 0

    # User basic fields (только те, что есть в UserModel)
    user_fields = ['email']
    for field in user_fields:
        total_fields += 1
        if getattr(user_with_relations, field, None):
            completed_fields += 1

    # Profile fields (using prefetched profile)
    if hasattr(user_with_relations, 'profile') and user_with_relations.profile:
        profile = user_with_relations.profile
        profile_fields = ['name', 'surname', 'age', 'avatar']
        for field in profile_fields:
            total_fields += 1
            if getattr(profile, field, None):
                completed_fields += 1

    # Account fields (using prefetched account)
    if hasattr(user_with_relations, 'account_adds') and user_with_relations.account_adds:
        account = user_with_relations.account_adds
        account_fields = ['account_type']
        for field in account_fields:
            total_fields += 1
            if getattr(account, field, None):
                completed_fields += 1

        # Business fields for business accounts
        if account.account_type == 'business':
            business_fields = ['organization_name']  # Используем правильное поле
            for field in business_fields:
                total_fields += 1
                if getattr(account, field, None):
                    completed_fields += 1

    # Addresses (OneToOneField - либо есть, либо нет)
    total_fields += 1
    if (hasattr(user_with_relations, 'account_adds') and
        user_with_relations.account_adds and
        hasattr(user_with_relations.account_adds, 'address') and
        user_with_relations.account_adds.address):
        completed_fields += 1

    return int((completed_fields / total_fields) * 100) if total_fields > 0 else 0


@swagger_auto_schema(
    method='post',
    operation_summary="🎨 Generate AI Avatar",
    operation_description="Generate an AI avatar using Pollinations.ai based on user profile data",
    tags=['👤 Users'],
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            'first_name': openapi.Schema(type=openapi.TYPE_STRING, description='First name'),
            'last_name': openapi.Schema(type=openapi.TYPE_STRING, description='Last name'),
            'age': openapi.Schema(type=openapi.TYPE_INTEGER, description='Age'),
            'gender': openapi.Schema(type=openapi.TYPE_STRING, description='Gender (male/female/neutral)'),
            'style': openapi.Schema(type=openapi.TYPE_STRING, description='Avatar style (realistic/professional/cartoon/etc)'),
            'custom_requirements': openapi.Schema(type=openapi.TYPE_STRING, description='Custom requirements'),
        },
        required=['first_name', 'age', 'gender']
    ),
    responses={
        200: openapi.Response(
            description='Avatar generated successfully',
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                    'avatar_url': openapi.Schema(type=openapi.TYPE_STRING, description='Generated avatar URL')
                }
            )
        ),
        401: openapi.Response(description='Authentication required'),
        500: openapi.Response(description='Failed to generate avatar')
    }
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_avatar(request):
    """
    Generate AI avatar using Pollinations.ai
    """
    try:
        data = request.data
        
        # Extract parameters
        first_name = data.get('first_name', 'Person')
        last_name = data.get('last_name', '')
        age = data.get('age', 25)
        gender = data.get('gender', 'neutral')
        style = data.get('style', 'realistic')
        custom_requirements = data.get('custom_requirements', '')
        
        # Build prompt for Pollinations.ai
        base_prompt = f"""SYSTEM: Generate all prompts in English only. Translate any non-English custom requirements to English.

Generate an avatar portrait for:

Person Details:
- Name: {first_name} {last_name}
- Age: {age} years old
- Gender: {gender}
- Style: {style}
- Custom Requirements: {custom_requirements}

Gender-specific Requirements:
{gender} appearance, balanced features, universal styling

Style-specific Requirements:
Photorealistic, natural lighting, professional photography

Avatar Requirements:
- High-quality portrait
- Clean background
- Friendly and approachable expression
- Well-lit face
- Sharp focus on eyes
- Age-appropriate appearance
- Incorporate custom requirements: {custom_requirements}

Technical Specifications:
- Square aspect ratio (1:1)
- High resolution
- Professional quality
- Suitable for profile picture use

Final Style: {style} style with custom elements"""
        
        # URL encode the prompt
        encoded_prompt = urllib.parse.quote(base_prompt)
        
        # Build Pollinations.ai URL
        avatar_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=1024&model=flux&nologo=true&private=false&enhance=false&safe=false"
        
        # Test if the URL is accessible (optional verification)
        try:
            response = requests.head(avatar_url, timeout=10)
            if response.status_code != 200:
                # Still return the URL even if HEAD fails - Pollinations may require GET
                pass
        except requests.RequestException:
            # Continue even if verification fails
            pass
        
        return Response({
            'success': True,
            'avatar_url': avatar_url
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)
