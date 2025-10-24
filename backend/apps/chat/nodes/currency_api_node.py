"""
Currency API node - get real currency rates from public APIs.
"""

import logging
import asyncio
import aiohttp
from typing import Dict, Any
from datetime import datetime
from apps.chat.types.types import AgentState

logger = logging.getLogger(__name__)


async def fetch_nbu_rates() -> Dict[str, Any]:
    """Fetch currency rates from National Bank of Ukraine API."""
    url = "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json"
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=10) as response:
                if response.status == 200:
                    data = await response.json()
                    return {'success': True, 'data': data}
                else:
                    return {'success': False, 'error': f'HTTP {response.status}'}
    except Exception as e:
        logger.error(f"NBU API error: {e}")
        return {'success': False, 'error': str(e)}


async def fetch_privatbank_rates() -> Dict[str, Any]:
    """Fetch currency rates from PrivatBank API."""
    url = "https://api.privatbank.ua/p24api/pubinfo?exchange&coursid=5"
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=10) as response:
                if response.status == 200:
                    data = await response.json()
                    return {'success': True, 'data': data}
                else:
                    return {'success': False, 'error': f'HTTP {response.status}'}
    except Exception as e:
        logger.error(f"PrivatBank API error: {e}")
        return {'success': False, 'error': str(e)}


def format_currency_rates(rates_data: list, source: str) -> Dict[str, Any]:
    """Format currency rates as table data."""
    
    table_data = []
    
    if source == 'nbu':
        # NBU format: [{"r030": 840, "txt": "Долар США", "rate": 41.5, "cc": "USD"}]
        main_currencies = ['USD', 'EUR', 'GBP', 'PLN']
        for rate in rates_data:
            cc = rate.get('cc', '')
            if cc in main_currencies:
                table_data.append({
                    'Валюта': f"{cc} ({rate.get('txt', cc)})",
                    'Курс НБУ': f"{rate.get('rate', 0):.2f}",
                    'Дата': rate.get('exchangedate', '')
                })
    
    elif source == 'privatbank':
        # PrivatBank format: [{"ccy": "USD", "base_ccy": "UAH", "buy": "41.50", "sale": "42.00"}]
        for rate in rates_data:
            ccy = rate.get('ccy', '')
            if ccy in ['USD', 'EUR', 'GBP', 'PLN', 'CHF']:
                table_data.append({
                    'Валюта': ccy,
                    'Покупка': rate.get('buy', '0'),
                    'Продажа': rate.get('sale', '0')
                })
    
    # Build HTML table
    if source == 'nbu':
        table_html = '<table class="currency-table">\n<thead>\n<tr>\n'
        table_html += '<th>Валюта</th><th>Курс НБУ</th><th>Дата</th>\n'
        table_html += '</tr>\n</thead>\n<tbody>\n'
        for row in table_data:
            table_html += '<tr>\n'
            table_html += f'<td><strong>{row["Валюта"]}</strong></td>\n'
            table_html += f'<td>{row["Курс НБУ"]}</td>\n'
            table_html += f'<td>{row["Дата"]}</td>\n'
            table_html += '</tr>\n'
        table_html += '</tbody>\n</table>'
    else:
        table_html = '<table class="currency-table">\n<thead>\n<tr>\n'
        table_html += '<th>Валюта</th><th>Покупка</th><th>Продажа</th>\n'
        table_html += '</tr>\n</thead>\n<tbody>\n'
        for row in table_data:
            table_html += '<tr>\n'
            table_html += f'<td><strong>{row["Валюта"]}</strong></td>\n'
            table_html += f'<td class="buy">{row["Покупка"]}</td>\n'
            table_html += f'<td class="sell">{row["Продажа"]}</td>\n'
            table_html += '</tr>\n'
        table_html += '</tbody>\n</table>'
    
    return {
        'table_html': table_html,
        'table_data': table_data,
        'total_currencies': len(table_data)
    }


def currency_api_node(state: AgentState) -> AgentState:
    """
    Get currency rates from public APIs (NBU, PrivatBank).
    
    Args:
        state: Current agent state
        
    Returns:
        Updated state with currency rates
    """
    try:
        query_lower = state.query.lower()
        
        # Determine which API to use
        use_privatbank = 'приват' in query_lower or 'privatbank' in query_lower or \
                         'обмен' in query_lower or 'купить' in query_lower
        
        if use_privatbank:
            logger.info("📊 Fetching rates from PrivatBank API...")
            result = asyncio.run(fetch_privatbank_rates())
            source = 'privatbank'
            source_name = 'PrivatBank'
        else:
            logger.info("📊 Fetching rates from NBU API...")
            result = asyncio.run(fetch_nbu_rates())
            source = 'nbu'
            source_name = 'Национальный Банк Украины'
        
        if not result['success']:
            return state.model_copy(update={
                "result": f"❌ Не удалось получить курсы валют: {result.get('error', 'Unknown error')}",
                "metadata": {**state.metadata, "api_error": True}
            })
        
        # Format rates as table
        formatted = format_currency_rates(result['data'], source)
        
        # Build response text
        response = f"**💱 Курсы валют ({source_name})**\n\n"
        response += f"**📅 Дата:** {datetime.now().strftime('%d.%m.%Y %H:%M')}\n\n"
        
        if formatted['table_data']:
            response += f"**💵 Найдено валют:** {formatted['total_currencies']}\n\n"
            
            # Add text version
            for rate in formatted['table_data']:
                if source == 'nbu':
                    response += f"• {rate['Валюта']}: **{rate['Курс НБУ']}** грн ({rate['Дата']})\n"
                else:
                    response += f"• {rate['Валюта']}: Покупка **{rate['Покупка']}** / Продажа **{rate['Продажа']}**\n"
        else:
            response += "⚠️ Курсы не найдены\n"
        
        # Add to chat history
        state.add_chat_message("assistant", response)
        
        return state.model_copy(update={
            "result": response,
            "table_html": formatted.get('table_html'),
            "table_data": formatted.get('table_data'),
            "metadata": {
                **state.metadata,
                "currency_source": source,
                "total_currencies": formatted['total_currencies'],
                "has_table": True
            }
        })
        
    except Exception as e:
        error_msg = f"Currency API error: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return state.model_copy(update={"error": error_msg})

