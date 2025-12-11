"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Bell,
  BellOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Ban,
  Eye,
  Settings,
  RefreshCw,
  X
} from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthProviderContext';

interface ModerationNotification {
  id: number;
  type: 'ad_needs_review' | 'ad_max_attempts' | 'ad_flagged' | 'user_banned' | 'content_violation';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  read: boolean;
  ad_id?: number;
  user_id?: number;
  data?: any;
}

const ModerationNotifications: React.FC = () => {
  const { t, formatDate } = useI18n();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<ModerationNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Проверка прав доступа - только менеджеры и админы
  const canModerate = React.useMemo(() => {
    return user?.is_staff || user?.is_superuser || false;
  }, [user]);

  useEffect(() => {
    if (canModerate) {
      loadNotifications();

      // Периодическая проверка новых уведомлений
      const interval = setInterval(loadNotifications, 30000); // каждые 30 секунд

      return () => clearInterval(interval);
    }
  }, [canModerate]);

  const loadNotifications = async () => {
    if (!canModerate) return;

    setLoading(true);
    try {
      // TODO: Заменить на реальный API endpoint для уведомлений модерации
      // const response = await fetch('/api/moderation/notifications');
      // const result = await response.json();

      // Временные мок данные для демонстрации
      const mockNotifications: ModerationNotification[] = [
        {
          id: 1,
          type: 'ad_needs_review',
          title: 'Новое объявление требует проверки',
          message: 'Объявление #12345 прошло автоматическую модерацию и требует ручного рассмотрения',
          priority: 'high',
          created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 минут назад
          read: false,
          ad_id: 12345
        },
        {
          id: 2,
          type: 'ad_max_attempts',
          title: 'Превышено максимальное количество попыток редактирования',
          message: 'Объявление #12346 достигло максимума попыток редактирования после модерации',
          priority: 'medium',
          created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 минут назад
          read: false,
          ad_id: 12346
        },
        {
          id: 3,
          type: 'content_violation',
          title: 'Обнаружено нарушение контента',
          message: 'В объявлении #12347 обнаружены признаки нарушения правил платформы',
          priority: 'urgent',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 часа назад
          read: true,
          ad_id: 12347
        }
      ];

      setNotifications(mockNotifications);

      // Подсчет непрочитанных уведомлений
      const unread = mockNotifications.filter(n => !n.read).length;
      setUnreadCount(unread);

    } catch (error) {
      console.error('[ModerationNotifications] Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      // TODO: Заменить на реальный API вызов
      console.log(`[ModerationNotifications] Marking notification ${notificationId} as read`);

      // Обновить локальное состояние
      setNotifications(prev => prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      ));

      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('[ModerationNotifications] Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      // TODO: Заменить на реальный API вызов
      console.log('[ModerationNotifications] Marking all notifications as read');

      // Обновить локальное состояние
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('[ModerationNotifications] Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ad_needs_review':
        return <Eye className="h-4 w-4 text-blue-600" />;
      case 'ad_max_attempts':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'ad_flagged':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'user_banned':
        return <Ban className="h-4 w-4 text-red-600" />;
      case 'content_violation':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const configs = {
      low: { label: 'Низкий', className: 'bg-gray-100 text-gray-800 border-gray-300' },
      medium: { label: 'Средний', className: 'bg-blue-100 text-blue-800 border-blue-300' },
      high: { label: 'Высокий', className: 'bg-orange-100 text-orange-800 border-orange-300' },
      urgent: { label: 'Срочно', className: 'bg-red-100 text-red-800 border-red-300' }
    };

    const config = configs[priority as keyof typeof configs] || configs.medium;

    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  if (!canModerate) {
    return null; // Не показывать для обычных пользователей
  }

  return (
    <div className="relative">
      {/* Кнопка уведомлений */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-2 -right-2 bg-red-600 text-white text-xs h-5 w-5 p-0 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Панель уведомлений */}
      {showNotifications && (
        <Card className="absolute right-0 top-12 w-96 max-h-96 overflow-hidden shadow-lg border z-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                <CardTitle className="text-lg">Уведомления модерации</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    Прочитать все
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotifications(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardDescription>
              Уведомления о событиях модерации
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-0">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm">Загрузка...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8">
                <BellOff className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-600">Нет уведомлений</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      notification.read
                        ? 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                    }`}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className={`text-sm font-medium truncate ${
                            notification.read ? 'text-gray-700' : 'text-gray-900'
                          }`}>
                            {notification.title}
                          </h4>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {getPriorityBadge(notification.priority)}
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            )}
                          </div>
                        </div>

                        <p className={`text-sm mb-2 ${
                          notification.read ? 'text-gray-600' : 'text-gray-700'
                        }`}>
                          {notification.message}
                        </p>

                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{formatDate(notification.created_at)}</span>
                          {notification.ad_id && (
                            <span>Объявление #{notification.ad_id}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Кнопка обновления */}
            <div className="mt-4 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={loadNotifications}
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                    Загрузка...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Обновить уведомления
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ModerationNotifications;