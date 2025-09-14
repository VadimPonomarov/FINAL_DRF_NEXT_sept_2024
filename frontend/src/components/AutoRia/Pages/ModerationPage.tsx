"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Search, 
  Filter,
  Eye,
  Check,
  X,
  AlertTriangle,
  Calendar,
  MapPin,
  Car,
  User,
  Clock,
  BarChart3
} from 'lucide-react';
import { CarAd } from '@/types/autoria';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthProviderContext';
import { useUserProfileData } from '@/hooks/useUserProfileData';

interface ModerationStats {
  total_ads: number;
  pending_moderation: number;
  needs_review: number;
  rejected: number;
  blocked: number;
  active: number;
  today_moderated: number;
}

const ModerationPage = () => {
  const { t, formatDate } = useI18n();
  const { user } = useAuth();
  const { data: userProfileData } = useUserProfileData();

  // Проверяем статус суперюзера из разных источников
  const isSuperUser = React.useMemo(() => {
    const isSuper = user?.is_superuser || userProfileData?.user?.is_superuser || false;

    console.log('[ModerationPage] Superuser check:', {
      userFromAuth: user,
      user_is_superuser: user?.is_superuser,
      userProfileData_user: userProfileData?.user,
      userProfileData_user_is_superuser: userProfileData?.user?.is_superuser,
      finalResult: isSuper,
      timestamp: new Date().toISOString()
    });

    return isSuper;
  }, [user, userProfileData]);
  const [ads, setAds] = useState<CarAd[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAd, setSelectedAd] = useState<CarAd | null>(null);

  // Проверка прав доступа - временно отключена
  // useEffect(() => {
  //   if (!user || !user.is_superuser) {
  //     // Redirect to home if not authorized - только суперюзеры могут модерировать
  //     window.location.href = '/';
  //     return;
  //   }
  // }, [user]);

  // Загрузка данных
  useEffect(() => {
    loadModerationQueue();
    loadModerationStats();
  }, [statusFilter, searchQuery]);

  const loadModerationQueue = async () => {
    setLoading(true);
    try {
      console.log('[Moderation] 📤 Loading moderation queue...');

      const params = new URLSearchParams({
        status: statusFilter,
        search: searchQuery,
        page: '1',
        page_size: '50'
      });

      const response = await fetch(`/api/ads/moderation/queue?${params}`);
      const result = await response.json();

      if (result.success && result.data) {
        console.log('[Moderation] ✅ Loaded ads:', result.data.length);
        setAds(result.data);
      } else {
        console.log('[Moderation] ⚠️ No ads found');
        setAds([]);
      }
    } catch (error) {
      console.error('[Moderation] ❌ Failed to load queue:', error);
      setAds([]);
    } finally {
      setLoading(false);
    }
  };

  const loadModerationStats = async () => {
    try {
      const response = await fetch('/api/ads/moderation/statistics');
      const result = await response.json();

      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('[Moderation] ❌ Failed to load stats:', error);
    }
  };

  const moderateAd = async (adId: number, action: 'approve' | 'reject' | 'review' | 'block' | 'activate', reason?: string) => {
    try {
      console.log(`[Moderation] 🔧 ${action.toUpperCase()} ad ${adId}...`);

      const endpoint = `/api/ads/moderation/${adId}/${action}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: reason || '',
          moderator_notes: `Модерировано суперюзером: ${user?.email || 'unknown'}`
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log(`[Moderation] ✅ Ad ${adId} ${action}ed successfully`);

        // Show success message
        const actionMessages = {
          approve: 'одобрено',
          reject: 'отклонено',
          review: 'отправлено на повторную проверку',
          block: 'заблокировано',
          activate: 'активировано'
        };

        alert(`Объявление ${actionMessages[action]}!`);

        // Refresh the queue
        loadModerationQueue();
        loadModerationStats();
        setSelectedAd(null);
      } else {
        console.error(`[Moderation] ❌ Failed to ${action} ad:`, result.message);
        alert(`Ошибка: ${result.message}`);
      }
    } catch (error) {
      console.error(`[Moderation] ❌ Failed to ${action} ad:`, error);
      alert(`Ошибка при выполнении действия "${action}"`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">⏳ На модерации</Badge>;
      case 'needs_review':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-300">🔍 Требует проверки</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-300">❌ Отклонено</Badge>;
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-300">✅ Активно</Badge>;
      case 'blocked':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300">🚫 Заблокировано</Badge>;
      case 'draft':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">📝 Черновик</Badge>;
      case 'expired':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300">⏰ Истекло</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300">{status}</Badge>;
    }
  };

  const formatPrice = (price: number, currency: string) => {
    const symbols = { USD: '$', EUR: '€', UAH: '₴' };
    return `${symbols[currency as keyof typeof symbols] || '$'}${price.toLocaleString()}`;
  };

  // Проверяем права доступа - только суперюзеры (используем уже объявленную переменную isSuperUser)

  if (!isSuperUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('accessDenied.superuserRequired')}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="h-8 w-8 text-orange-600" />
              {t('accessDenied.moderationTitle')}
            </h1>
            <p className="text-gray-600 mt-1">
              {t('accessDenied.moderationDescription')}
            </p>
            {/* Отладочная информация о пользователе */}
            <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
              <strong>Статус пользователя:</strong> {user?.email || 'Не авторизован'} |
              <strong> Суперюзер:</strong> {isSuperUser ? '✅ Да' : '❌ Нет'} |
              <strong> useAuth:</strong> {user?.is_superuser ? '✅' : '❌'} |
              <strong> userProfileData:</strong> {userProfileData?.user?.is_superuser ? '✅' : '❌'}
            </div>
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.total_ads}</div>
                <p className="text-xs text-gray-600">Всего объявлений</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending_moderation}</div>
                <p className="text-xs text-gray-600">На модерации</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-orange-600">{stats.needs_review}</div>
                <p className="text-xs text-gray-600">Требует проверки</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                <p className="text-xs text-gray-600">Отклонено</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-gray-600">{stats.blocked}</div>
                <p className="text-xs text-gray-600">Заблокировано</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                <p className="text-xs text-gray-600">Активных</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">{stats.today_moderated}</div>
                <p className="text-xs text-gray-600">Сегодня проверено</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Фильтры
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Поиск по заголовку, описанию, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">⏳ На модерации</SelectItem>
                  <SelectItem value="needs_review">🔍 Требует проверки</SelectItem>
                  <SelectItem value="rejected">❌ Отклонено</SelectItem>
                  <SelectItem value="blocked">🚫 Заблокировано</SelectItem>
                  <SelectItem value="active">✅ Активные</SelectItem>
                  <SelectItem value="all">📋 Все статусы</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => {
                  loadModerationQueue();
                  loadModerationStats();
                }}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                Обновить
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Ads List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            <span className="ml-4">Загрузка...</span>
          </div>
        ) : ads.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Объявлений не найдено
                </h3>
                <p className="text-gray-600">
                  Нет объявлений для модерации с выбранными фильтрами
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {ads.map(ad => (
              <Card key={ad.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2 mb-2">
                        {ad.title}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Car className="h-4 w-4" />
                          {ad.brand} {ad.model}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {ad.year}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {ad.city}
                        </span>
                      </div>
                    </div>
                    {getStatusBadge(ad.status)}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {ad.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-bold text-green-600">
                        {formatPrice(ad.price, ad.currency)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <User className="h-4 w-4" />
                        {ad.user?.email}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="h-4 w-4" />
                      Создано: {formatDate(new Date(ad.created_at))}
                    </div>

                    {/* Moderation Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-4 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedAd(ad)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Просмотр
                      </Button>

                      {ad.status === 'pending' || ad.status === 'needs_review' ? (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => moderateAd(ad.id, 'approve')}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Одобрить
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              const reason = prompt('Причина отклонения:');
                              if (reason) {
                                moderateAd(ad.id, 'reject', reason);
                              }
                            }}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Отклонить
                          </Button>
                        </>
                      ) : null}

                      {ad.status === 'rejected' ? (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => moderateAd(ad.id, 'review')}
                        >
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          На проверку
                        </Button>
                      ) : null}

                      {ad.status === 'active' ? (
                        <Button
                          size="sm"
                          className="bg-gray-600 hover:bg-gray-700 text-white"
                          onClick={() => {
                            const reason = prompt('Причина блокировки:');
                            if (reason) {
                              moderateAd(ad.id, 'block', reason);
                            }
                          }}
                        >
                          🚫 Заблокировать
                        </Button>
                      ) : null}

                      {ad.status === 'blocked' ? (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => moderateAd(ad.id, 'activate')}
                        >
                          ✅ Активировать
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModerationPage;
