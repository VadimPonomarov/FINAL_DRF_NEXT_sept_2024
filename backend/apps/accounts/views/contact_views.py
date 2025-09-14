from django.shortcuts import get_object_or_404
from drf_yasg.utils import swagger_auto_schema
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from core.permissions import IsOwnerOrReadOnly
from ..models import AddsAccount, AddsAccountContact
from ..serializers import AddsAccountContactSerializer
from core.enums.ads import AccountTypeEnum, ModerationLevelEnum, RoleEnum


@swagger_auto_schema(
    method='get',
    operation_summary="List all contacts",
    operation_description="""
    Returns a list of all contacts for the specified account.
    
    ### Permissions:
    - User must be authenticated
    - User must be the owner of the account
    
    ### Path Parameters:
    - `account_pk` (integer): The ID of the account
    
    ### Response:
    Returns a list of contact objects for the specified account.
    """,
    responses={
        200: AddsAccountContactSerializer(many=True),
        401: 'Authentication credentials were not provided.',
        403: 'You do not have permission to perform this action.',
        404: 'Account not found.'
    },
    tags=['📞 Contacts']
)
@swagger_auto_schema(
    method='post',
    operation_summary="Create a new contact",
    operation_description="""
    Create a new contact for the specified account.
    
    ### Permissions:
    - User must be authenticated
    - User must be the owner of the account
    
    ### Path Parameters:
    - `account_pk` (integer): The ID of the account
    
    ### Request Body:
    - `first_name` (string): The first name of the contact
    - `last_name` (string, optional): The last name of the contact
    - `email` (string, optional): The email address of the contact
    - `phone` (string, optional): The phone number of the contact
    - `is_primary` (boolean, optional): Whether this is the primary contact (default: false)
    """,
    request_body=AddsAccountContactSerializer,
    responses={
        201: AddsAccountContactSerializer(),
        400: 'Invalid input',
        401: 'Authentication credentials were not provided.',
        403: 'You do not have permission to perform this action.',
        404: 'Account not found.'
    },
    tags=['📞 Contacts']
)
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def contact_list_create(request, account_pk=None):
    """
    API endpoint that allows contacts to be viewed or created.
    
    ### Permissions:
    - User must be authenticated
    - User can only view/create contacts for their own accounts
    """
    # If account_pk is provided, filter by that account
    if account_pk is not None:
        account = get_object_or_404(AddsAccount, pk=account_pk, user=request.user)
        contacts = account.contacts.all()
    else:
        # Otherwise, get all contacts for the user's accounts
        accounts = AddsAccount.objects.filter(user=request.user)
        contacts = AddsAccountContact.objects.filter(adds_account__in=accounts)
    
    if request.method == 'GET':
        serializer = AddsAccountContactSerializer(contacts, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Copy request data to allow modifications
        data = request.data.copy()

        # If client sent 'account', validate ownership and use it; remove from payload (serializer doesn't accept it)
        selected_account = None
        if 'account' in data and data['account']:
            try:
                selected_account = AddsAccount.objects.get(pk=data['account'], user=request.user)
            except AddsAccount.DoesNotExist:
                return Response(
                    {"account": ["Account not found or does not belong to the user."]},
                    status=status.HTTP_404_NOT_FOUND
                )
            # Remove 'account' key so serializer won't reject unknown field
            data.pop('account', None)

        # If account_pk is provided, enforce it (and optionally ensure consistency with selected_account)
        if account_pk is not None:
            if selected_account and str(selected_account.id) != str(account_pk):
                return Response(
                    {"account": ["Mismatch between URL and request body."]},
                    status=status.HTTP_400_BAD_REQUEST
                )
            # Use account from URL
            account_to_use = account
        else:
            # No account in URL, use provided one or first user account; create if missing
            account_to_use = selected_account or AddsAccount.objects.filter(user=request.user).first()
            if not account_to_use:
                account_to_use = AddsAccount.objects.create(
                    user=request.user,
                    account_type=AccountTypeEnum.PRIVATE,
                    moderation_level=ModerationLevelEnum.BASIC,
                    role=RoleEnum.SELLER,
                    is_active=True
                )
                print(f"[ContactViews] ✅ Auto-created account for user {request.user.id}: {account_to_use.id}")

        serializer = AddsAccountContactSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            serializer.save(adds_account=account_to_use)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@swagger_auto_schema(
    methods=['get'],
    operation_summary="Retrieve a contact",
    operation_description="""
    Retrieve a specific contact by ID.
    
    ### Permissions:
    - User must be authenticated
    - User must be the owner of the account that the contact belongs to
    
    ### Path Parameters:
    - `id` (integer): The ID of the contact
    - `account_pk` (integer, optional): The ID of the account (for nested routes)
    """,
    responses={
        200: AddsAccountContactSerializer(),
        401: 'Authentication credentials were not provided.',
        403: 'You do not have permission to perform this action.',
        404: 'Not found.'
    },
    tags=['📞 Contacts']
)
@swagger_auto_schema(
    methods=['put'],
    operation_summary="Update a contact",
    operation_description="""
    Update a specific contact by ID.
    
    ### Permissions:
    - User must be authenticated
    - User must be the owner of the account that the contact belongs to
    
    ### Path Parameters:
    - `id` (integer): The ID of the contact to update
    - `account_pk` (integer, optional): The ID of the account (for nested routes)
    
    ### Request Body:
    - `first_name` (string, optional): The first name of the contact
    - `last_name` (string, optional): The last name of the contact
    - `email` (string, optional): The email address of the contact
    - `phone` (string, optional): The phone number of the contact
    - `is_primary` (boolean, optional): Whether this is the primary contact
    """,
    request_body=AddsAccountContactSerializer,
    responses={
        200: AddsAccountContactSerializer(),
        400: 'Invalid input',
        401: 'Authentication credentials were not provided.',
        403: 'You do not have permission to perform this action.',
        404: 'Not found.'
    },
    tags=['📞 Contacts']
)
@swagger_auto_schema(
    methods=['delete'],
    operation_summary="Delete a contact",
    operation_description="""
    Delete a specific contact by ID.
    
    ### Permissions:
    - User must be authenticated
    - User must be the owner of the account that the contact belongs to
    
    ### Path Parameters:
    - `id` (integer): The ID of the contact to delete
    - `account_pk` (integer, optional): The ID of the account (for nested routes)
    """,
    responses={
        204: 'No content',
        401: 'Authentication credentials were not provided.',
        403: 'You do not have permission to perform this action.',
        404: 'Not found.'
    },
    tags=['📞 Contacts']
)
@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated, IsOwnerOrReadOnly])
def contact_retrieve_update_destroy(request, pk, account_pk=None):
    """
    Retrieve, update, or delete a single contact.
    Ensures that the requesting user owns the contact via AddsAccount relationship.
    """
    # Resolve contact and verify ownership
    if account_pk is not None:
        account = get_object_or_404(AddsAccount, pk=account_pk, user=request.user)
        contact = get_object_or_404(AddsAccountContact, pk=pk, adds_account=account)
    else:
        contact = get_object_or_404(AddsAccountContact, pk=pk)
        if contact.adds_account.user != request.user:
            return Response(
                {"detail": "You do not have permission to perform this action."},
                status=status.HTTP_403_FORBIDDEN
            )

    if request.method == 'GET':
        serializer = AddsAccountContactSerializer(contact)
        return Response(serializer.data)

    elif request.method == 'PUT':
        # For nested route, ensure contact belongs to the specified account
        if account_pk is not None and str(contact.adds_account.id) != str(account_pk):
            return Response(
                {"detail": "Contact does not belong to the specified account."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = AddsAccountContactSerializer(contact, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        contact.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
