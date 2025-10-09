# Generated manually to add missing moderation fields

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('ads', '0015_alter_carad_status'),
    ]

    operations = [
        migrations.RunSQL(
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'car_ads'
                    AND column_name = 'moderated_by_id'
                ) THEN
                    ALTER TABLE car_ads ADD COLUMN moderated_by_id integer NULL;
                END IF;
            END $$;
            """,
            reverse_sql=migrations.RunSQL.noop
        ),
        migrations.RunSQL(
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'car_ads'
                    AND column_name = 'moderation_reason'
                ) THEN
                    ALTER TABLE car_ads ADD COLUMN moderation_reason text;
                END IF;
            END $$;
            """,
            reverse_sql=migrations.RunSQL.noop
        ),
    ]
