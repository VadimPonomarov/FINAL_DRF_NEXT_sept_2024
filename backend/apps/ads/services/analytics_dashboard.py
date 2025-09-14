"""
Сервис аналитики с pandas, графиками и LLM отчетами
"""
import pandas as pd
import matplotlib
matplotlib.use('Agg')  # Используем non-GUI backend
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import base64
import io
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Count, Avg, Min, Max, Sum, Q
from typing import Dict, List, Any, Optional

from apps.ads.models import CarAd, AdView, ExchangeRate
from apps.ads.models.reference import RegionModel, CarMarkModel
from apps.accounts.models import AddsAccount
from django.contrib.auth import get_user_model

User = get_user_model()

# Настройка стиля графиков
plt.style.use('seaborn-v0_8')
sns.set_palette("husl")

class AnalyticsDashboardService:
    """Сервис для создания аналитического dashboard"""
    
    def __init__(self, locale: str = 'uk'):
        self.locale = locale
        self.translations = self._get_translations()
        
    def _get_translations(self) -> Dict[str, Dict[str, str]]:
        """Переводы для разных локалей"""
        return {
            'uk': {
                'total_ads': 'Всього оголошень',
                'active_ads': 'Активних оголошень',
                'users': 'Користувачі',
                'views': 'Перегляди',
                'top_brands': 'ТОП марки автомобілів',
                'price_distribution': 'Розподіл цін',
                'regional_stats': 'Статистика по регіонах',
                'daily_activity': 'Щоденна активність',
                'seller_types': 'Типи продавців',
                'currency': 'грн',
                'ads': 'оголошень',
                'views_count': 'переглядів'
            },
            'en': {
                'total_ads': 'Total Ads',
                'active_ads': 'Active Ads',
                'users': 'Users',
                'views': 'Views',
                'top_brands': 'TOP Car Brands',
                'price_distribution': 'Price Distribution',
                'regional_stats': 'Regional Statistics',
                'daily_activity': 'Daily Activity',
                'seller_types': 'Seller Types',
                'currency': 'UAH',
                'ads': 'ads',
                'views_count': 'views'
            },
            'ru': {
                'total_ads': 'Всего объявлений',
                'active_ads': 'Активных объявлений',
                'users': 'Пользователи',
                'views': 'Просмотры',
                'top_brands': 'ТОП марки автомобилей',
                'price_distribution': 'Распределение цен',
                'regional_stats': 'Статистика по регионам',
                'daily_activity': 'Ежедневная активность',
                'seller_types': 'Типы продавцов',
                'currency': 'грн',
                'ads': 'объявлений',
                'views_count': 'просмотров'
            }
        }
    
    def t(self, key: str) -> str:
        """Получить перевод для ключа"""
        return self.translations.get(self.locale, {}).get(key, key)
    
    def get_platform_dataframes(self) -> Dict[str, pd.DataFrame]:
        """Создаем pandas DataFrames для анализа"""
        
        # DataFrame объявлений
        ads_data = []
        for ad in CarAd.objects.select_related('mark').all():
            ads_data.append({
                'id': ad.id,
                'title': ad.title,
                'price': float(ad.price) if ad.price else 0,
                'currency': ad.currency,
                'status': ad.status,
                'mark': ad.mark.name if ad.mark else 'Unknown',
                'region': ad.region or 'Unknown',
                'seller_type': ad.seller_type,
                'created_at': ad.created_at,
                'year': ad.year,
                'mileage': ad.mileage
            })
        
        ads_df = pd.DataFrame(ads_data)
        
        # DataFrame пользователей
        users_data = []
        for user in User.objects.all():
            users_data.append({
                'id': user.id,
                'email': user.email,
                'is_active': user.is_active,
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser,
                'date_joined': user.date_joined
            })
        
        users_df = pd.DataFrame(users_data)
        
        # DataFrame просмотров
        views_data = []
        for view in AdView.objects.select_related('ad').all():
            views_data.append({
                'id': view.id,
                'ad_id': view.ad.id,
                'ip_address': view.ip_address,
                'created_at': view.created_at,
                'ad_price': float(view.ad.price) if view.ad.price else 0,
                'ad_mark': view.ad.mark.name if view.ad.mark else 'Unknown',
                'ad_region': view.ad.region or 'Unknown'
            })
        
        views_df = pd.DataFrame(views_data)
        
        # DataFrame аккаунтов
        accounts_data = []
        for account in AddsAccount.objects.select_related('user').all():
            accounts_data.append({
                'id': account.id,
                'user_id': account.user.id,
                'account_type': account.account_type,
                'created_at': account.created_at
            })
        
        accounts_df = pd.DataFrame(accounts_data)
        
        return {
            'ads': ads_df,
            'users': users_df,
            'views': views_df,
            'accounts': accounts_df
        }
    
    def create_price_distribution_chart(self, ads_df: pd.DataFrame) -> str:
        """Создаем график распределения цен"""
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
        
        # Конвертируем цены в UAH
        usd_rate = 41.0  # Можно получить из ExchangeRate
        ads_df['price_uah'] = ads_df.apply(
            lambda row: row['price'] * usd_rate if row['currency'] == 'USD' else row['price'],
            axis=1
        )
        
        # Фильтруем разумные цены (от 1000 до 2000000 UAH)
        price_data = ads_df[(ads_df['price_uah'] > 1000) & (ads_df['price_uah'] < 2000000)]['price_uah']
        
        # Гистограмма
        ax1.hist(price_data, bins=30, alpha=0.7, color='skyblue', edgecolor='black')
        ax1.set_title(f'{self.t("price_distribution")} - Гистограмма')
        ax1.set_xlabel(f'Цена ({self.t("currency")})')
        ax1.set_ylabel('Количество')
        ax1.grid(True, alpha=0.3)
        
        # Box plot
        ax2.boxplot(price_data, vert=True)
        ax2.set_title(f'{self.t("price_distribution")} - Box Plot')
        ax2.set_ylabel(f'Цена ({self.t("currency")})')
        ax2.grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        # Конвертируем в base64
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=300, bbox_inches='tight')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.getvalue()).decode()
        plt.close()
        
        return image_base64
    
    def create_brands_chart(self, ads_df: pd.DataFrame) -> str:
        """Создаем график по маркам"""
        fig, ax = plt.subplots(figsize=(12, 8))
        
        # ТОП-10 марок
        top_brands = ads_df['mark'].value_counts().head(10)
        
        # Горизонтальная столбчатая диаграмма
        bars = ax.barh(range(len(top_brands)), top_brands.values, color=sns.color_palette("viridis", len(top_brands)))
        ax.set_yticks(range(len(top_brands)))
        ax.set_yticklabels(top_brands.index)
        ax.set_xlabel(f'Количество {self.t("ads")}')
        ax.set_title(f'{self.t("top_brands")} (ТОП-10)')
        
        # Добавляем значения на столбцы
        for i, (bar, value) in enumerate(zip(bars, top_brands.values)):
            ax.text(value + max(top_brands.values) * 0.01, i, str(value), 
                   va='center', fontweight='bold')
        
        ax.grid(True, alpha=0.3, axis='x')
        plt.tight_layout()
        
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=300, bbox_inches='tight')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.getvalue()).decode()
        plt.close()
        
        return image_base64
    
    def create_regional_chart(self, ads_df: pd.DataFrame, views_df: pd.DataFrame) -> str:
        """Создаем график по регионам"""
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(14, 10))
        
        # Статистика по регионам
        regional_ads = ads_df['region'].value_counts().head(10)
        
        # График объявлений по регионам
        bars1 = ax1.bar(range(len(regional_ads)), regional_ads.values, 
                       color=sns.color_palette("Set2", len(regional_ads)))
        ax1.set_xticks(range(len(regional_ads)))
        ax1.set_xticklabels(regional_ads.index, rotation=45, ha='right')
        ax1.set_ylabel(f'Количество {self.t("ads")}')
        ax1.set_title(f'{self.t("regional_stats")} - Объявления')
        ax1.grid(True, alpha=0.3, axis='y')
        
        # Добавляем значения на столбцы
        for bar, value in zip(bars1, regional_ads.values):
            ax1.text(bar.get_x() + bar.get_width()/2, bar.get_height() + max(regional_ads.values) * 0.01,
                    str(value), ha='center', va='bottom', fontweight='bold')
        
        # Просмотры по регионам (если есть данные)
        if not views_df.empty:
            regional_views = views_df['ad_region'].value_counts().head(10)
            bars2 = ax2.bar(range(len(regional_views)), regional_views.values,
                           color=sns.color_palette("Set3", len(regional_views)))
            ax2.set_xticks(range(len(regional_views)))
            ax2.set_xticklabels(regional_views.index, rotation=45, ha='right')
            ax2.set_ylabel(f'Количество {self.t("views_count")}')
            ax2.set_title(f'{self.t("regional_stats")} - Просмотры')
            ax2.grid(True, alpha=0.3, axis='y')
            
            for bar, value in zip(bars2, regional_views.values):
                ax2.text(bar.get_x() + bar.get_width()/2, bar.get_height() + max(regional_views.values) * 0.01,
                        str(value), ha='center', va='bottom', fontweight='bold')
        
        plt.tight_layout()
        
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=300, bbox_inches='tight')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.getvalue()).decode()
        plt.close()
        
        return image_base64
    
    def create_daily_activity_chart(self, ads_df: pd.DataFrame, views_df: pd.DataFrame) -> str:
        """Создаем график ежедневной активности"""
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(14, 10))
        
        # Активность объявлений за последние 30 дней
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=30)
        
        if not ads_df.empty:
            ads_df['date'] = pd.to_datetime(ads_df['created_at']).dt.date
            daily_ads = ads_df[
                (ads_df['date'] >= start_date) & (ads_df['date'] <= end_date)
            ].groupby('date').size()
            
            # Заполняем пропущенные дни нулями
            date_range = pd.date_range(start=start_date, end=end_date, freq='D')
            daily_ads = daily_ads.reindex(date_range.date, fill_value=0)
            
            ax1.plot(daily_ads.index, daily_ads.values, marker='o', linewidth=2, markersize=4)
            ax1.set_title(f'{self.t("daily_activity")} - Новые объявления (30 дней)')
            ax1.set_ylabel(f'Количество {self.t("ads")}')
            ax1.grid(True, alpha=0.3)
            ax1.tick_params(axis='x', rotation=45)
        
        # Активность просмотров
        if not views_df.empty:
            views_df['date'] = pd.to_datetime(views_df['created_at']).dt.date
            daily_views = views_df[
                (views_df['date'] >= start_date) & (views_df['date'] <= end_date)
            ].groupby('date').size()
            
            daily_views = daily_views.reindex(date_range.date, fill_value=0)
            
            ax2.plot(daily_views.index, daily_views.values, marker='s', linewidth=2, 
                    markersize=4, color='orange')
            ax2.set_title(f'{self.t("daily_activity")} - Просмотры (30 дней)')
            ax2.set_ylabel(f'Количество {self.t("views_count")}')
            ax2.grid(True, alpha=0.3)
            ax2.tick_params(axis='x', rotation=45)
        
        plt.tight_layout()
        
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=300, bbox_inches='tight')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.getvalue()).decode()
        plt.close()
        
        return image_base64
