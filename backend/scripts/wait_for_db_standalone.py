"""
Standalone script to wait for database to be available without Django dependencies.
"""
import os
import sys
import time
import socket
import logging
from typing import Optional, Tuple

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def parse_db_url(db_url: str) -> Tuple[str, int]:
    """Parse database URL into host and port.
    
    Args:
        db_url: Database URL in format 'host:port' or 'host' (default port 5432)
        
    Returns:
        Tuple of (host, port)
    """
    if ':' in db_url:
        host, port = db_url.split(':', 1)
        return host, int(port)
    return db_url, 5432  # Default PostgreSQL port

def is_port_open(host: str, port: int, timeout: float = 1.0) -> bool:
    """Check if a TCP port is open on a host."""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((host, port))
        sock.close()
        return result == 0
    except Exception as e:
        logger.debug(f"Port check error: {e}")
        return False

def wait_for_db(
    db_host: str = "db",
    db_port: int = 5432,
    timeout: int = 60,
    interval: float = 1.0,
    **kwargs  # Accept extra kwargs for compatibility
) -> bool:
    """Wait for database to be available.
    
    Args:
        db_host: Database host
        db_port: Database port
        timeout: Maximum time to wait in seconds
        interval: Time to wait between retries in seconds
        
    Returns:
        bool: True if database is available, False if timeout was reached
    """
    start_time = time.time()
    last_error = None
    
    logger.info(f"⌛ Waiting for database at {db_host}:{db_port}... (timeout: {timeout}s)")
    
    while time.time() - start_time < timeout:
        try:
            if is_port_open(db_host, db_port):
                logger.info("✅ Database is available!")
                return True
                
            logger.debug(f"Database not available yet, retrying in {interval}s...")
            time.sleep(interval)
            
        except KeyboardInterrupt:
            logger.info("\nOperation cancelled by user")
            return False
        except Exception as e:
            last_error = str(e)
            logger.debug(f"Connection attempt failed: {last_error}")
            time.sleep(interval)
    
    logger.error(f"❌ Database connection failed after {timeout} seconds")
    if last_error:
        logger.error(f"   Last error: {last_error}")
    return False

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Wait for database to be available')
    parser.add_argument('--db-host', default=os.getenv('DB_HOST', 'db'),
                      help='Database host (default: db or DB_HOST env var)')
    parser.add_argument('--db-port', type=int, default=int(os.getenv('DB_PORT', '5432')),
                      help='Database port (default: 5432 or DB_PORT env var)')
    parser.add_argument('--timeout', type=int, default=60,
                      help='Maximum time to wait in seconds (default: 60)')
    parser.add_argument('--interval', type=float, default=1.0,
                      help='Time to wait between retries in seconds (default: 1.0)')
    parser.add_argument('--debug', action='store_true',
                      help='Enable debug logging')
    
    args = parser.parse_args()
    
    if args.debug:
        logger.setLevel(logging.DEBUG)
    
    # Exit with non-zero status if database is not available
    if not wait_for_db(
        db_host=args.db_host,
        db_port=args.db_port,
        timeout=args.timeout,
        interval=args.interval
    ):
        sys.exit(1)

if __name__ == '__main__':
    main()
