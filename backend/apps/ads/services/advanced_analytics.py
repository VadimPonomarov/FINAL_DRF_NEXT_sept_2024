"""
Расширенная аналитика с pandas, matplotlib и plotly
"""
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import plotly.express as px
import plotly.graph_objects as go
from plotly.utils import PlotlyJSONEncoder
import numpy as np
import json
import base64
from io import BytesIO
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Count, Avg, Sum, Min, Max, Q
from django.core.cache import cache

from apps.ads.models import CarAd, AdView
from apps.accounts.models import AddsAccount
from django.contrib.auth import get_user_model

User = get_user_model()

# Настройка matplotlib для работы без GUI
plt.switch_backend('Agg')
sns.set_style("whitegrid")
plt.rcParams['figure.figsize'] = (12, 8)
plt.rcParams['font.size'] = 10


class AdvancedAnalyticsService:
    """Сервис для расширенной аналитики с визуализацией"""
    
    def __init__(self, locale='ru'):
        self.locale = locale
        self.translations = {
            'ru': {
                'total_ads': 'Всего объявлений',
                'active_ads': 'Активные объявления',
                'price_distribution': 'Распределение цен',
                'top_brands': 'ТОП марки',
                'regional_stats': 'Статистика по регионам',
                'monthly_trends': 'Месячные тренды',
                'seller_types': 'Типы продавцов',
                'price_ranges': 'Ценовые диапазоны'
            },
            'uk': {
                'total_ads': 'Всього оголошень',
                'active_ads': 'Активні оголошення',
                'price_distribution': 'Розподіл цін',
                'top_brands': 'ТОП марки',
                'regional_stats': 'Статистика по регіонах',
                'monthly_trends': 'Місячні тренди',
                'seller_types': 'Типи продавців',
                'price_ranges': 'Цінові діапазони'
            },
            'en': {
                'total_ads': 'Total Ads',
                'active_ads': 'Active Ads',
                'price_distribution': 'Price Distribution',
                'top_brands': 'Top Brands',
                'regional_stats': 'Regional Statistics',
                'monthly_trends': 'Monthly Trends',
                'seller_types': 'Seller Types',
                'price_ranges': 'Price Ranges'
            }
        }
    
    def t(self, key):
        """Получить перевод"""
        return self.translations.get(self.locale, self.translations['ru']).get(key, key)
    
    def get_dataframe(self):
        """Получить DataFrame с данными объявлений"""
        cache_key = f'ads_dataframe_{self.locale}'
        df = cache.get(cache_key)
        
        if df is None:
            # Получаем данные из базы
            ads_data = CarAd.objects.select_related('mark', 'model', 'user').values(
                'id', 'title', 'price', 'year', 'mileage', 'region', 'city',
                'seller_type', 'status', 'created_at', 'updated_at',
                'mark__name', 'model__name', 'user__id'
            )
            
            df = pd.DataFrame(list(ads_data))
            
            if not df.empty:
                # Обработка данных
                df['created_at'] = pd.to_datetime(df['created_at'])
                df['updated_at'] = pd.to_datetime(df['updated_at'])
                df['price'] = pd.to_numeric(df['price'], errors='coerce')
                df['year'] = pd.to_numeric(df['year'], errors='coerce')
                df['mileage'] = pd.to_numeric(df['mileage'], errors='coerce')
                
                # Добавляем вычисляемые поля
                df['age'] = datetime.now().year - df['year']
                df['price_per_year'] = df['price'] / (df['age'] + 1)
                df['month'] = df['created_at'].dt.to_period('M')
                
                # Кешируем на 30 минут
                cache.set(cache_key, df, timeout=1800)
        
        return df
    
    def generate_price_distribution_chart(self):
        """Генерация графика распределения цен"""
        df = self.get_dataframe()
        
        if df.empty:
            return None
        
        # Создаем интерактивный график с Plotly
        fig = px.histogram(
            df, 
            x='price', 
            nbins=30,
            title=self.t('price_distribution'),
            labels={'price': 'Цена ($)', 'count': 'Количество'}
        )
        
        fig.update_layout(
            xaxis_title='Цена ($)',
            yaxis_title='Количество объявлений',
            showlegend=False
        )
        
        return json.dumps(fig, cls=PlotlyJSONEncoder)
    
    def generate_top_brands_chart(self):
        """Генерация графика ТОП марок"""
        df = self.get_dataframe()
        
        if df.empty:
            return None
        
        # ТОП-10 марок
        top_brands = df['mark__name'].value_counts().head(10)
        
        fig = px.bar(
            x=top_brands.values,
            y=top_brands.index,
            orientation='h',
            title=self.t('top_brands'),
            labels={'x': 'Количество', 'y': 'Марка'}
        )
        
        fig.update_layout(
            xaxis_title='Количество объявлений',
            yaxis_title='Марка автомобиля'
        )
        
        return json.dumps(fig, cls=PlotlyJSONEncoder)
    
    def generate_regional_stats_chart(self):
        """Генерация графика по регионам"""
        df = self.get_dataframe()
        
        if df.empty:
            return None
        
        # ТОП-10 регионов
        regional_stats = df['region'].value_counts().head(10)
        
        fig = px.pie(
            values=regional_stats.values,
            names=regional_stats.index,
            title=self.t('regional_stats')
        )
        
        return json.dumps(fig, cls=PlotlyJSONEncoder)
    
    def generate_monthly_trends_chart(self):
        """Генерация графика месячных трендов"""
        df = self.get_dataframe()
        
        if df.empty:
            return None
        
        # Группируем по месяцам
        monthly_stats = df.groupby('month').agg({
            'id': 'count',
            'price': 'mean'
        }).reset_index()
        
        monthly_stats['month_str'] = monthly_stats['month'].astype(str)
        
        # Создаем график с двумя осями Y
        fig = go.Figure()
        
        # Количество объявлений
        fig.add_trace(go.Scatter(
            x=monthly_stats['month_str'],
            y=monthly_stats['id'],
            mode='lines+markers',
            name='Количество объявлений',
            yaxis='y'
        ))
        
        # Средняя цена
        fig.add_trace(go.Scatter(
            x=monthly_stats['month_str'],
            y=monthly_stats['price'],
            mode='lines+markers',
            name='Средняя цена ($)',
            yaxis='y2'
        ))
        
        fig.update_layout(
            title=self.t('monthly_trends'),
            xaxis_title='Месяц',
            yaxis=dict(title='Количество объявлений', side='left'),
            yaxis2=dict(title='Средняя цена ($)', side='right', overlaying='y'),
            legend=dict(x=0.01, y=0.99)
        )
        
        return json.dumps(fig, cls=PlotlyJSONEncoder)
    
    def generate_seller_types_chart(self):
        """Генерация графика типов продавцов"""
        df = self.get_dataframe()
        
        if df.empty:
            return None
        
        seller_stats = df['seller_type'].value_counts()
        
        fig = px.donut(
            values=seller_stats.values,
            names=seller_stats.index,
            title=self.t('seller_types')
        )
        
        return json.dumps(fig, cls=PlotlyJSONEncoder)
    
    def calculate_advanced_metrics(self):
        """Расчет расширенных метрик"""
        df = self.get_dataframe()
        
        if df.empty:
            return {}
        
        metrics = {
            'total_ads': len(df),
            'active_ads': len(df[df['status'] == 'active']),
            'avg_price': df['price'].mean(),
            'median_price': df['price'].median(),
            'price_std': df['price'].std(),
            'avg_year': df['year'].mean(),
            'avg_mileage': df['mileage'].mean(),
            'unique_brands': df['mark__name'].nunique(),
            'unique_regions': df['region'].nunique(),
            'price_per_year_avg': df['price_per_year'].mean(),
            
            # Корреляции
            'price_year_correlation': df['price'].corr(df['year']),
            'price_mileage_correlation': df['price'].corr(df['mileage']),
            
            # Квантили цен
            'price_q25': df['price'].quantile(0.25),
            'price_q75': df['price'].quantile(0.75),
            
            # Тренды
            'monthly_growth': self._calculate_monthly_growth(df),
            'seasonal_patterns': self._analyze_seasonal_patterns(df)
        }
        
        return metrics
    
    def _calculate_monthly_growth(self, df):
        """Расчет месячного роста"""
        monthly_counts = df.groupby('month')['id'].count()
        if len(monthly_counts) < 2:
            return 0
        
        growth_rates = monthly_counts.pct_change().dropna()
        return growth_rates.mean() * 100
    
    def _analyze_seasonal_patterns(self, df):
        """Анализ сезонных паттернов"""
        df['month_num'] = df['created_at'].dt.month
        seasonal_stats = df.groupby('month_num')['id'].count()
        
        return {
            'peak_month': seasonal_stats.idxmax(),
            'low_month': seasonal_stats.idxmin(),
            'seasonal_variance': seasonal_stats.var()
        }
    
    def generate_full_analytics_report(self):
        """Генерация полного аналитического отчета"""
        return {
            'metrics': self.calculate_advanced_metrics(),
            'charts': {
                'price_distribution': self.generate_price_distribution_chart(),
                'top_brands': self.generate_top_brands_chart(),
                'regional_stats': self.generate_regional_stats_chart(),
                'monthly_trends': self.generate_monthly_trends_chart(),
                'seller_types': self.generate_seller_types_chart()
            },
            'generated_at': timezone.now().isoformat(),
            'locale': self.locale
        }
