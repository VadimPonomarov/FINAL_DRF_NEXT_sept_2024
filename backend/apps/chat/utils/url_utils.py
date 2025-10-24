"""URL processing utilities."""

import re
from typing import List, Optional
from urllib.parse import urlparse, urljoin
from ..config.patterns import URL_PATTERNS


def extract_urls(text: str) -> List[str]:
    """
    Extract all URLs from text.
    
    Args:
        text: Input text
        
    Returns:
        List of extracted URLs
    """
    urls = []
    for pattern in URL_PATTERNS:
        matches = pattern.findall(text)
        urls.extend(matches)
    
    # Normalize URLs starting with www
    normalized = []
    for url in urls:
        if url.startswith('www.'):
            url = f'https://{url}'
        normalized.append(url)
    
    return list(set(normalized))  # Remove duplicates


def normalize_url(url: str) -> str:
    """
    Normalize URL for deduplication (remove http/https differences, trailing slashes).
    
    Args:
        url: Input URL
        
    Returns:
        Normalized URL
    """
    normalized = url.replace('http://', 'https://').rstrip('/')
    return normalized


def is_internal_link(url: str, base_url: str) -> bool:
    """
    Check if URL is internal relative to base URL.
    
    Args:
        url: URL to check
        base_url: Base URL for comparison
        
    Returns:
        True if URL is internal
    """
    try:
        parsed_url = urlparse(url)
        parsed_base = urlparse(base_url)
        
        # If URL has no domain, it's relative (internal)
        if not parsed_url.netloc:
            return True
        
        # Compare domains
        return parsed_url.netloc == parsed_base.netloc
    except Exception:
        return False


def convert_to_absolute_url(url: str, base_url: str) -> str:
    """
    Convert relative URL to absolute using base URL.
    
    Args:
        url: Relative or absolute URL
        base_url: Base URL
        
    Returns:
        Absolute URL
    """
    try:
        return urljoin(base_url, url)
    except Exception:
        return url


def is_valid_url(url: str) -> bool:
    """
    Check if string is a valid URL.
    
    Args:
        url: String to check
        
    Returns:
        True if string is a valid URL
    """
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except Exception:
        return False

