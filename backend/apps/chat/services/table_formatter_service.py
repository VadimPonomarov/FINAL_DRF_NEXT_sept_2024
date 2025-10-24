"""Table formatting service for beautiful data display."""

import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


class TableFormatterService:
    """Service for formatting data as beautiful HTML tables."""
    
    def __init__(self):
        self.default_styles = {
            'table': 'border-collapse: collapse; width: 100%; margin: 10px 0; font-family: Arial, sans-serif;',
            'th': 'background-color: #4CAF50; color: white; padding: 12px; text-align: left; border: 1px solid #ddd;',
            'td': 'padding: 10px; border: 1px solid #ddd; text-align: left;',
            'tr_even': 'background-color: #f2f2f2;',
            'tr_odd': 'background-color: white;',
            'tr_hover': 'tr:hover { background-color: #ddd; }'
        }
    
    def format_prices_as_table(
        self, 
        prices_data: List[Dict[str, Any]], 
        include_url: bool = False
    ) -> Dict[str, Any]:
        """
        Format prices data as structured table data for frontend rendering.
        
        Args:
            prices_data: List of dicts with 'url' and 'items' (each item has 'name' and 'price')
            include_url: Whether to include URL in the table
            
        Returns:
            Dict with 'table_html' and 'table_data' for frontend
        """
        if not prices_data:
            return {
                'table_html': None,
                'table_data': None,
                'summary': '⚠️ Цены не найдены'
            }
        
        # Collect all items from all pages
        all_items = []
        for page_info in prices_data:
            items = page_info.get('items', [])
            url = page_info.get('url', '')
            
            for item in items:
                row = {
                    'Товар': item.get('name', 'Товар'),
                    'Цена (грн)': item.get('price', '0'),
                }
                if include_url:
                    row['Источник'] = url
                
                all_items.append(row)
        
        if not all_items:
            return {
                'table_html': None,
                'table_data': None,
                'summary': '⚠️ Товары не найдены'
            }
        
        # Generate HTML table
        html_table = self._generate_html_table(all_items)
        
        # Generate summary
        total_items = len(all_items)
        prices = [float(item['Цена (грн)']) for item in all_items]
        min_price = min(prices) if prices else 0
        max_price = max(prices) if prices else 0
        avg_price = sum(prices) / len(prices) if prices else 0
        
        summary = (
            f"💰 **Найдено товаров:** {total_items}\n"
            f"📊 **Минимальная цена:** {min_price:.2f} грн\n"
            f"📊 **Максимальная цена:** {max_price:.2f} грн\n"
            f"📊 **Средняя цена:** {avg_price:.2f} грн"
        )
        
        return {
            'table_html': html_table,
            'table_data': all_items,  # Raw data for frontend to use
            'summary': summary,
            'total_items': total_items,
            'stats': {
                'min': min_price,
                'max': max_price,
                'avg': avg_price
            }
        }
    
    def _generate_html_table(self, data: List[Dict[str, Any]]) -> str:
        """
        Generate HTML table from data.
        
        Args:
            data: List of dicts (each dict is a row)
            
        Returns:
            HTML table string
        """
        if not data:
            return ""
        
        # Extract headers from first row
        headers = list(data[0].keys())
        
        # Build HTML
        html = f'<table style="{self.default_styles["table"]}">\n'
        
        # Add style for hover effect
        html += f'<style>{self.default_styles["tr_hover"]}</style>\n'
        
        # Header row
        html += '  <thead>\n    <tr>\n'
        for header in headers:
            html += f'      <th style="{self.default_styles["th"]}">{header}</th>\n'
        html += '    </tr>\n  </thead>\n'
        
        # Data rows
        html += '  <tbody>\n'
        for i, row in enumerate(data):
            row_style = self.default_styles['tr_even'] if i % 2 == 0 else self.default_styles['tr_odd']
            html += f'    <tr style="{row_style}">\n'
            for header in headers:
                value = row.get(header, '')
                # Format price with bold if it's a price column
                if 'цена' in header.lower() or 'price' in header.lower():
                    html += f'      <td style="{self.default_styles["td"]}"><strong>{value}</strong></td>\n'
                else:
                    html += f'      <td style="{self.default_styles["td"]}">{value}</td>\n'
            html += '    </tr>\n'
        html += '  </tbody>\n'
        
        html += '</table>'
        
        return html
    
    def format_generic_table(
        self, 
        data: List[Dict[str, Any]], 
        title: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Format any data as a table.
        
        Args:
            data: List of dicts (each dict is a row)
            title: Optional table title
            
        Returns:
            Dict with 'table_html' and 'table_data'
        """
        if not data:
            return {
                'table_html': None,
                'table_data': None,
                'summary': 'Нет данных для отображения'
            }
        
        html_table = self._generate_html_table(data)
        
        if title:
            html_table = f'<h3>{title}</h3>\n{html_table}'
        
        return {
            'table_html': html_table,
            'table_data': data,
            'summary': f"Всего записей: {len(data)}"
        }
    
    def create_comparison_table(
        self, 
        prices_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Create a comparison table grouped by product names.
        Useful when scraping multiple sites.
        
        Args:
            prices_data: List of dicts with 'url' and 'items'
            
        Returns:
            Comparison table data
        """
        # Group by product name
        product_map = {}
        
        for page_info in prices_data:
            url = page_info.get('url', '')
            site_name = url.split('/')[2] if '/' in url else url  # Extract domain
            
            for item in page_info.get('items', []):
                name = item.get('name', 'Товар')
                price = item.get('price', '0')
                
                if name not in product_map:
                    product_map[name] = {'Товар': name}
                
                product_map[name][site_name] = f"{price} грн"
        
        # Convert to list
        comparison_data = list(product_map.values())
        
        return self.format_generic_table(
            comparison_data, 
            title="📊 Сравнение цен"
        )


# Global service instance
table_formatter_service = TableFormatterService()

