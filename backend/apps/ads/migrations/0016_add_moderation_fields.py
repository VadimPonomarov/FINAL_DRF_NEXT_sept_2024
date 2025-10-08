# Generated manually to add missing moderation fields

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('ads', '0015_alter_carad_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='carad',
            name='moderated_by',
            field=models.ForeignKey(
                blank=True,
                help_text='User who moderated this ad (null for auto-moderation)',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='moderated_ads',
                to=settings.AUTH_USER_MODEL
            ),
        ),
        migrations.AddField(
            model_name='carad',
            name='moderation_reason',
            field=models.TextField(
                blank=True,
                help_text='Reason for moderation decision'
            ),
        ),
    ]
