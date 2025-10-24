"""
Currency rates parsing service.
Specialized service for extracting currency exchange rates from web pages.
"""

import logging
import re
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


class CurrencyParserService:
    """Service for extracting currency exchange rates from text content."""
    
    # Common currency codes
    CURRENCIES = [
        'USD', 'EUR', 'GBP', 'PLN', 'JPY', 'CHF', 'CAD', 'AUD',
        'CNY', 'CZK', 'DKK', 'HUF', 'NOK', 'SEK', 'TRY', 'UAH'
    ]
    
    # Patterns for currency rates
    CURRENCY_PATTERNS = [
        # "USD: 41.50 / 42.00" or "USD 41.50 / 42.00"
        re.compile(r'([A-Z]{3})\s*[:\-]?\s*(\d+[\.,]\d{2})\s*/\s*(\d+[\.,]\d{2})', re.IGNORECASE),
        # "USD Покупка: 41.50 Продажа: 42.00"
        re.compile(r'([A-Z]{3})\s+(?:покупка|buy)[:\s]+(\d+[\.,]\d{2})\s+(?:продажа|sell|продаж)[:\s]+(\d+[\.,]\d{2})', re.IGNORECASE),
        # "Доллар: 41.50 / 42.00"
        re.compile(r'(?:доллар|долар|dollar|евро|euro|фунт|pound)[:\s]+(\d+[\.,]\d{2})\s*/\s*(\d+[\.,]\d{2})', re.IGNORECASE),
        # Table format: two numbers in row
        re.compile(r'([A-Z]{3})[^0-9]*(\d+[\.,]\d{2})[^0-9]+(\d+[\.,]\d{2})', re.IGNORECASE),
    ]
    
    # Currency name mappings
    CURRENCY_NAMES = {
        'USD': 'Доллар США',
        'EUR': 'Евро',
        'GBP': 'Фунт стерлингов',
        'PLN': 'Польский злотый',
        'JPY': 'Японская йена',
        'CHF': 'Швейцарский франк',
        'CAD': 'Канадский доллар',
        'AUD': 'Австралийский доллар',
        'UAH': 'Гривна',
    }
    
    def extract_currency_rates(self, content: str, url: str) -> Dict[str, Any]:
        """
        Extract currency exchange rates from page content.
        
        Args:
            content: Page content (markdown or HTML)
            url: URL of the page
            
        Returns:
            Dict with 'url', 'rates' (list of currency rate dicts)
        """
        logger.info(f"💱 Поиск курсов валют на странице: {url}")
        logger.info(f"📄 Длина контента: {len(content)} символов")
        
        rates = []
        seen_currencies = set()
        
        for pattern in self.CURRENCY_PATTERNS:
            matches = pattern.finditer(content)
            for match in matches:
                try:
                    # Extract currency code and rates
                    if len(match.groups()) == 3:
                        currency = match.group(1).upper()
                        buy_rate = self._parse_number(match.group(2))
                        sell_rate = self._parse_number(match.group(3))
                    elif len(match.groups()) == 2:
                        # For patterns like "доллар: 41.50 / 42.00"
                        buy_rate = self._parse_number(match.group(1))
                        sell_rate = self._parse_number(match.group(2))
                        currency = self._detect_currency_from_context(content, match.start())
                    else:
                        continue
                    
                    # Validate currency
                    if currency not in self.CURRENCIES:
                        continue
                    
                    # Skip duplicates
                    if currency in seen_currencies:
                        continue
                    
                    # Validate rates
                    if not (0.01 <= buy_rate <= 10000 and 0.01 <= sell_rate <= 10000):
                        continue
                    
                    currency_name = self.CURRENCY_NAMES.get(currency, currency)
                    
                    rates.append({
                        'currency': currency,
                        'name': currency_name,
                        'buy': buy_rate,
                        'sell': sell_rate,
                        'spread': round(sell_rate - buy_rate, 2)
                    })
                    seen_currencies.add(currency)
                    
                    logger.info(f"  ✅ Курс найден: {currency} — {buy_rate} / {sell_rate}")
                    
                except Exception as e:
                    logger.warning(f"  ⚠️ Ошибка парсинга курса: {e}")
                    continue
        
        return {
            'url': url,
            'rates': rates
        }
    
    def _parse_number(self, num_str: str) -> float:
        """Parse number string to float, handling comma as decimal separator."""
        return float(num_str.replace(',', '.'))
    
    def _detect_currency_from_context(self, content: str, position: int) -> str:
        """Detect currency from surrounding context."""
        # Get 100 chars before position
        start = max(0, position - 100)
        context = content[start:position].lower()
        
        if 'доллар' in context or 'dollar' in context:
            return 'USD'
        elif 'евро' in context or 'euro' in context:
            return 'EUR'
        elif 'фунт' in context or 'pound' in context:
            return 'GBP'
        elif 'злот' in context or 'zloty' in context:
            return 'PLN'
        
        return 'USD'  # Default
    
    def format_rates_as_table(self, rates_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Format currency rates as structured table data.
        
        Args:
            rates_data: List of dicts with 'url' and 'rates'
            
        Returns:
            Dict with table_html, table_data, and summary
        """
        all_rates = []
        for data in rates_data:
            all_rates.extend(data.get('rates', []))
        
        if not all_rates:
            return {
                'table_html': None,
                'table_data': None,
                'summary': '⚠️ Курсы валют не найдены'
            }
        
        # Build summary
        summary = f"**💱 Найдено курсов валют:** {len(all_rates)}\n"
        
        # Calculate average spread
        avg_spread = sum(r['spread'] for r in all_rates) / len(all_rates)
        summary += f"**📊 Средний спред:** {avg_spread:.2f}\n"
        
        # Build table data
        table_data = []
        for rate in all_rates:
            table_data.append({
                'Валюта': f"{rate['currency']} ({rate['name']})",
                'Покупка': f"{rate['buy']:.2f}",
                'Продажа': f"{rate['sell']:.2f}",
                'Спред': f"{rate['spread']:.2f}"
            })
        
        # Build HTML table
        table_html = '<table class="currency-rates-table">\n'
        table_html += '  <thead>\n    <tr>\n'
        table_html += '      <th>Валюта</th>\n'
        table_html += '      <th>Покупка</th>\n'
        table_html += '      <th>Продажа</th>\n'
        table_html += '      <th>Спред</th>\n'
        table_html += '    </tr>\n  </thead>\n'
        table_html += '  <tbody>\n'
        
        for rate in all_rates:
            table_html += '    <tr>\n'
            table_html += f'      <td><strong>{rate["currency"]}</strong> {rate["name"]}</td>\n'
            table_html += f'      <td class="rate-buy">{rate["buy"]:.2f}</td>\n'
            table_html += f'      <td class="rate-sell">{rate["sell"]:.2f}</td>\n'
            table_html += f'      <td class="rate-spread">{rate["spread"]:.2f}</td>\n'
            table_html += '    </tr>\n'
        
        table_html += '  </tbody>\n</table>'
        
        return {
            'table_html': table_html,
            'table_data': table_data,
            'summary': summary,
            'stats': {
                'total_currencies': len(all_rates),
                'average_spread': round(avg_spread, 2)
            }
        }


# Global service instance
currency_parser_service = CurrencyParserService()

