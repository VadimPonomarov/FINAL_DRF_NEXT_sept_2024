"""Price parsing service."""

import logging
import re
from typing import List, Dict, Any, Optional
from ..config.patterns import PRICE_PATTERNS
from ..utils.validators import validate_price
from ..utils.text_processing import extract_item_name_from_context

logger = logging.getLogger(__name__)


class PriceParserService:
    """Service for extracting and parsing prices from text content."""
    
    def __init__(self):
        self.price_patterns = PRICE_PATTERNS
    
    def extract_prices_from_content(
        self, 
        content: str, 
        page_url: str
    ) -> Dict[str, Any]:
        """
        Extract prices and item names from page content.
        
        Args:
            content: Page content (markdown or HTML)
            page_url: URL of the page
            
        Returns:
            Dictionary with 'url' and 'items' (list of {name, price})
        """
        logger.info(f"🔍 Поиск цен на странице: {page_url}")
        logger.info(f"📄 Длина контента: {len(content)} символов")
        
        page_items = []
        seen_prices = set()
        
        for pattern in self.price_patterns:
            matches = pattern.finditer(content)
            for match in matches:
                price_str = match.group(1)
                
                # Validate price
                price_val = validate_price(price_str)
                if price_val is None:
                    continue
                
                clean_price = str(price_val)
                
                # Skip duplicates
                if clean_price in seen_prices:
                    continue
                
                # Extract context (60 symbols before price)
                start = max(0, match.start() - 60)
                end = match.start()
                context = content[start:end].strip()
                
                # Extract item name from context
                item_name = extract_item_name_from_context(context)
                
                page_items.append({
                    'name': item_name,
                    'price': clean_price
                })
                seen_prices.add(clean_price)
                
                logger.info(f"  ✅ Цена найдена: {clean_price} грн — {item_name[:30]}")
        
        return {
            'url': page_url,
            'items': page_items
        }
    
    def format_prices_as_structured_data(
        self, 
        prices_data: List[Dict[str, Any]],
        include_url: bool = False
    ) -> Dict[str, Any]:
        """
        Format prices data as structured data for table rendering.
        Returns dict with table_html, table_data, and summary.
        
        Args:
            prices_data: List of dicts with 'url' and 'items'
            include_url: Whether to include URL column in table
            
        Returns:
            Dict with structured table data
        """
        from .table_formatter_service import table_formatter_service
        
        return table_formatter_service.format_prices_as_table(
            prices_data, 
            include_url=include_url
        )


# Global service instance
price_parser_service = PriceParserService()

