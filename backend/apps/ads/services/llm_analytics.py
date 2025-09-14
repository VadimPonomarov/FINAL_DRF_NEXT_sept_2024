"""
LLM сервис для генерации аналитических инсайтов
Использует g4f и LangChain архитектуру из IChat системы
"""
import g4f
from g4f.client import Client
import json
from django.conf import settings
from django.core.cache import cache
from datetime import datetime
import logging
from typing import Dict, List, Optional, Any
from langchain.schema.runnable import RunnableLambda
from langchain.prompts import PromptTemplate
from langchain.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class AnalyticsInsight(BaseModel):
    """Структура для аналитического инсайта"""
    title: str = Field(description="Заголовок инсайта")
    description: str = Field(description="Подробное описание")
    category: str = Field(description="Категория инсайта: trend, anomaly, recommendation, forecast")
    confidence: float = Field(description="Уверенность в инсайте от 0 до 1")
    impact: str = Field(description="Влияние: high, medium, low")


class MarketAnalysis(BaseModel):
    """Структура для рыночного анализа"""
    insights: List[AnalyticsInsight] = Field(description="Список инсайтов")
    summary: str = Field(description="Краткое резюме анализа")
    recommendations: List[str] = Field(description="Список рекомендаций")


class LLMAnalyticsService:
    """Сервис для генерации умных инсайтов с помощью g4f LLM"""

    def __init__(self, locale='ru'):
        self.locale = locale
        self.client = Client()
        self.model = "gpt-4"
        
        self.prompts = {
            'ru': {
                'system': """Ты - эксперт по автомобильному рынку и аналитике данных. 
                Анализируй предоставленные данные о продаже автомобилей и давай профессиональные инсайты.
                Отвечай на русском языке, используй профессиональную терминологию.""",
                
                'insights': """Проанализируй следующие данные автомобильного рынка и предоставь:
                1. Ключевые тренды и паттерны
                2. Рекомендации для продавцов
                3. Прогнозы развития рынка
                4. Аномалии или интересные находки
                
                Данные: {data}
                
                Ответ должен быть структурированным и практичным.""",
                
                'price_analysis': """Проанализируй ценовые данные автомобилей:
                {price_data}
                
                Предоставь анализ:
                1. Ценовые тренды по маркам
                2. Влияние года выпуска на цену
                3. Региональные различия в ценах
                4. Рекомендации по ценообразованию"""
            },
            'uk': {
                'system': """Ти - експерт з автомобільного ринку та аналітики даних. 
                Аналізуй надані дані про продаж автомобілів та давай професійні інсайти.
                Відповідай українською мовою, використовуй професійну термінологію.""",
                
                'insights': """Проаналізуй наступні дані автомобільного ринку та надай:
                1. Ключові тренди та патерни
                2. Рекомендації для продавців
                3. Прогнози розвитку ринку
                4. Аномалії або цікаві знахідки
                
                Дані: {data}
                
                Відповідь має бути структурованою та практичною.""",
                
                'price_analysis': """Проаналізуй цінові дані автомобілів:
                {price_data}
                
                Надай аналіз:
                1. Цінові тренди по марках
                2. Вплив року випуску на ціну
                3. Регіональні відмінності в цінах
                4. Рекомендації щодо ціноутворення"""
            },
            'en': {
                'system': """You are an expert in automotive market and data analytics. 
                Analyze provided car sales data and give professional insights.
                Respond in English, use professional terminology.""",
                
                'insights': """Analyze the following automotive market data and provide:
                1. Key trends and patterns
                2. Recommendations for sellers
                3. Market development forecasts
                4. Anomalies or interesting findings
                
                Data: {data}
                
                Response should be structured and practical.""",
                
                'price_analysis': """Analyze car pricing data:
                {price_data}
                
                Provide analysis:
                1. Price trends by brands
                2. Impact of manufacturing year on price
                3. Regional price differences
                4. Pricing recommendations"""
            }
        }
    
    def get_prompt(self, prompt_type):
        """Получить промпт для текущей локали"""
        return self.prompts.get(self.locale, self.prompts['ru']).get(prompt_type, '')
    
    def create_g4f_chain(self, prompt_template: str, output_parser: PydanticOutputParser):
        """Создание LangChain цепочки с g4f"""

        def g4f_llm(prompt_value):
            """G4F LLM wrapper для LangChain"""
            try:
                # Извлекаем сообщения из промпта
                if hasattr(prompt_value, 'text'):
                    content = prompt_value.text
                else:
                    content = str(prompt_value)

                messages = [
                    {"role": "system", "content": self.get_prompt('system')},
                    {"role": "user", "content": content}
                ]

                response = g4f.ChatCompletion.create(
                    model=self.model,
                    messages=messages,
                    stream=False
                )
                return response
            except Exception as e:
                logger.error(f"G4F LLM error: {e}")
                raise

        # Создаем промпт
        prompt = PromptTemplate.from_template(prompt_template)

        # Создаем цепочку: prompt -> llm -> parser
        chain = (
            prompt
            | RunnableLambda(g4f_llm)
            | output_parser
        )

        return chain

    def generate_market_insights(self, analytics_data):
        """Генерация рыночных инсайтов с использованием g4f"""
        cache_key = f'llm_insights_{self.locale}_{hash(str(analytics_data))}'
        cached_insights = cache.get(cache_key)

        if cached_insights:
            return cached_insights

        try:
            # Подготавливаем данные для анализа
            data_summary = self._prepare_data_for_llm(analytics_data)

            # Создаем парсер для структурированного вывода
            output_parser = PydanticOutputParser(pydantic_object=MarketAnalysis)

            # Создаем промпт
            prompt_template = """
            Проанализируй следующие данные автомобильного рынка и предоставь структурированный анализ:

            {data}

            {format_instructions}

            Анализ должен включать:
            1. Ключевые тренды и паттерны
            2. Аномалии или интересные находки
            3. Рекомендации для участников рынка
            4. Прогнозы развития

            Отвечай на языке: {locale}
            """

            # Создаем цепочку
            chain = self.create_g4f_chain(prompt_template, output_parser)

            # Выполняем анализ
            result = chain.invoke({
                "data": data_summary,
                "locale": self.locale,
                "format_instructions": output_parser.get_format_instructions()
            })

            response = {
                'success': True,
                'analysis': result.dict(),
                'generated_at': datetime.now().isoformat(),
                'locale': self.locale,
                'source': 'g4f_langchain'
            }

            # Кешируем на 2 часа
            cache.set(cache_key, response, timeout=7200)

            return response

        except Exception as e:
            logger.error(f"LLM insights generation error: {e}")

            # Fallback - простой анализ без LLM
            return self._generate_fallback_insights(analytics_data)
    
    def generate_price_analysis(self, price_data):
        """Генерация анализа цен с использованием g4f"""
        cache_key = f'llm_price_analysis_{self.locale}_{hash(str(price_data))}'
        cached_analysis = cache.get(cache_key)

        if cached_analysis:
            return cached_analysis

        try:
            # Простой анализ через g4f без структурированного парсинга
            messages = [
                {"role": "system", "content": self.get_prompt('system')},
                {"role": "user", "content": self.get_prompt('price_analysis').format(price_data=price_data)}
            ]

            response = g4f.ChatCompletion.create(
                model=self.model,
                messages=messages,
                stream=False
            )

            result = {
                'success': True,
                'analysis': str(response),
                'generated_at': datetime.now().isoformat(),
                'locale': self.locale,
                'source': 'g4f_direct'
            }

            # Кешируем на 2 часа
            cache.set(cache_key, result, timeout=7200)

            return result

        except Exception as e:
            logger.error(f"LLM price analysis error: {e}")
            return {
                'success': False,
                'error': str(e),
                'analysis': 'Ошибка генерации ценового анализа'
            }
    
    def generate_recommendations(self, user_data, market_data):
        """Генерация персональных рекомендаций"""
        if not self.client.api_key:
            return {
                'success': False,
                'error': 'OpenAI API key not configured'
            }
        
        try:
            prompt = f"""
            На основе данных пользователя: {user_data}
            И рыночных данных: {market_data}
            
            Предоставь персональные рекомендации:
            1. Оптимальная цена для продажи
            2. Лучшее время для размещения объявления
            3. Рекомендации по описанию и фото
            4. Прогноз времени продажи
            """
            
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": self.get_prompt('system')},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=600,
                temperature=0.7
            )
            
            recommendations = response.choices[0].message.content
            
            return {
                'success': True,
                'recommendations': recommendations,
                'generated_at': datetime.now().isoformat(),
                'locale': self.locale
            }
            
        except Exception as e:
            logger.error(f"LLM recommendations error: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _prepare_data_for_llm(self, analytics_data):
        """Подготовка данных для отправки в LLM"""
        if 'metrics' in analytics_data:
            metrics = analytics_data['metrics']
            summary = f"""
            Общая статистика:
            - Всего объявлений: {metrics.get('total_ads', 0)}
            - Активных объявлений: {metrics.get('active_ads', 0)}
            - Средняя цена: ${metrics.get('avg_price', 0):.0f}
            - Медианная цена: ${metrics.get('median_price', 0):.0f}
            - Уникальных марок: {metrics.get('unique_brands', 0)}
            - Уникальных регионов: {metrics.get('unique_regions', 0)}
            - Месячный рост: {metrics.get('monthly_growth', 0):.1f}%
            - Корреляция цена-год: {metrics.get('price_year_correlation', 0):.2f}
            - Корреляция цена-пробег: {metrics.get('price_mileage_correlation', 0):.2f}
            """
        else:
            # Fallback для базовых данных
            overview = analytics_data.get('platform_overview', {})
            summary = f"""
            Базовая статистика:
            - Всего объявлений: {overview.get('total_ads', 0)}
            - Активных объявлений: {overview.get('active_ads', 0)}
            - Всего пользователей: {overview.get('total_users', 0)}
            - Активных пользователей: {overview.get('active_users', 0)}
            - Всего просмотров: {overview.get('total_views', 0)}
            """
        
        return summary
    
    def detect_anomalies(self, analytics_data):
        """Обнаружение аномалий в данных"""
        anomalies = []
        
        if 'metrics' in analytics_data:
            metrics = analytics_data['metrics']
            
            # Проверяем аномалии
            if metrics.get('price_std', 0) > metrics.get('avg_price', 0) * 0.8:
                anomalies.append("Высокая волатильность цен - большой разброс в ценообразовании")
            
            if metrics.get('monthly_growth', 0) > 50:
                anomalies.append("Аномально высокий месячный рост объявлений")
            
            if metrics.get('monthly_growth', 0) < -30:
                anomalies.append("Значительное снижение активности на рынке")
            
            if abs(metrics.get('price_year_correlation', 0)) < 0.1:
                anomalies.append("Слабая корреляция между годом выпуска и ценой")
        
        return anomalies

    def _generate_fallback_insights(self, analytics_data):
        """Fallback инсайты без LLM"""
        try:
            insights = []

            if 'metrics' in analytics_data:
                metrics = analytics_data['metrics']

                # Анализ роста
                growth = metrics.get('monthly_growth', 0)
                if growth > 10:
                    insights.append({
                        'title': 'Высокий рост рынка',
                        'description': f'Рынок показывает рост {growth:.1f}% в месяц',
                        'category': 'trend',
                        'confidence': 0.8,
                        'impact': 'high'
                    })
                elif growth < -10:
                    insights.append({
                        'title': 'Снижение активности',
                        'description': f'Рынок показывает снижение {abs(growth):.1f}% в месяц',
                        'category': 'trend',
                        'confidence': 0.8,
                        'impact': 'high'
                    })

                # Анализ цен
                avg_price = metrics.get('avg_price', 0)
                if avg_price > 50000:
                    insights.append({
                        'title': 'Высокий ценовой сегмент',
                        'description': f'Средняя цена ${avg_price:.0f} указывает на премиум сегмент',
                        'category': 'analysis',
                        'confidence': 0.7,
                        'impact': 'medium'
                    })

            return {
                'success': True,
                'analysis': {
                    'insights': insights,
                    'summary': 'Базовый анализ без LLM',
                    'recommendations': [
                        'Мониторить тренды рынка',
                        'Анализировать ценовую политику конкурентов',
                        'Оптимизировать время размещения объявлений'
                    ]
                },
                'generated_at': datetime.now().isoformat(),
                'locale': self.locale,
                'source': 'fallback'
            }

        except Exception as e:
            logger.error(f"Fallback insights error: {e}")
            return {
                'success': False,
                'error': str(e),
                'analysis': 'Ошибка генерации базового анализа'
            }
