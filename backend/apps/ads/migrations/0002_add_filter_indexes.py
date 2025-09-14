# Generated manually for filter optimization

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ads', '0001_initial'),
    ]

    operations = [
        # Сначала включаем расширение pg_trgm для быстрого поиска по подстрокам
        migrations.RunSQL(
            sql="CREATE EXTENSION IF NOT EXISTS pg_trgm;",
            reverse_sql="-- Cannot safely drop pg_trgm extension"
        ),

        # Затем добавляем индексы для быстрой фильтрации
        migrations.RunSQL(
            # Создаем индексы для JSON полей (PostgreSQL)
            sql=[
                # Индекс для поиска по году
                "CREATE INDEX IF NOT EXISTS idx_car_ads_year ON car_ads USING btree (CAST((dynamic_fields->>'year') AS INTEGER));",

                # Индекс для поиска по пробегу
                "CREATE INDEX IF NOT EXISTS idx_car_ads_mileage ON car_ads USING btree (CAST((dynamic_fields->>'mileage') AS INTEGER));",

                # Составной индекс для цены и валюты
                "CREATE INDEX IF NOT EXISTS idx_car_ads_price_currency ON car_ads (price, currency);",

                # Составной индекс для региона и города
                "CREATE INDEX IF NOT EXISTS idx_car_ads_location ON car_ads (region, city);",

                # Составной индекс для статуса и даты создания
                "CREATE INDEX IF NOT EXISTS idx_car_ads_status_created ON car_ads (status, created_at DESC);",

                # Составной индекс для типа продавца и статуса обмена
                "CREATE INDEX IF NOT EXISTS idx_car_ads_seller_exchange ON car_ads (seller_type, exchange_status);",
            ],
            reverse_sql=[
                # Удаляем индексы при откате миграции
                "DROP INDEX IF EXISTS idx_car_ads_year;",
                "DROP INDEX IF EXISTS idx_car_ads_mileage;",
                "DROP INDEX IF EXISTS idx_car_ads_price_currency;",
                "DROP INDEX IF EXISTS idx_car_ads_location;",
                "DROP INDEX IF EXISTS idx_car_ads_status_created;",
                "DROP INDEX IF EXISTS idx_car_ads_seller_exchange;",
            ]
        ),
    ]
