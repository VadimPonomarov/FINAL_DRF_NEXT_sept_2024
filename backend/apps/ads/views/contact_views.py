from django.shortcuts import get_object_or_404, get_list_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from ..models.car_ad_model import CarAd
from core.permissions import IsOwnerOrReadOnly
from apps.accounts.models import AddsAccount, AddsAccountContact
from apps.accounts.serializers.contact_serializers import AddsAccountContactSerializer
from drf_yasg.utils import swagger_auto_schema
from rest_framework.exceptions import ValidationError


@swagger_auto_schema(
    method='get',
    operation_summary="List contacts for an ad's account",
    operation_description="""
    Get a list of all contacts for the account associated with the specified ad.

    ### Permissions:
    - User must be authenticated
    - User must be the owner of the ad's account

    ### Path Parameters:
    - `ad_pk` (integer): The ID of the ad

    ### Response:
    Returns a list of contact objects.
    """,
    responses={
        200: AddsAccountContactSerializer(many=True),
        401: 'Authentication credentials were not provided.',
        403: 'You do not have permission to perform this action.',
        404: 'Ad not found.'
    },
    tags=['📞 Contacts']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ad_contact_list(request, ad_pk):
    """
    API endpoint that lists all contacts for the account associated with the specified ad.
    """
    # Get the ad and check permissions
    ad = get_object_or_404(CarAd, pk=ad_pk)
    if not IsOwnerOrReadOnly().has_object_permission(request, None, ad):
        return Response(
            {"detail": "You do not have permission to view contacts for this ad."},
            status=status.HTTP_403_FORBIDDEN
        )

    # Get all contacts for the account
    contacts = ad.account.contacts.all()
    serializer = AddsAccountContactSerializer(contacts, many=True)
    return Response(serializer.data)


@swagger_auto_schema(
    method='get',
    operation_summary="Retrieve a specific contact",
    operation_description="""
    Retrieve details of a specific contact for an ad's account.

    ### Permissions:
    - User must be authenticated
    - User must be the owner of the ad's account

    ### Path Parameters:
    - `ad_pk` (integer): The ID of the ad
    - `id` (integer): The ID of the contact to retrieve

    ### Response:
    Returns the contact object.
    """,
    responses={
        200: AddsAccountContactSerializer(),
        401: 'Authentication credentials were not provided.',
        403: 'You do not have permission to perform this action.',
        404: 'Contact not found.'
    },
    tags=['📞 Contacts']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ad_contact_detail(request, ad_pk, id):
    """
    API endpoint that retrieves a specific contact for the account associated with the specified ad.
    """
    # Get the ad and check permissions
    ad = get_object_or_404(CarAd, pk=ad_pk)
    if not IsOwnerOrReadOnly().has_object_permission(request, None, ad):
        return Response(
            {"detail": "You do not have permission to view this contact."},
            status=status.HTTP_403_FORBIDDEN
        )

    # Get the contact and ensure it belongs to the ad's account
    contact = get_object_or_404(AddsAccountContact, pk=id, account=ad.account)

    serializer = AddsAccountContactSerializer(contact)
    return Response(serializer.data)


@swagger_auto_schema(
    method='post',
    operation_summary="Create a contact for an ad's account",
    operation_description="""
    Create a new contact for the account associated with the specified ad.
    
    ### Permissions:
    - User must be authenticated
    - User must be the owner of the ad's account
    
    ### Path Parameters:
    - `ad_pk` (integer): The ID of the ad
    
    ### Request Body:
    - `type` (string): The type of contact (e.g., 'email', 'phone')
    - `value` (string): The contact value (e.g., email address, phone number)
    - `is_visible` (boolean, optional): Whether the contact is visible to others
    - `note` (string, optional): Additional notes about the contact
    
    ### Response:
    Returns the created contact object.
    """,
    request_body=AddsAccountContactSerializer,
    responses={
        201: AddsAccountContactSerializer(),
        400: 'Invalid input.',
        401: 'Authentication credentials were not provided.',
        403: 'You do not have permission to perform this action.',
        404: 'Ad not found.'
    },
    tags=['📞 Contacts']
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ad_contact_create(request, ad_pk):
    """
    API endpoint that creates a new contact for the account associated with the specified ad.
    """
    # Get the ad and check permissions
    ad = get_object_or_404(CarAd, pk=ad_pk)
    if not IsOwnerOrReadOnly().has_object_permission(request, None, ad):
        return Response(
            {"detail": "You do not have permission to create contacts for this ad."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Create a new contact for the account
    serializer = AddsAccountContactSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save(account=ad.account)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@swagger_auto_schema(
    method='patch',
    operation_summary="Partially update a contact",
    operation_description="""
    Partially update a specific contact for an ad's account.
    
    ### Permissions:
    - User must be authenticated
    - User must be the owner of the ad's account
    
    ### Path Parameters:
    - `ad_pk` (integer): The ID of the ad
    - `id` (integer): The ID of the contact to update
    
    ### Request Body:
    - `type` (string, optional): The type of contact (e.g., 'email', 'phone')
    - `value` (string, optional): The contact value (e.g., email address, phone number)
    - `is_visible` (boolean, optional): Whether the contact is visible to others
    - `note` (string, optional): Additional notes about the contact
    
    ### Response:
    Returns the updated contact details.
    """,
    request_body=AddsAccountContactSerializer,
    responses={
        200: AddsAccountContactSerializer(),
        400: 'Invalid input.',
        401: 'Authentication credentials were not provided.',
        403: 'You do not have permission to perform this action.',
        404: 'Contact not found.'
    },
    tags=['📞 Contacts']
)
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def ad_contact_partial_update(request, ad_pk, id):
    """
    API endpoint that allows partially updating a contact
    for the account associated with the specified ad.
    """
    # Get the ad and check permissions
    ad = get_object_or_404(CarAd, pk=ad_pk)
    if not IsOwnerOrReadOnly().has_object_permission(request, None, ad):
        return Response(
            {"detail": "You do not have permission to update this contact."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get the contact and ensure it belongs to the ad's account
    contact = get_object_or_404(AddsAccountContact, pk=id, account=ad.account)
    
    # Partially update the contact
    serializer = AddsAccountContactSerializer(
        contact, 
        data=request.data, 
        partial=True,
        context={'request': request}
    )
    
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@swagger_auto_schema(
    method='delete',
    operation_summary="Delete a contact",
    operation_description="""
    Delete a specific contact from an ad's account.
    
    ### Permissions:
    - User must be authenticated
    - User must be the owner of the ad's account
    
    ### Path Parameters:
    - `ad_pk` (integer): The ID of the ad
    - `id` (integer): The ID of the contact to delete
    
    ### Response:
    Returns a success message with status 204 (No Content).
    """,
    responses={
        204: 'Contact deleted successfully.',
        401: 'Authentication credentials were not provided.',
        403: 'You do not have permission to perform this action.',
        404: 'Contact not found.'
    },
    tags=['📞 Contacts']
)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def ad_contact_delete(request, ad_pk, id):
    """
    API endpoint that deletes a contact for the account associated with the specified ad.
    """
    # Get the ad and check permissions
    ad = get_object_or_404(CarAd, pk=ad_pk)
    if not IsOwnerOrReadOnly().has_object_permission(request, None, ad):
        return Response(
            {"detail": "You do not have permission to delete this contact."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get the contact and ensure it belongs to the ad's account
    contact = get_object_or_404(AddsAccountContact, pk=id, account=ad.account)
    
    # Delete the contact
    contact.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
