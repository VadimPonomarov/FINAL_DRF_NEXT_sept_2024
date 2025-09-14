"""
Django management command to switch between database configurations.
"""

import os
from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = 'Switch between database configurations (sqlite/postgresql)'

    def add_arguments(self, parser):
        parser.add_argument(
            'database',
            choices=['sqlite', 'postgresql', 'auto'],
            help='Database type to switch to'
        )
        parser.add_argument(
            '--env-file',
            default='.env.local',
            help='Environment file to modify (default: .env.local)'
        )

    def handle(self, *args, **options):
        database = options['database']
        env_file = options['env_file']
        
        self.stdout.write(f"🔄 Switching database to: {database}")
        
        if database == 'auto':
            # Auto-detect based on PostgreSQL availability
            database = self._detect_available_database()
            self.stdout.write(f"🔍 Auto-detected database: {database}")
        
        # Update environment file
        self._update_env_file(env_file, database)
        
        # Show current configuration
        self._show_current_config()
        
        self.stdout.write(
            self.style.SUCCESS(f"✅ Database switched to {database}")
        )
        self.stdout.write(
            self.style.WARNING("⚠️ Restart the server to apply changes")
        )

    def _detect_available_database(self):
        """Auto-detect which database is available."""
        try:
            import psycopg2
            # Try to connect to PostgreSQL
            conn = psycopg2.connect(
                host=os.environ.get('POSTGRES_HOST', 'localhost'),
                port=int(os.environ.get('POSTGRES_PORT', 5432)),
                database=os.environ.get('POSTGRES_DB', 'db'),
                user=os.environ.get('POSTGRES_USER', 'user'),
                password=os.environ.get('POSTGRES_PASSWORD', 'password'),
                connect_timeout=3
            )
            conn.close()
            return 'postgresql'
        except Exception:
            return 'sqlite'

    def _update_env_file(self, env_file, database):
        """Update the environment file with database configuration."""
        env_path = os.path.join(settings.BASE_DIR, env_file)
        
        if not os.path.exists(env_path):
            self.stdout.write(
                self.style.ERROR(f"❌ Environment file not found: {env_path}")
            )
            return
        
        # Read current content
        with open(env_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        # Update or add USE_SQLITE setting
        use_sqlite = 'true' if database == 'sqlite' else 'false'
        updated = False
        
        for i, line in enumerate(lines):
            if line.startswith('USE_SQLITE='):
                lines[i] = f'USE_SQLITE={use_sqlite}\n'
                updated = True
                break
        
        if not updated:
            # Add the setting if it doesn't exist
            lines.append(f'\n# Database Configuration\nUSE_SQLITE={use_sqlite}\n')
        
        # Write back to file
        with open(env_path, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        
        self.stdout.write(f"📝 Updated {env_file}: USE_SQLITE={use_sqlite}")

    def _show_current_config(self):
        """Show current database configuration."""
        try:
            from django.db import connection
            db_engine = connection.settings_dict['ENGINE']
            db_name = connection.settings_dict['NAME']
            
            if 'sqlite' in db_engine:
                self.stdout.write(f"📊 Current DB: SQLite ({db_name})")
            elif 'postgresql' in db_engine:
                db_host = connection.settings_dict['HOST']
                db_port = connection.settings_dict['PORT']
                self.stdout.write(f"📊 Current DB: PostgreSQL ({db_host}:{db_port}/{db_name})")
            else:
                self.stdout.write(f"📊 Current DB: {db_engine}")
                
        except Exception as e:
            self.stdout.write(f"⚠️ Could not determine current DB config: {e}")
