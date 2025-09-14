"""
Django management command to analyze database structure and clean up.
"""

from django.core.management.base import BaseCommand
from django.db import connection
from django.apps import apps


class Command(BaseCommand):
    help = 'Analyze database structure and identify cleanup needs'

    def handle(self, *args, **options):
        """Analyze database structure."""
        try:
            self.stdout.write('🔍 АНАЛИЗ СТРУКТУРЫ БАЗЫ ДАННЫХ')
            self.stdout.write('=' * 60)
            
            # Show all tables
            self._show_all_tables()
            
            # Show Django models
            self._show_django_models()
            
            # Identify orphaned tables
            self._identify_orphaned_tables()
            
            # Show recommendations
            self._show_recommendations()
            
        except Exception as e:
            self.stdout.write(f'❌ Ошибка анализа: {e}')
            raise

    def _show_all_tables(self):
        """Show all tables in database."""
        self.stdout.write('\n📋 ВСЕ ТАБЛИЦЫ В БАЗЕ ДАННЫХ:')
        self.stdout.write('-' * 40)
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT table_name, table_type 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name;
            """)
            tables = cursor.fetchall()
            
            car_tables = []
            ad_tables = []
            other_tables = []
            
            for table_name, table_type in tables:
                if 'car' in table_name.lower():
                    car_tables.append(table_name)
                elif 'ad' in table_name.lower():
                    ad_tables.append(table_name)
                else:
                    other_tables.append(table_name)
            
            if car_tables:
                self.stdout.write('\n🚗 ТАБЛИЦЫ АВТОМОБИЛЕЙ:')
                for table in car_tables:
                    self.stdout.write(f'   📋 {table}')
            
            if ad_tables:
                self.stdout.write('\n📢 ТАБЛИЦЫ ОБЪЯВЛЕНИЙ:')
                for table in ad_tables:
                    self.stdout.write(f'   📋 {table}')
            
            self.stdout.write(f'\n📊 ОСТАЛЬНЫЕ ТАБЛИЦЫ ({len(other_tables)}):')
            for table in other_tables[:10]:  # Show first 10
                self.stdout.write(f'   📋 {table}')
            if len(other_tables) > 10:
                self.stdout.write(f'   ... и еще {len(other_tables) - 10} таблиц')

    def _show_django_models(self):
        """Show Django models and their tables."""
        self.stdout.write('\n🐍 DJANGO МОДЕЛИ:')
        self.stdout.write('-' * 40)
        
        ads_models = apps.get_app_config('ads').get_models()
        accounts_models = apps.get_app_config('accounts').get_models()
        
        self.stdout.write('\n📢 МОДЕЛИ ADS:')
        for model in ads_models:
            table_name = model._meta.db_table
            self.stdout.write(f'   🔗 {model.__name__} → {table_name}')
        
        self.stdout.write('\n👥 МОДЕЛИ ACCOUNTS:')
        for model in accounts_models:
            table_name = model._meta.db_table
            self.stdout.write(f'   🔗 {model.__name__} → {table_name}')

    def _identify_orphaned_tables(self):
        """Identify tables that don't have corresponding Django models."""
        self.stdout.write('\n🔍 ПОИСК ПОТЕРЯННЫХ ТАБЛИЦ:')
        self.stdout.write('-' * 40)
        
        # Get all Django model tables
        django_tables = set()
        for app_config in apps.get_app_configs():
            for model in app_config.get_models():
                django_tables.add(model._meta.db_table)
        
        # Get all database tables
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE';
            """)
            db_tables = {table[0] for table in cursor.fetchall()}
        
        # Find orphaned tables
        orphaned_tables = db_tables - django_tables
        
        # Filter out system tables
        system_tables = {
            'django_migrations', 'django_content_type', 'django_admin_log',
            'auth_permission', 'auth_group', 'auth_group_permissions',
            'auth_user', 'auth_user_groups', 'auth_user_user_permissions',
            'django_session', 'token_blacklist_outstandingtoken',
            'token_blacklist_blacklistedtoken'
        }
        
        orphaned_tables = orphaned_tables - system_tables
        
        if orphaned_tables:
            self.stdout.write('⚠️ НАЙДЕНЫ ПОТЕРЯННЫЕ ТАБЛИЦЫ:')
            for table in sorted(orphaned_tables):
                # Check if table has data
                with connection.cursor() as cursor:
                    cursor.execute(f'SELECT COUNT(*) FROM "{table}";')
                    count = cursor.fetchone()[0]
                
                if count > 0:
                    self.stdout.write(f'   🗂️ {table} ({count} записей) ⚠️ СОДЕРЖИТ ДАННЫЕ')
                else:
                    self.stdout.write(f'   📋 {table} (пустая)')
        else:
            self.stdout.write('✅ Потерянных таблиц не найдено')

    def _show_recommendations(self):
        """Show cleanup recommendations."""
        self.stdout.write('\n💡 РЕКОМЕНДАЦИИ ПО ОЧИСТКЕ:')
        self.stdout.write('-' * 40)
        
        # Check for old car_ads table
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'car_ads'
                );
            """)
            has_car_ads = cursor.fetchone()[0]
        
        if has_car_ads:
            cursor.execute('SELECT COUNT(*) FROM car_ads;')
            car_ads_count = cursor.fetchone()[0]
            
            self.stdout.write('🚗 ТАБЛИЦА car_ads:')
            if car_ads_count > 0:
                self.stdout.write(f'   ⚠️ Содержит {car_ads_count} записей')
                self.stdout.write('   💡 Рекомендация: Перенести данные в новую модель или очистить')
            else:
                self.stdout.write('   ✅ Пустая - можно безопасно удалить')
        
        # Check for CarAd model table
        try:
            from apps.ads.models import CarAd
            table_name = CarAd._meta.db_table
            
            cursor.execute(f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = '{table_name}'
                );
            """)
            has_carad_table = cursor.fetchone()[0]
            
            if has_carad_table:
                cursor.execute(f'SELECT COUNT(*) FROM {table_name};')
                carad_count = cursor.fetchone()[0]
                self.stdout.write(f'\n🚗 ТАБЛИЦА {table_name} (CarAd модель):')
                self.stdout.write(f'   📊 Содержит {carad_count} записей')
            else:
                self.stdout.write(f'\n❌ ТАБЛИЦА {table_name} НЕ СУЩЕСТВУЕТ')
                self.stdout.write('   💡 Рекомендация: Создать миграцию для модели CarAd')
                
        except Exception as e:
            self.stdout.write(f'\n❌ Ошибка проверки модели CarAd: {e}')
        
        self.stdout.write('\n🔧 ПЛАН ДЕЙСТВИЙ:')
        self.stdout.write('1. Создать миграции для недостающих моделей')
        self.stdout.write('2. Удалить неиспользуемые таблицы')
        self.stdout.write('3. Перенести данные если необходимо')
        self.stdout.write('4. Проверить целостность данных')

    def _show_table_details(self, table_name):
        """Show details about a specific table."""
        with connection.cursor() as cursor:
            cursor.execute(f"""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = '{table_name}' 
                ORDER BY ordinal_position;
            """)
            columns = cursor.fetchall()
            
            self.stdout.write(f'\n📋 СТРУКТУРА ТАБЛИЦЫ {table_name}:')
            for col_name, data_type, nullable, default in columns:
                null_info = "NULL" if nullable == "YES" else "NOT NULL"
                default_info = f" DEFAULT {default}" if default else ""
                self.stdout.write(f'   📝 {col_name}: {data_type} {null_info}{default_info}')
