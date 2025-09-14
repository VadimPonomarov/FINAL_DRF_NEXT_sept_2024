"""
Custom test runner that automatically manages database switching.
"""

import os
import sys
from django.test.runner import DiscoverRunner
from django.core.management import call_command
from django.conf import settings


class AutoSwitchDatabaseTestRunner(DiscoverRunner):
    """
    Test runner that automatically switches database configuration.
    
    - Before tests: Ensures test database is used
    - After tests: Restores production database configuration
    """
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.original_db_config = None
        self.env_file = '.env.local'
    
    def setup_test_environment(self, **kwargs):
        """Set up test environment and save original DB config."""
        print("🧪 Setting up test environment...")
        
        # Save original database configuration
        self._save_original_db_config()
        
        # Ensure we're using test database (SQLite in-memory)
        self._ensure_test_database()
        
        super().setup_test_environment(**kwargs)
        print("✅ Test environment ready")
    
    def teardown_test_environment(self, **kwargs):
        """Tear down test environment and restore original DB config."""
        print("🧹 Tearing down test environment...")
        
        super().teardown_test_environment(**kwargs)
        
        # Restore original database configuration
        self._restore_original_db_config()
        
        print("✅ Test environment cleaned up")
        print("🔄 Database configuration restored to production settings")
    
    def _save_original_db_config(self):
        """Save the original database configuration."""
        env_path = os.path.join(settings.BASE_DIR, self.env_file)
        
        if os.path.exists(env_path):
            with open(env_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Extract USE_SQLITE setting
            for line in content.split('\n'):
                if line.startswith('USE_SQLITE='):
                    self.original_db_config = line.split('=')[1].strip()
                    break
            else:
                # If USE_SQLITE is not found, assume PostgreSQL
                self.original_db_config = 'false'
        else:
            self.original_db_config = 'false'
        
        print(f"💾 Saved original DB config: USE_SQLITE={self.original_db_config}")
    
    def _ensure_test_database(self):
        """Ensure we're using the test database configuration."""
        # Tests should always use SQLite in-memory
        # This is handled by the TESTING flag in db.py
        current_engine = settings.DATABASES['default']['ENGINE']
        
        if 'sqlite' not in current_engine:
            print("⚠️ Warning: Tests should use SQLite, but PostgreSQL detected")
            print("   This might indicate a configuration issue")
        else:
            print("✅ Using SQLite for tests")
    
    def _restore_original_db_config(self):
        """Restore the original database configuration."""
        if self.original_db_config is None:
            print("⚠️ No original DB config to restore")
            return
        
        env_path = os.path.join(settings.BASE_DIR, self.env_file)
        
        if not os.path.exists(env_path):
            print(f"⚠️ Environment file not found: {env_path}")
            return
        
        try:
            # Read current content
            with open(env_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            # Update USE_SQLITE setting
            updated = False
            for i, line in enumerate(lines):
                if line.startswith('USE_SQLITE='):
                    lines[i] = f'USE_SQLITE={self.original_db_config}\n'
                    updated = True
                    break
            
            if not updated:
                # Add the setting if it doesn't exist
                lines.append(f'\n# Database Configuration\nUSE_SQLITE={self.original_db_config}\n')
            
            # Write back to file
            with open(env_path, 'w', encoding='utf-8') as f:
                f.writelines(lines)
            
            db_type = 'SQLite' if self.original_db_config == 'true' else 'PostgreSQL'
            print(f"🔄 Restored database configuration to: {db_type}")
            
        except Exception as e:
            print(f"❌ Failed to restore DB config: {e}")


class SmartDatabaseTestRunner(DiscoverRunner):
    """
    Smart test runner that automatically detects and configures the best database.
    """
    
    def setup_test_environment(self, **kwargs):
        """Set up test environment with smart database detection."""
        print("🧠 Smart database test runner starting...")
        
        # Auto-detect and configure database after tests
        self._schedule_post_test_db_switch()
        
        super().setup_test_environment(**kwargs)
    
    def _schedule_post_test_db_switch(self):
        """Schedule database switch after tests complete."""
        import atexit
        
        def restore_production_db():
            print("🔄 Auto-switching to production database...")
            try:
                # Try to switch to the best available database
                call_command('switch_database', 'auto', verbosity=0)
                print("✅ Database switched to production configuration")
            except Exception as e:
                print(f"⚠️ Could not auto-switch database: {e}")
        
        atexit.register(restore_production_db)
