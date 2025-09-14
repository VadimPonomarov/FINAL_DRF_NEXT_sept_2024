"""
Настройки для системы аналитики
"""
import os

# OpenAI API Configuration
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', None)

# Analytics Settings
ANALYTICS_CACHE_TIMEOUT = int(os.getenv('ANALYTICS_CACHE_TIMEOUT', '3600'))  # 1 час
ANALYTICS_LLM_ENABLED = os.getenv('ANALYTICS_LLM_ENABLED', 'true').lower() == 'true'
ANALYTICS_ADVANCED_ENABLED = os.getenv('ANALYTICS_ADVANCED_ENABLED', 'true').lower() == 'true'

# Chart Generation Settings
CHART_DEFAULT_WIDTH = int(os.getenv('CHART_DEFAULT_WIDTH', '800'))
CHART_DEFAULT_HEIGHT = int(os.getenv('CHART_DEFAULT_HEIGHT', '600'))
CHART_DPI = int(os.getenv('CHART_DPI', '100'))

# Report Export Settings
REPORT_MAX_RECORDS = int(os.getenv('REPORT_MAX_RECORDS', '10000'))
REPORT_CACHE_TIMEOUT = int(os.getenv('REPORT_CACHE_TIMEOUT', '1800'))  # 30 минут

print(f"🔧 ANALYTICS: OpenAI API configured = {bool(OPENAI_API_KEY)}")
print(f"🔧 ANALYTICS: LLM enabled = {ANALYTICS_LLM_ENABLED}")
print(f"🔧 ANALYTICS: Advanced analytics enabled = {ANALYTICS_ADVANCED_ENABLED}")
