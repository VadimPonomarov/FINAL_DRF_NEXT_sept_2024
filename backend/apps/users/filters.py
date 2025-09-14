import django_filters

from django.contrib.auth import get_user_model

UserModel = get_user_model()


class UsersFilter(django_filters.FilterSet):
    class Meta:
        model = UserModel
        fields = {
            "id": ["exact", "gt", "gte", "lt", "lte", "in", "range"],
            "email": ["exact", "contains"],
            "is_active": ["exact"],
            "is_staff": ["exact"],
            "is_superuser": ["exact"],
        }

    ordering = django_filters.OrderingFilter(
        fields={
            "id": "id",
            "email": "email",
            "is_active": "is_active",
            "is_staff": "is_staff",
            "is_superuser": "is_superuser",
        }
    )
