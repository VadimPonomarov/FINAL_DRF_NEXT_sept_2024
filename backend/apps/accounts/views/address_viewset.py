"""
ViewSet for RawAccountAddress with comprehensive filtering and LLM moderation.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.shortcuts import get_object_or_404
from drf_yasg.utils import swagger_auto_schema

from apps.accounts.models import RawAccountAddress, AddsAccount
from apps.accounts.serializers.addresses.serializers import RawAccountAddressSerializer
from apps.accounts.filters import RawAccountAddressFilter
from core.permissions import IsOwnerOrReadOnly
from core.services.llm_moderation import llm_moderation_service


class RawAccountAddressViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing account addresses with comprehensive filtering and LLM moderation.
    
    Features:
    - Full CRUD operations for addresses
    - Advanced filtering by location, geocoding status, coordinates
    - Text search in region and locality
    - LLM-based address content moderation
    - Automatic geocoding with Google Maps place_id
    - Geographic area filtering
    """
    
    serializer_class = RawAccountAddressSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    
    # Filtering and search
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = RawAccountAddressFilter
    search_fields = ['region', 'locality', 'input_region', 'input_locality']
    ordering_fields = ['created_at', 'updated_at', 'region', 'locality']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """
        Filter queryset to only include addresses owned by the current user
        unless they are a staff member.
        """
        if not self.request.user.is_authenticated:
            return RawAccountAddress.objects.none()
        
        queryset = RawAccountAddress.objects.all()
        if not self.request.user.is_staff:
            queryset = queryset.filter(account__user=self.request.user)
        
        return queryset.select_related('account', 'account__user')
    
    def perform_create(self, serializer):
        """
        Create or update the single address for the account (OneToOne relationship).
        If address already exists, this will update it instead of creating a new one.
        """
        # Get or create account for the user
        account, created = AddsAccount.objects.get_or_create(
            user=self.request.user,
            defaults={
                'organization_name': f"{self.request.user.email} Account",
                'role': 'seller',
                'account_type': 'BASIC'
            }
        )

        # Check if address already exists (OneToOne relationship)
        try:
            existing_address = account.address
            # Update existing address instead of creating new one
            for field, value in serializer.validated_data.items():
                setattr(existing_address, field, value)
            existing_address.save()
            serializer.instance = existing_address
        except RawAccountAddress.DoesNotExist:
            # Create new address
            serializer.save(account=account)
    
    @swagger_auto_schema(
        operation_summary="Moderate address content",
        operation_description="""
        Moderate address content using LLM to check for inappropriate content,
        spam, or policy violations.

        This endpoint validates the address content without saving changes.
        """,
        tags=['📍 Addresses'],
        responses={
            200: "Moderation result with status and suggestions",
            404: "Address not found",
            403: "Permission denied"
        }
    )
    @action(detail=True, methods=['post'])
    def moderate(self, request, pk=None):
        """
        Moderate address content using LLM.
        
        Checks for:
        - Inappropriate language
        - Spam patterns
        - Suspicious address patterns
        - Policy violations
        """
        address = self.get_object()
        
        # Combine address fields for moderation
        address_text = f"{address.input_region or address.region} {address.input_locality or address.locality}"
        
        # Perform LLM moderation
        moderation_result = llm_moderation_service.moderate_content(
            title=address.input_region or address.region or '',
            description=address.input_locality or address.locality or ''
        )
        
        return Response({
            'address_id': address.id,
            'moderation_status': moderation_result.status.value,
            'confidence': moderation_result.confidence,
            'violations': [v.value for v in moderation_result.violations],
            'suggestions': moderation_result.suggestions,
            'flagged_text': moderation_result.flagged_text,
            'reason': moderation_result.reason
        })
    
    @swagger_auto_schema(
        operation_summary="Get addresses by location",
        operation_description="""
        Get all addresses within a specific geographic area.

        Query parameters:
        - lat_min, lat_max: Latitude range
        - lng_min, lng_max: Longitude range
        - region: Region name (partial match)
        - locality: Locality name (partial match)
        """,
        tags=['📍 Addresses'],
        responses={
            200: RawAccountAddressSerializer(many=True),
        }
    )
    @action(detail=False, methods=['get'])
    def by_location(self, request):
        """Get addresses filtered by geographic location."""
        queryset = self.filter_queryset(self.get_queryset())
        
        # Additional geographic filtering
        lat_min = request.query_params.get('lat_min')
        lat_max = request.query_params.get('lat_max')
        lng_min = request.query_params.get('lng_min')
        lng_max = request.query_params.get('lng_max')
        
        if lat_min:
            queryset = queryset.filter(latitude__gte=float(lat_min))
        if lat_max:
            queryset = queryset.filter(latitude__lte=float(lat_max))
        if lng_min:
            queryset = queryset.filter(longitude__gte=float(lng_min))
        if lng_max:
            queryset = queryset.filter(longitude__lte=float(lng_max))
        
        # Filter by region/locality if provided
        region = request.query_params.get('region')
        locality = request.query_params.get('locality')
        
        if region:
            queryset = queryset.filter(region__icontains=region)
        if locality:
            queryset = queryset.filter(locality__icontains=locality)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @swagger_auto_schema(
        operation_summary="Get addresses by place_id",
        operation_description="""
        Get all addresses that share the same Google Maps place_id.
        This groups addresses from the same geographic location.
        """,
        responses={
            200: RawAccountAddressSerializer(many=True),
        }
    )
    @action(detail=True, methods=['get'])
    def similar_locations(self, request, pk=None):
        """Get addresses with the same place_id (same geographic location)."""
        address = self.get_object()
        
        if not address.geo_code or address.geo_code == 'unknown':
            return Response({
                'message': 'Address does not have a valid place_id',
                'addresses': []
            })
        
        # Find addresses with the same place_id
        similar_addresses = RawAccountAddress.objects.filter(
            geo_code=address.geo_code
        ).exclude(id=address.id)
        
        # Apply user permissions
        if not self.request.user.is_staff:
            similar_addresses = similar_addresses.filter(account__user=self.request.user)
        
        serializer = self.get_serializer(similar_addresses, many=True)
        return Response({
            'place_id': address.geo_code,
            'location': f"{address.locality}, {address.region}",
            'total_count': similar_addresses.count(),
            'addresses': serializer.data
        })
    
    @swagger_auto_schema(
        operation_summary="Get geocoding statistics",
        operation_description="""
        Get statistics about geocoding success rate and place_id distribution.
        Only available for staff users.
        """,
        responses={
            200: "Geocoding statistics",
            403: "Permission denied"
        }
    )
    @action(detail=False, methods=['get'])
    def geocoding_stats(self, request):
        """Get geocoding statistics (staff only)."""
        if not request.user.is_staff:
            return Response(
                {'error': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        queryset = self.get_queryset()
        
        total_addresses = queryset.count()
        geocoded_addresses = queryset.filter(is_geocoded=True).count()
        with_place_id = queryset.filter(geo_code__startswith='ChIJ').count()
        unknown_locations = queryset.filter(geo_code='unknown').count()
        
        # Top locations by place_id
        from django.db.models import Count
        top_locations = queryset.exclude(
            geo_code='unknown'
        ).values('geo_code', 'region', 'locality').annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        return Response({
            'total_addresses': total_addresses,
            'geocoded_addresses': geocoded_addresses,
            'with_place_id': with_place_id,
            'unknown_locations': unknown_locations,
            'geocoding_success_rate': (geocoded_addresses / total_addresses * 100) if total_addresses > 0 else 0,
            'place_id_success_rate': (with_place_id / total_addresses * 100) if total_addresses > 0 else 0,
            'top_locations': [
                {
                    'place_id': loc['geo_code'],
                    'location': f"{loc['locality']}, {loc['region']}",
                    'address_count': loc['count']
                }
                for loc in top_locations
            ]
        })
