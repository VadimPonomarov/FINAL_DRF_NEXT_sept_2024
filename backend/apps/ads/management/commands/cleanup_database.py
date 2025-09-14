"""
Django management command to clean up orphaned tables and create missing migrations.
"""

from django.core.management.base import BaseCommand
from django.db import connection
from django.core.management import call_command


class Command(BaseCommand):
    help = 'Clean up orphaned tables and create missing migrations'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force cleanup without confirmation'
        )

    def handle(self, *args, **options):
        """Clean up database."""
        try:
            self.stdout.write('🧹 ОЧИСТКА БАЗЫ ДАННЫХ')
            self.stdout.write('=' * 50)
            
            # Check current state
            self._check_current_state()
            
            # Create missing migrations
            self._create_missing_migrations(options['dry_run'])
            
            # Clean up orphaned tables
            self._cleanup_orphaned_tables(options['dry_run'], options['force'])
            
            # Verify integrity
            self._verify_integrity()
            
        except Exception as e:
            self.stdout.write(f'❌ Ошибка очистки: {e}')
            raise

    def _check_current_state(self):
        """Check current database state."""
        self.stdout.write('\n🔍 ПРОВЕРКА ТЕКУЩЕГО СОСТОЯНИЯ')
        self.stdout.write('-' * 40)
        
        orphaned_tables = [
            'car_ads',
            'car_moderation', 
            'car_pricing',
            'exchange_rates'
        ]
        
        with connection.cursor() as cursor:
            for table in orphaned_tables:
                cursor.execute(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = '{table}'
                    );
                """)
                exists = cursor.fetchone()[0]
                
                if exists:
                    cursor.execute(f'SELECT COUNT(*) FROM {table};')
                    count = cursor.fetchone()[0]
                    
                    if count > 0:
                        self.stdout.write(f'⚠️ {table}: {count} записей (СОДЕРЖИТ ДАННЫЕ)')
                    else:
                        self.stdout.write(f'📋 {table}: пустая (можно удалить)')
                else:
                    self.stdout.write(f'✅ {table}: не существует')

    def _create_missing_migrations(self, dry_run):
        """Create missing migrations for models."""
        self.stdout.write('\n🔧 СОЗДАНИЕ НЕДОСТАЮЩИХ МИГРАЦИЙ')
        self.stdout.write('-' * 40)
        
        if dry_run:
            self.stdout.write('🔍 DRY RUN: Проверка необходимости миграций...')
        
        try:
            # Check if CarAd table exists
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'ads_caradmodel'
                    );
                """)
                caradmodel_exists = cursor.fetchone()[0]
            
            if not caradmodel_exists:
                self.stdout.write('❌ Таблица ads_caradmodel не существует')
                if not dry_run:
                    self.stdout.write('🔧 Создание миграций для ads...')
                    call_command('makemigrations', 'ads', verbosity=1)
                    self.stdout.write('🔧 Применение миграций...')
                    call_command('migrate', 'ads', verbosity=1)
                    self.stdout.write('✅ Миграции применены')
                else:
                    self.stdout.write('🔍 DRY RUN: Будет создана миграция для ads_caradmodel')
            else:
                self.stdout.write('✅ Таблица ads_caradmodel существует')
                
        except Exception as e:
            self.stdout.write(f'❌ Ошибка создания миграций: {e}')

    def _cleanup_orphaned_tables(self, dry_run, force):
        """Clean up orphaned tables."""
        self.stdout.write('\n🗑️ ОЧИСТКА ПОТЕРЯННЫХ ТАБЛИЦ')
        self.stdout.write('-' * 40)
        
        orphaned_tables = [
            'car_ads',
            'car_moderation', 
            'car_pricing',
            'exchange_rates'
        ]
        
        tables_to_drop = []
        
        with connection.cursor() as cursor:
            for table in orphaned_tables:
                cursor.execute(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = '{table}'
                    );
                """)
                exists = cursor.fetchone()[0]
                
                if exists:
                    cursor.execute(f'SELECT COUNT(*) FROM {table};')
                    count = cursor.fetchone()[0]
                    
                    if count == 0:
                        tables_to_drop.append(table)
                        if dry_run:
                            self.stdout.write(f'🔍 DRY RUN: Будет удалена пустая таблица {table}')
                        else:
                            self.stdout.write(f'🗑️ Удаление пустой таблицы {table}...')
                    else:
                        self.stdout.write(f'⚠️ Таблица {table} содержит {count} записей')
                        if force:
                            tables_to_drop.append(table)
                            if dry_run:
                                self.stdout.write(f'🔍 DRY RUN: Будет принудительно удалена {table} с данными')
                            else:
                                self.stdout.write(f'🗑️ ПРИНУДИТЕЛЬНОЕ удаление {table} с данными...')
                        else:
                            self.stdout.write(f'   💡 Используйте --force для принудительного удаления')
        
        if not dry_run and tables_to_drop:
            for table in tables_to_drop:
                with connection.cursor() as cursor:
                    cursor.execute(f'DROP TABLE IF EXISTS {table} CASCADE;')
                    self.stdout.write(f'✅ Таблица {table} удалена')
        
        if not tables_to_drop:
            self.stdout.write('ℹ️ Нет таблиц для удаления')

    def _verify_integrity(self):
        """Verify database integrity after cleanup."""
        self.stdout.write('\n✅ ПРОВЕРКА ЦЕЛОСТНОСТИ')
        self.stdout.write('-' * 40)
        
        try:
            # Check Django models can be imported
            from apps.ads.models import CarAd
            self.stdout.write('✅ Модель CarAd импортируется')
            
            # Check table exists
            table_name = CarAd._meta.db_table
            with connection.cursor() as cursor:
                cursor.execute(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = '{table_name}'
                    );
                """)
                exists = cursor.fetchone()[0]
                
                if exists:
                    cursor.execute(f'SELECT COUNT(*) FROM {table_name};')
                    count = cursor.fetchone()[0]
                    self.stdout.write(f'✅ Таблица {table_name} существует ({count} записей)')
                else:
                    self.stdout.write(f'❌ Таблица {table_name} не существует')
            
            # Check reference models
            from apps.ads.models import CarMarkModel, RegionModel, CityModel
            
            mark_count = CarMarkModel.objects.count()
            region_count = RegionModel.objects.count()
            city_count = CityModel.objects.count()
            
            self.stdout.write(f'✅ Справочники: {mark_count} марок, {region_count} регионов, {city_count} городов')
            
            # Check accounts
            from apps.accounts.models import AddsAccount
            account_count = AddsAccount.objects.count()
            self.stdout.write(f'✅ Аккаунты: {account_count} записей')
            
        except Exception as e:
            self.stdout.write(f'❌ Ошибка проверки целостности: {e}')

    def _show_final_summary(self):
        """Show final summary."""
        self.stdout.write('\n📊 ИТОГОВОЕ СОСТОЯНИЕ')
        self.stdout.write('-' * 40)
        
        with connection.cursor() as cursor:
            # Count all tables
            cursor.execute("""
                SELECT COUNT(*) 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE';
            """)
            total_tables = cursor.fetchone()[0]
            
            # Count Django model tables
            from django.apps import apps
            django_tables = 0
            for app_config in apps.get_app_configs():
                django_tables += len(app_config.get_models())
            
            self.stdout.write(f'📋 Всего таблиц в БД: {total_tables}')
            self.stdout.write(f'🐍 Django моделей: {django_tables}')
            
            # Check for remaining orphaned tables
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
                AND table_name NOT LIKE 'django_%'
                AND table_name NOT LIKE 'auth_%'
                AND table_name NOT LIKE 'token_%';
            """)
            app_tables = cursor.fetchall()
            
            self.stdout.write(f'📱 Таблицы приложений: {len(app_tables)}')
            
        self.stdout.write('\n🎉 ОЧИСТКА ЗАВЕРШЕНА!')
        self.stdout.write('💡 База данных приведена в порядок')
