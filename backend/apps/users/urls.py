from django.urls.conf import path

from apps.users.views.activate_views import ActivateUserView
from apps.users.views.avatar_views import UpdateAvatarView, generate_avatar, generate_image, download_avatar
from apps.users.views.details_views import UserDetailView, UserProfileView
from apps.users.views.list_create_views import ListUsersView, CreateUserView
from apps.users.views.reset_password_views import ResetPasswordTokenView, ResetPasswordView, RequestPasswordResetView
from apps.users.views.admin_views import GrantStaffRightsView, AdminUserListView, AdminUserDetailView
from apps.users.views.public_views import PublicUserListView
from apps.users.views.public_views import PublicUserListView

urlpatterns = [
    # Public endpoints (no auth required)
    path('public/list/', PublicUserListView.as_view(), name='public_users_list'),

    # Admin user management (Generic views)
    path('admin/list/', AdminUserListView.as_view(), name='admin_users_list'),
    path('admin/<int:pk>/', AdminUserDetailView.as_view(), name='admin_user_detail'),
    path('admin/<int:pk>/grant-staff-rights/', GrantStaffRightsView.as_view(), name='grant_staff_rights'),

    # User activation
    path('activate/', ActivateUserView.as_view(), name='api_users_activate_list'),

    # Password reset
    path('reset-password/', RequestPasswordResetView.as_view(), name='api_users_request_password_reset'),
    path('reset-password-confirm/', ResetPasswordView.as_view(), name='api_users_reset-password_partial_update'),

    # Current user profile (no ID needed)
    path('profile/', UserProfileView.as_view(), name='api_users_profile'),

    # User details and update with /detail suffix
    path('<int:pk>/detail/', UserDetailView.as_view(), name='api_users_detail_update'),

    # Password reset token
    path('<int:pk>/reset-password-token/', ResetPasswordTokenView.as_view(),
         name='api_users_reset-password-token_read'),

    # Basic user endpoints
    path("", ListUsersView.as_view(), name="users_list"),
    path("create/", CreateUserView.as_view(), name="user_create"),
    path('<int:pk>/profile/avatar/', UpdateAvatarView.as_view(),
         name='user_profile_upload_avatar'),
    path('profile/generate-avatar/', generate_avatar, name='generate_avatar'),
    path('profile/download-avatar/', download_avatar, name='download_avatar'),
    path('generate-image/', generate_image, name='generate_image'),
]
