"""
Management command to check if reference tables exist.
"""
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Check if reference tables exist in the database'

    def handle(self, *args, **options):
        """Main command handler."""
        self.stdout.write(self.style.SUCCESS('Checking database tables...'))
        
        with connection.cursor() as cursor:
            # Get all table names
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name LIKE '%car%'
                ORDER BY table_name;
            """)
            
            tables = cursor.fetchall()
            
            if tables:
                self.stdout.write(self.style.SUCCESS('Found car-related tables:'))
                for table in tables:
                    self.stdout.write(f'  - {table[0]}')
            else:
                self.stdout.write(self.style.WARNING('No car-related tables found'))
            
            # Check specific table
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'car_make_model'
                );
            """)
            
            exists = cursor.fetchone()[0]
            
            if exists:
                self.stdout.write(self.style.SUCCESS('✅ Table car_make_model exists'))
                
                # Check columns
                cursor.execute("""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'car_make_model'
                    ORDER BY ordinal_position;
                """)
                
                columns = cursor.fetchall()
                self.stdout.write('Columns:')
                for col in columns:
                    self.stdout.write(f'  - {col[0]} ({col[1]})')
                    
            else:
                self.stdout.write(self.style.ERROR('❌ Table car_make_model does not exist'))
                
        self.stdout.write(self.style.SUCCESS('Table check completed!'))
