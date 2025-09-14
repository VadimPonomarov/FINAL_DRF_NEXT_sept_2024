from rest_framework.serializers import ModelSerializer


class BaseModelSerializer(ModelSerializer):
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation.pop("password", None)
        return representation

    class Meta:
        extra_kwargs = {
            "id": {"read_only": True},
            "created_at": {"read_only": True},
            "updated_at": {"read_only": True},
        }
