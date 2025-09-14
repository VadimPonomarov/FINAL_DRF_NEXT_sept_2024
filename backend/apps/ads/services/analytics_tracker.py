"""
Сервис для трекинга аналитики посещений и взаимодействий
"""
from django.utils import timezone
from django.db import transaction
from datetime import timedelta
import uuid
import json
import logging

# Простая функция для парсинга User-Agent без внешних зависимостей
def simple_user_agent_parse(user_agent_string):
    """Простой парсер User-Agent"""
    class SimpleUserAgent:
        def __init__(self, ua_string):
            self.ua_string = ua_string.lower()

        @property
        def is_mobile(self):
            return any(mobile in self.ua_string for mobile in ['mobile', 'android', 'iphone'])

        @property
        def is_tablet(self):
            return any(tablet in self.ua_string for tablet in ['tablet', 'ipad'])

        @property
        def browser(self):
            class Browser:
                def __init__(self, ua_string):
                    if 'chrome' in ua_string:
                        self.family = 'Chrome'
                        self.version_string = 'Unknown'
                    elif 'firefox' in ua_string:
                        self.family = 'Firefox'
                        self.version_string = 'Unknown'
                    elif 'safari' in ua_string:
                        self.family = 'Safari'
                        self.version_string = 'Unknown'
                    else:
                        self.family = 'Unknown'
                        self.version_string = 'Unknown'
            return Browser(ua_string)

        @property
        def os(self):
            class OS:
                def __init__(self, ua_string):
                    if 'windows' in ua_string:
                        self.family = 'Windows'
                        self.version_string = 'Unknown'
                    elif 'mac' in ua_string:
                        self.family = 'macOS'
                        self.version_string = 'Unknown'
                    elif 'linux' in ua_string:
                        self.family = 'Linux'
                        self.version_string = 'Unknown'
                    elif 'android' in ua_string:
                        self.family = 'Android'
                        self.version_string = 'Unknown'
                    elif 'ios' in ua_string:
                        self.family = 'iOS'
                        self.version_string = 'Unknown'
                    else:
                        self.family = 'Unknown'
                        self.version_string = 'Unknown'
            return OS(ua_string)

    return SimpleUserAgent(user_agent_string or '')

from ..models.analytics_models import (
    VisitorSession, PageView, AdInteraction, AdViewDetail, 
    SearchQuery, UserBehaviorSummary
)
from ..models import CarAd

logger = logging.getLogger(__name__)


class AnalyticsTracker:
    """Основной класс для трекинга аналитики"""
    
    def __init__(self, request=None):
        self.request = request
        self.session_id = None
        self.visitor_session = None
        
        if request:
            self._initialize_session()
    
    def _initialize_session(self):
        """Инициализация или получение сессии посетителя"""
        try:
            # Получаем session_id из cookies или создаем новый
            self.session_id = self.request.session.get('analytics_session_id')
            
            if not self.session_id:
                self.session_id = str(uuid.uuid4())
                self.request.session['analytics_session_id'] = self.session_id
            
            # Получаем или создаем сессию посетителя
            self.visitor_session, created = VisitorSession.objects.get_or_create(
                session_id=self.session_id,
                defaults=self._get_session_defaults()
            )
            
            if not created:
                # Обновляем время последней активности
                self.visitor_session.last_activity = timezone.now()
                self.visitor_session.save(update_fields=['last_activity'])
                
        except Exception as e:
            logger.error(f"Error initializing analytics session: {e}")
    
    def _get_session_defaults(self):
        """Получение данных по умолчанию для новой сессии"""
        user_agent = simple_user_agent_parse(self.request.META.get('HTTP_USER_AGENT', ''))
        
        return {
            'user': self.request.user if self.request.user.is_authenticated else None,
            'ip_address': self._get_client_ip(),
            'user_agent': self.request.META.get('HTTP_USER_AGENT', ''),
            'referrer': self.request.META.get('HTTP_REFERER', ''),
            'device_type': self._get_device_type(user_agent),
            'browser': f"{user_agent.browser.family} {user_agent.browser.version_string}",
            'os': f"{user_agent.os.family} {user_agent.os.version_string}",
            'utm_source': self.request.GET.get('utm_source', ''),
            'utm_medium': self.request.GET.get('utm_medium', ''),
            'utm_campaign': self.request.GET.get('utm_campaign', ''),
        }
    
    def _get_client_ip(self):
        """Получение IP адреса клиента"""
        x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = self.request.META.get('REMOTE_ADDR')
        return ip
    
    def _get_device_type(self, user_agent):
        """Определение типа устройства"""
        if user_agent.is_mobile:
            return 'mobile'
        elif user_agent.is_tablet:
            return 'tablet'
        else:
            return 'desktop'
    
    def track_page_view(self, url, page_type, page_title='', metadata=None):
        """Трекинг просмотра страницы"""
        try:
            if not self.visitor_session:
                return None
            
            page_view = PageView.objects.create(
                session=self.visitor_session,
                user=self.request.user if self.request.user.is_authenticated else None,
                url=url,
                page_type=page_type,
                page_title=page_title,
                metadata=metadata or {}
            )
            
            # Обновляем счетчик страниц в сессии
            self.visitor_session.pages_viewed += 1
            self.visitor_session.save(update_fields=['pages_viewed'])
            
            logger.info(f"Page view tracked: {url} for session {self.session_id}")
            return page_view
            
        except Exception as e:
            logger.error(f"Error tracking page view: {e}")
            return None
    
    def track_ad_interaction(self, ad_id, interaction_type, source_page='', 
                           position_in_list=None, metadata=None):
        """Трекинг взаимодействия с объявлением"""
        try:
            if not self.visitor_session:
                return None
            
            ad = CarAd.objects.get(id=ad_id)
            
            interaction = AdInteraction.objects.create(
                session=self.visitor_session,
                user=self.request.user if self.request.user.is_authenticated else None,
                ad=ad,
                interaction_type=interaction_type,
                source_page=source_page,
                position_in_list=position_in_list,
                metadata=metadata or {}
            )
            
            # Обновляем счетчики в сессии
            self.visitor_session.interactions_count += 1
            if interaction_type == 'view':
                self.visitor_session.ads_viewed += 1
            self.visitor_session.save(update_fields=['interactions_count', 'ads_viewed'])
            
            logger.info(f"Ad interaction tracked: {interaction_type} on ad {ad_id}")
            return interaction
            
        except CarAd.DoesNotExist:
            logger.error(f"Ad {ad_id} not found for interaction tracking")
            return None
        except Exception as e:
            logger.error(f"Error tracking ad interaction: {e}")
            return None
    
    def track_ad_view_detail(self, interaction_id, view_data):
        """Трекинг детального просмотра объявления"""
        try:
            interaction = AdInteraction.objects.get(
                id=interaction_id, 
                interaction_type='view'
            )
            
            view_detail, created = AdViewDetail.objects.get_or_create(
                interaction=interaction,
                defaults={
                    'view_duration': view_data.get('view_duration'),
                    'photos_viewed': view_data.get('photos_viewed', 0),
                    'photos_viewed_list': view_data.get('photos_viewed_list', []),
                    'scroll_depth': view_data.get('scroll_depth', 0.0),
                    'clicks_on_elements': view_data.get('clicks_on_elements', {}),
                    'came_from': view_data.get('came_from', ''),
                    'is_quality_view': view_data.get('is_quality_view', False),
                    'bounce': view_data.get('bounce', False),
                }
            )
            
            if not created:
                # Обновляем существующую запись
                for field, value in view_data.items():
                    if hasattr(view_detail, field):
                        setattr(view_detail, field, value)
                view_detail.save()
            
            logger.info(f"Ad view detail tracked for interaction {interaction_id}")
            return view_detail
            
        except AdInteraction.DoesNotExist:
            logger.error(f"Interaction {interaction_id} not found for view detail tracking")
            return None
        except Exception as e:
            logger.error(f"Error tracking ad view detail: {e}")
            return None
    
    def track_search_query(self, query_text, filters_applied=None, results_count=0):
        """Трекинг поискового запроса"""
        try:
            if not self.visitor_session:
                return None
            
            search_query = SearchQuery.objects.create(
                session=self.visitor_session,
                user=self.request.user if self.request.user.is_authenticated else None,
                query_text=query_text,
                filters_applied=filters_applied or {},
                results_count=results_count
            )
            
            logger.info(f"Search query tracked: {query_text}")
            return search_query
            
        except Exception as e:
            logger.error(f"Error tracking search query: {e}")
            return None
    
    def update_page_view_metrics(self, page_view_id, time_on_page=None, 
                               scroll_depth=None, clicks_count=None):
        """Обновление метрик просмотра страницы"""
        try:
            page_view = PageView.objects.get(id=page_view_id)
            
            if time_on_page is not None:
                page_view.time_on_page = time_on_page
            if scroll_depth is not None:
                page_view.scroll_depth = scroll_depth
            if clicks_count is not None:
                page_view.clicks_count = clicks_count
            
            page_view.save()
            logger.info(f"Page view metrics updated for {page_view_id}")
            
        except PageView.DoesNotExist:
            logger.error(f"Page view {page_view_id} not found for metrics update")
        except Exception as e:
            logger.error(f"Error updating page view metrics: {e}")
    
    def end_session(self):
        """Завершение сессии"""
        try:
            if self.visitor_session and not self.visitor_session.ended_at:
                self.visitor_session.ended_at = timezone.now()
                self.visitor_session.total_duration = (
                    self.visitor_session.ended_at - self.visitor_session.started_at
                )
                self.visitor_session.save(
                    update_fields=['ended_at', 'total_duration']
                )
                
                logger.info(f"Session {self.session_id} ended")
                
        except Exception as e:
            logger.error(f"Error ending session: {e}")
    
    @staticmethod
    def get_ad_analytics(ad_id, days=30):
        """Получение аналитики по объявлению"""
        try:
            ad = CarAd.objects.get(id=ad_id)
            since_date = timezone.now() - timedelta(days=days)
            
            interactions = AdInteraction.objects.filter(
                ad=ad,
                created_at__gte=since_date
            )
            
            analytics = {
                'total_views': interactions.filter(interaction_type='view').count(),
                'unique_views': interactions.filter(
                    interaction_type='view'
                ).values('session').distinct().count(),
                'phone_reveals': interactions.filter(
                    interaction_type='phone_reveal'
                ).count(),
                'favorites_added': interactions.filter(
                    interaction_type='favorite_add'
                ).count(),
                'shares': interactions.filter(interaction_type='share').count(),
                'conversion_rate': 0.0,
                'avg_view_duration': None,
                'quality_views': 0,
                'bounce_rate': 0.0,
            }
            
            # Вычисляем конверсию (телефон показан / просмотры)
            if analytics['total_views'] > 0:
                analytics['conversion_rate'] = (
                    analytics['phone_reveals'] / analytics['total_views'] * 100
                )
            
            # Детальная аналитика просмотров
            view_details = AdViewDetail.objects.filter(
                interaction__ad=ad,
                interaction__created_at__gte=since_date
            )
            
            if view_details.exists():
                # Средняя длительность просмотра
                durations = [vd.view_duration for vd in view_details if vd.view_duration]
                if durations:
                    avg_seconds = sum(d.total_seconds() for d in durations) / len(durations)
                    analytics['avg_view_duration'] = timedelta(seconds=avg_seconds)
                
                # Качественные просмотры
                analytics['quality_views'] = view_details.filter(
                    is_quality_view=True
                ).count()
                
                # Показатель отказов
                total_views = view_details.count()
                bounces = view_details.filter(bounce=True).count()
                if total_views > 0:
                    analytics['bounce_rate'] = bounces / total_views * 100
            
            return analytics
            
        except CarAd.DoesNotExist:
            logger.error(f"Ad {ad_id} not found for analytics")
            return None
        except Exception as e:
            logger.error(f"Error getting ad analytics: {e}")
            return None
    
    @staticmethod
    def update_user_behavior_summary(user_id):
        """Обновление сводки поведения пользователя"""
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            user = User.objects.get(id=user_id)
            
            # Получаем все сессии пользователя
            sessions = VisitorSession.objects.filter(user=user)
            
            # Получаем все взаимодействия
            interactions = AdInteraction.objects.filter(user=user)
            
            # Вычисляем метрики
            summary_data = {
                'total_sessions': sessions.count(),
                'total_page_views': PageView.objects.filter(user=user).count(),
                'total_ad_views': interactions.filter(interaction_type='view').count(),
                'total_interactions': interactions.count(),
                'phone_reveals_count': interactions.filter(
                    interaction_type='phone_reveal'
                ).count(),
                'favorites_added_count': interactions.filter(
                    interaction_type='favorite_add'
                ).count(),
            }
            
            # Обновляем или создаем сводку
            summary, created = UserBehaviorSummary.objects.update_or_create(
                user=user,
                defaults=summary_data
            )
            
            logger.info(f"User behavior summary updated for user {user_id}")
            return summary
            
        except Exception as e:
            logger.error(f"Error updating user behavior summary: {e}")
            return None
