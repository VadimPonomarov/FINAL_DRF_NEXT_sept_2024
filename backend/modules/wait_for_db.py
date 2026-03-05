"""
Database connection utility that falls back to a standalone version if Django is not available.
"""
import os
import sys
import subprocess
import time
from pathlib import Path

def run_standalone_script(timeout=60, interval=1.0):
    """Run the standalone database check script."""
    # Get the directory of the current file
    current_dir = Path(__file__).parent.absolute()
    # Get the project root (two levels up from modules/)
    project_root = current_dir.parent
    # Path to the standalone script
    script_path = project_root / 'scripts' / 'wait_for_db_standalone.py'
    
    if not script_path.exists():
        print(f"❌ Standalone script not found at {script_path}", file=sys.stderr)
        return False
    
    try:
        # Run the standalone script with the same arguments
        cmd = [
            sys.executable,  # Use the same Python interpreter
            str(script_path),
            f'--timeout={timeout}',
            f'--interval={interval}'
        ]
        
        # Add database connection parameters if they exist in environment
        db_host = os.getenv('DB_HOST')
        db_port = os.getenv('DB_PORT')
        
        if db_host:
            cmd.append(f'--db-host={db_host}')
        if db_port:
            cmd.append(f'--db-port={db_port}')
            
        # Run the command and return its exit code
        result = subprocess.run(cmd, check=False)
        return result.returncode == 0
    except Exception as e:
        print(f"❌ Error running standalone script: {e}", file=sys.stderr)
        return False

def wait_for_db(timeout=60, interval=1.0, **kwargs):
    """
    Wait for database to be available.
    
    This will first try to use Django's database connection if available,
    otherwise it will fall back to a simple TCP port check.
    """
    # First try to use Django if available
    try:
        from django.db import connections
        from django.db.utils import OperationalError
        
        print("ℹ️  Using Django database connection...")
        start_time = time.time()
        last_exception = None
        
        while time.time() - start_time < timeout:
            try:
                conn = connections['default']
                conn.ensure_connection()
                print('✅ Database is available!')
                return True
            except OperationalError as e:
                last_exception = e
                print('⌛ Waiting for database...')
                time.sleep(interval)
        
        print(f'❌ Database connection failed after {timeout} seconds:', file=sys.stderr)
        print(f'   {str(last_exception)}', file=sys.stderr)
        return False
        
    except ImportError:
        # Fall back to standalone version if Django is not available
        print("ℹ️  Django not available, using standalone database check...")
        return run_standalone_script(timeout, interval)


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Wait for database to be ready')
    parser.add_argument('--timeout', type=int, default=60,
                      help='Maximum time to wait in seconds (default: 60)')
    parser.add_argument('--interval', type=float, default=1.0,
                      help='Time to wait between retries in seconds (default: 1.0)')
    
    args = parser.parse_args()
    
    # Exit with non-zero status if database is not available
    if not wait_for_db(timeout=args.timeout, interval=args.interval):
        sys.exit(1)
