# Manual migration to remove unique constraint on car mark name
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("ads", "0013_remove_unique_car_mark_name_constraint"),
    ]

    operations = [
        migrations.RunSQL(
            sql="ALTER TABLE ads_carmake DROP CONSTRAINT IF EXISTS unique_car_mark_name;",
            reverse_sql="ALTER TABLE ads_carmake ADD CONSTRAINT unique_car_mark_name UNIQUE (name);",
        ),
    ]
