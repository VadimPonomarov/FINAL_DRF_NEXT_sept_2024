from django.db import models


class IdAsIntMixin(models.Model):
    id = models.AutoField(
        primary_key=True, auto_created=True, unique=True, editable=False, null=False
    )

    class Meta:
        abstract = True
