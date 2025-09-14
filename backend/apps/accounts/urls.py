from django.urls import path, include
from .views.account_views import AccountListCreateView, AccountRetrieveUpdateDestroyView
from .views.contact_views import contact_list_create, contact_retrieve_update_destroy
from .views.account_type_views import change_account_type, bulk_change_account_type, account_type_statistics
from .views.addresses.views import (
    raw_address_list_create,
    raw_address_retrieve_update_destroy,
    raw_address_delete,
    RawAccountAddressListView,
    RawAccountAddressCreateView,
    RawAccountAddressDetailView
)
from .views.geocoding_views import (
    get_detailed_geocode_info,
    get_formatted_address_by_id
)
from .views.profile_views import (
    get_full_profile_data,
    get_profile_stats,
    get_personal_info_tab_data,
    get_account_settings_tab_data,
    get_addresses_tab_data
)

# Alias for backward compatibility
address_views = type('AddressViews', (), {
    'raw_address_list_create': raw_address_list_create,
    'raw_address_retrieve_update_destroy': raw_address_retrieve_update_destroy,
    'raw_address_delete': raw_address_delete
})

# URL patterns for accounts
account_urls = [
    path('', AccountListCreateView.as_view(), name='account-list'),
    path('<int:pk>/', AccountRetrieveUpdateDestroyView.as_view(), name='account-detail'),
]

# URL patterns for contacts
contact_urls = [
    path('', contact_list_create, name='contact-list'),
    path('<int:pk>', contact_retrieve_update_destroy, name='contact-detail'),
]

# Nested URL patterns for account-specific contacts
nested_contact_urls = [
    path('', contact_list_create, name='account-contact-list'),
    path('<int:pk>', contact_retrieve_update_destroy, name='account-contact-detail'),
]

# URL patterns for raw address listings (no ID)
raw_address_list_urls = [
    path('', raw_address_list_create, name='raw-address-list'),
]

# URL patterns for raw address details (with ID)
raw_address_detail_urls = [
    path('<int:pk>', address_views.raw_address_retrieve_update_destroy, name='raw-address-detail'),
]

# Formatted address URLs removed - data is now included in raw address responses

# Nested URL patterns for account-specific raw addresses
nested_raw_address_urls = [
    path('', address_views.raw_address_list_create, name='account-raw-address-list'),
    path('<int:pk>', address_views.raw_address_retrieve_update_destroy, name='account-raw-address-detail'),
]

# Main URL patterns
urlpatterns = [
    # Account endpoints
    path('', include(account_urls)),
    
    # Contact endpoints (global)
    path('contacts/', include(contact_urls)),

    # Nested account contacts
    path('<int:account_pk>/contacts/', include(nested_contact_urls)),

    # Address listing endpoints (no ID)
    path('addresses/raw/', include(raw_address_list_urls)),

    # Address detail endpoints (with ID)
    path('addresses/raw/<int:pk>/', raw_address_retrieve_update_destroy, name='raw-address-detail'),
    path('addresses/raw/<int:pk>/delete/', raw_address_delete, name='raw-address-delete'),

    # Nested account-specific raw addresses
    path('<int:account_pk>/addresses/raw/', raw_address_list_create, name='account-raw-address-list'),
    path('<int:account_pk>/addresses/raw/<int:pk>/', raw_address_retrieve_update_destroy, name='account-raw-address-detail'),

    # New generics views with filtering and LLM moderation
    path('addresses/filtered/', RawAccountAddressListView.as_view(), name='addresses-filtered-list'),
    path('addresses/create/', RawAccountAddressCreateView.as_view(), name='addresses-create'),
    path('addresses/<int:pk>/detail/', RawAccountAddressDetailView.as_view(), name='addresses-detail'),

    # Geocoding endpoints
    path('geocoding/detailed/', get_detailed_geocode_info, name='detailed-geocode'),
    path('geocoding/formatted/<int:address_id>/', get_formatted_address_by_id, name='formatted-address-by-id'),

    # Unified profile endpoints
    path('profile/full/', get_full_profile_data, name='full-profile-data'),
    path('profile/stats/', get_profile_stats, name='profile-stats'),

    # Cascading tab endpoints (optimized)
    path('profile/personal-info/', get_personal_info_tab_data, name='personal-info-tab'),
    path('profile/account-settings/', get_account_settings_tab_data, name='account-settings-tab'),
    path('profile/addresses/', get_addresses_tab_data, name='addresses-tab'),

    # Account type management (superuser only)
    path('admin/<int:account_id>/type/', change_account_type, name='change_account_type'),
    path('admin/bulk/type/update/', bulk_change_account_type, name='bulk_change_account_type'),
    path('admin/stats/', account_type_statistics, name='account_type_statistics'),
]
