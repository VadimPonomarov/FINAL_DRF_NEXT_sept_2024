from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from drf_yasg.utils import swagger_auto_schema
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.accounts.models import RawAccountAddress, AddsAccount
from apps.accounts.serializers.addresses.serializers import RawAccountAddressSerializer
from apps.accounts.filters import RawAccountAddressFilter
from core.permissions import IsOwnerOrReadOnly
from core.services.llm_moderation import llm_moderation_service

@swagger_auto_schema(
    method='get',
    operation_summary="List all raw addresses",
    operation_description="""
    Returns a list of all raw addresses for the authenticated user's account.
    
    ### Permissions:
    - User must be authenticated
    - User can only see their own account's addresses
    """,
    responses={
        200: RawAccountAddressSerializer(many=True),
        401: 'Authentication credentials were not provided.'
    },
    tags=['📍 Addresses']
)
@swagger_auto_schema(
    method='post',
    operation_summary="Create a new raw address",
    operation_description="""
    Create a new raw address for the authenticated user's account.
    
    ### Permissions:
    - User must be authenticated
    - The address will be associated with the user's account
    
    ### Request Body:
    - `country` (string): Country name
    - `region` (string, optional): Region/state
    - `district` (string, optional): District/county
    - `locality` (string, optional): City/town
    - `street` (string, optional): Street name
    - `building` (string, optional): Building number/name
    - `apartment` (string, optional): Apartment/unit number
    - `postal_code` (string, optional): Postal/ZIP code
    """,
    request_body=RawAccountAddressSerializer,
    responses={
        201: RawAccountAddressSerializer(),
        400: 'Invalid input',
        401: 'Authentication credentials were not provided.'
    },
    tags=['📍 Addresses']
)
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsOwnerOrReadOnly])
def raw_address_list_create(request):
    """
    API endpoint that allows viewing and creating raw account addresses.
    """
    if request.method == 'GET':
        queryset = RawAccountAddress.objects.filter(account__user=request.user)
        serializer = RawAccountAddressSerializer(queryset, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Get the user's account
        account = get_object_or_404(AddsAccount.objects.filter(user=request.user))
        
        serializer = RawAccountAddressSerializer(
            data=request.data, 
            context={'request': request, 'account': account}
        )
        
        if serializer.is_valid():
            serializer.save(account=account)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def _trigger_geocoding(address_instance):
    """Helper method to trigger geocoding for an address."""
    try:
        # Geocoding is now handled automatically in RawAccountAddress model
        # Just save the instance to trigger the geocoding process
        address_instance.save()
    except Exception as e:
        # Log the error but don't fail the request
        # The address will be processed later by a background task
        pass

@swagger_auto_schema(
    method='get',
    operation_summary="Retrieve a raw address",
    operation_description="""
    Retrieve details of a specific raw address.
    
    ### Permissions:
    - User must be authenticated
    - User must own the address
    
    ### Path Parameters:
    - `pk` (integer): The ID of the raw address to retrieve
    """,
    responses={
        200: RawAccountAddressSerializer(),
        401: 'Authentication credentials were not provided.',
        404: 'Address not found or access denied.'
    },
    tags=['📍 Addresses']
)
@swagger_auto_schema(
    method='put',
    operation_summary="Update a raw address (full update)",
    operation_description="""
    Update an existing raw address (full update).
    
    ### Permissions:
    - User must be authenticated
    - User must own the address
    
    ### Path Parameters:
    - `pk` (integer): The ID of the raw address to update
    
    ### Request Body:
    All fields must be provided for a full update.
    """,
    request_body=RawAccountAddressSerializer,
    responses={
        200: RawAccountAddressSerializer(),
        400: 'Invalid input',
        401: 'Authentication credentials were not provided.',
        403: 'You do not have permission to update this address.',
        404: 'Address not found or access denied.'
    },
    tags=['📍 Addresses']
)
@swagger_auto_schema(
    method='patch',
    operation_summary="Partially update a raw address",
    operation_description="""
    Partially update an existing raw address (PATCH).
    
    ### Permissions:
    - User must be authenticated
    - User must own the address
    
    ### Path Parameters:
    - `pk` (integer): The ID of the raw address to update
    
    ### Request Body:
    Only include the fields that need to be updated.
    """,
    request_body=RawAccountAddressSerializer,
    responses={
        200: RawAccountAddressSerializer(),
        400: 'Invalid input',
        401: 'Authentication credentials were not provided.',
        403: 'You do not have permission to update this address.',
        404: 'Address not found or access denied.'
    },
    tags=['📍 Addresses']
)
@swagger_auto_schema(
    method='delete',
    operation_summary="Delete a raw address",
    operation_description="""
    Delete a raw address.
    
    ### Permissions:
    - User must be authenticated
    - User must own the address
    
    ### Path Parameters:
    - `pk` (integer): The ID of the raw address to delete
    
    ### Response:
    - 204: Address was successfully deleted
    - 401: Authentication credentials were not provided
    - 403: You do not have permission to delete this address
    - 404: Address not found or access denied
    """,
    responses={
        204: 'Address was successfully deleted',
        401: 'Authentication credentials were not provided.',
        403: 'You do not have permission to delete this address.',
        404: 'Address not found or access denied.'
    },
    tags=['📍 Addresses']
)
@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated, IsOwnerOrReadOnly])
def raw_address_retrieve_update_destroy(request, pk):
    """
    API endpoint that allows retrieving, updating and deleting raw account addresses.
    """
    # Get the address, ensuring it belongs to the current user
    try:
        address = RawAccountAddress.objects.get(pk=pk, account__user=request.user)
    except RawAccountAddress.DoesNotExist:
        return Response(
            {'detail': 'Address not found or access denied.'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'GET':
        serializer = RawAccountAddressSerializer(address)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        # Full update
        serializer = RawAccountAddressSerializer(
            address, 
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            # Save the updated address
            updated_address = serializer.save()
            
            # Trigger geocoding after update
            _trigger_geocoding(updated_address)
            
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'PATCH':
        # Partial update
        serializer = RawAccountAddressSerializer(
            address, 
            data=request.data, 
            partial=True,
            context={'request': request}
        )
        
        if serializer.is_valid():
            # Save the updated address
            updated_address = serializer.save()
            
            # Trigger geocoding after update
            _trigger_geocoding(updated_address)
            
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        address.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@swagger_auto_schema(
    method='delete',
    operation_summary="Delete a raw account address",
    operation_description="Delete a raw account address by ID.",
    responses={
        204: 'Address deleted successfully',
        404: 'Address not found or access denied.'
    },
    tags=['📍 Addresses']
)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsOwnerOrReadOnly])
def raw_address_delete(request, pk):
    """
    Delete a raw account address.
    """
    try:
        # Get the address, ensuring it belongs to the current user
        address = RawAccountAddress.objects.get(
            pk=pk,
            account__user=request.user
        )

        address.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    except RawAccountAddress.DoesNotExist:
        return Response(
            {'detail': 'Address not found or access denied.'},
            status=status.HTTP_404_NOT_FOUND
        )

# Formatted addresses are now integrated into RawAccountAddress
# No separate endpoints needed for formatted addresses


# Generic views with filtering support

class RawAccountAddressListView(generics.ListAPIView):
    """
    List view for account addresses with comprehensive filtering.

    Supports:
    - Filtering by location, geocoding status, coordinates
    - Text search in region and locality
    - Ordering by various fields
    - Geographic area filtering
    """
    serializer_class = RawAccountAddressSerializer
    permission_classes = [IsAuthenticated]

    # Filtering and search
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = RawAccountAddressFilter
    search_fields = ['region', 'locality', 'input_region', 'input_locality']
    ordering_fields = ['created_at', 'updated_at', 'region', 'locality']
    ordering = ['-created_at']

    @swagger_auto_schema(
        operation_summary="Get filtered addresses",
        operation_description="Get a filtered list of account addresses with comprehensive filtering options. Supports filtering by location, geocoding status, coordinates, and text search.",
        tags=['📍 Addresses'],
        responses={
            200: RawAccountAddressSerializer(many=True),
            401: "Authentication credentials were not provided"
        }
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        """Filter addresses to user's account unless staff."""
        if not self.request.user.is_authenticated:
            return RawAccountAddress.objects.none()

        queryset = RawAccountAddress.objects.all()
        if not self.request.user.is_staff:
            queryset = queryset.filter(account__user=self.request.user)

        return queryset.select_related('account', 'account__user')


class RawAccountAddressCreateView(generics.CreateAPIView):
    """Create view for account addresses with LLM moderation."""
    serializer_class = RawAccountAddressSerializer
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_summary="Create address",
        operation_description="Create a new account address with automatic LLM moderation and geocoding. The address will be associated with the authenticated user's account.",
        tags=['📍 Addresses'],
        request_body=RawAccountAddressSerializer,
        responses={
            201: RawAccountAddressSerializer,
            400: "Bad request - validation errors",
            401: "Authentication credentials were not provided"
        }
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)

    def perform_create(self, serializer):
        """Set the account and perform LLM moderation."""
        # Get or create account for the user
        account, created = AddsAccount.objects.get_or_create(
            user=self.request.user,
            defaults={
                'organization_name': f"{self.request.user.email} Account",
                'role': 'seller',
                'account_type': 'BASIC'
            }
        )

        # Perform LLM moderation before saving
        address_text = f"{serializer.validated_data.get('input_region', '')} {serializer.validated_data.get('input_locality', '')}"
        moderation_result = llm_moderation_service.moderate_content(
            title=serializer.validated_data.get('input_region', ''),
            description=serializer.validated_data.get('input_locality', '')
        )

        if moderation_result.status.value == 'rejected':
            from rest_framework.exceptions import ValidationError
            raise ValidationError({
                'moderation_error': moderation_result.reason,
                'suggestions': moderation_result.suggestions
            })

        serializer.save(account=account)


class RawAccountAddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Detail view for account addresses with LLM moderation on updates."""
    serializer_class = RawAccountAddressSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]

    @swagger_auto_schema(
        operation_summary="Get address details",
        operation_description="Retrieve detailed information about a specific account address.",
        tags=['📍 Addresses'],
        responses={
            200: RawAccountAddressSerializer,
            401: "Authentication credentials were not provided",
            403: "Permission denied - not owner",
            404: "Address not found"
        }
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_summary="Update address",
        operation_description="Update all fields of an account address. Includes automatic LLM moderation and geocoding for location changes.",
        tags=['📍 Addresses'],
        request_body=RawAccountAddressSerializer,
        responses={
            200: RawAccountAddressSerializer,
            400: "Bad request - validation errors",
            401: "Authentication credentials were not provided",
            403: "Permission denied - not owner",
            404: "Address not found"
        }
    )
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_summary="Partially update address",
        operation_description="Update specific fields of an account address. Includes automatic LLM moderation and geocoding for location changes.",
        tags=['📍 Addresses'],
        request_body=RawAccountAddressSerializer,
        responses={
            200: RawAccountAddressSerializer,
            400: "Bad request - validation errors",
            401: "Authentication credentials were not provided",
            403: "Permission denied - not owner",
            404: "Address not found"
        }
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_summary="Delete address",
        operation_description="Delete an account address. Only the owner can delete their addresses.",
        tags=['📍 Addresses'],
        responses={
            204: "Address deleted successfully",
            401: "Authentication credentials were not provided",
            403: "Permission denied - not owner",
            404: "Address not found"
        }
    )
    def delete(self, request, *args, **kwargs):
        return super().delete(request, *args, **kwargs)

    def get_queryset(self):
        """Filter addresses to user's account unless staff."""
        if not self.request.user.is_authenticated:
            return RawAccountAddress.objects.none()

        queryset = RawAccountAddress.objects.all()
        if not self.request.user.is_staff:
            queryset = queryset.filter(account__user=self.request.user)

        return queryset.select_related('account', 'account__user')

    def perform_update(self, serializer):
        """Perform LLM moderation on address updates."""
        # Check if location fields are being updated
        location_fields = ['input_region', 'input_locality']
        location_changed = any(field in serializer.validated_data for field in location_fields)

        if location_changed:
            # Perform LLM moderation
            address_text = f"{serializer.validated_data.get('input_region', '')} {serializer.validated_data.get('input_locality', '')}"
            moderation_result = llm_moderation_service.moderate_content(
                title=serializer.validated_data.get('input_region', ''),
                description=serializer.validated_data.get('input_locality', '')
            )

            if moderation_result.status.value == 'rejected':
                from rest_framework.exceptions import ValidationError
                raise ValidationError({
                    'moderation_error': moderation_result.reason,
                    'suggestions': moderation_result.suggestions
                })

        serializer.save()
