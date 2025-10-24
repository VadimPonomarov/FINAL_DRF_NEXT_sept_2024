"""Validation utilities."""

from typing import Optional
from ..config.patterns import PRICE_RANGE


def validate_price(price_str: str) -> Optional[float]:
    """
    Validate and parse price string.
    Returns price value if valid, None otherwise.
    
    Args:
        price_str: Price string (e.g., "150.00")
        
    Returns:
        Float price value or None if invalid
    """
    try:
        # Clean and convert
        clean_price = price_str.replace(' ', '').replace(',', '.')
        price_val = float(clean_price)
        
        # Validate range
        if PRICE_RANGE['min'] <= price_val <= PRICE_RANGE['max']:
            return price_val
        
        return None
    except (ValueError, TypeError):
        return None


def is_valid_url(url: str) -> bool:
    """
    Check if URL is valid.
    
    Args:
        url: URL string
        
    Returns:
        True if URL is valid
    """
    from urllib.parse import urlparse
    
    try:
        result = urlparse(url)
        return all([result.scheme in ['http', 'https'], result.netloc])
    except Exception:
        return False

