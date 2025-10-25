"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  BarChart3,
  Grid,
  List
} from 'lucide-react';
import { CarAd } from '@/types/autoria';
import { useI18n } from '@/contexts/I18nContext';
import { useRedisAuth } from '@/contexts/RedisAuthContext';
import { useToast } from '@/hooks/use-toast';
import { fetchWithAuth } from '@/utils/fetchWithAuth';
import ModerationAdCard from './ModerationAdCard';

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
  console.log('🎯 [ModerationPage] Component mounted/rendered!');
  
  const { t, formatDate } = useI18n();
  const { redisAuth, isLoading: authLoading } = useRedisAuth();
  const { toast } = useToast();

  // Проверяем права доступа из Redis (модераторы + суперюзеры)
  const isSuperUser = React.useMemo(() => {
    const isSuper = redisAuth?.user?.is_superuser || false;
    console.log('[ModerationPage] 🔍 Superuser check from Redis:', {
      is_superuser: isSuper,
      timestamp: new Date().toISOString()
    });
    return isSuper;
  }, [redisAuth, authLoading]);

  const isModerator = React.useMemo(() => {
    const isMod = redisAuth?.user?.is_staff || false;
    console.log('[ModerationPage] 🔍 Moderator check from Redis:', {
      is_staff: isMod,
      timestamp: new Date().toISOString()
    });
    return isMod;
  }, [redisAuth, authLoading]);

  // Доступ: модераторы (is_staff) + суперюзеры (is_superuser)
  const hasAccess = React.useMemo(() => {
    return isSuperUser || isModerator;
  }, [isSuperUser, isModerator]);
  
  const isAuthenticated = !!redisAuth?.user;
  
  console.log('[ModerationPage] 📊 Current state:', {
    authLoading,
    isAuthenticated,
    isSuperUser,
    isModerator,
    hasAccess,
    userEmail: redisAuth?.user?.email
  });
  const [ads, setAds] = useState<CarAd[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAd, setSelectedAd] = useState<CarAd | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Проверка прав доступа - модераторы (is_staff) + суперюзеры (is_superuser)
  useEffect(() => {
    console.log('[ModerationPage] 🔐 Access check useEffect:', { 
      authLoading, 
      isSuperUser, 
      isModerator,
      hasAccess 
    });
    
    // Ждем загрузки данных пользователя
    if (authLoading) {
      console.log('[ModerationPage] ⏳ Still loading auth data...');
      return;
    }

    // Если пользователь не модератор и не суперюзер - редирект на главную
    if (!hasAccess) {
      console.error('[ModerationPage] ❌ Access denied - user is not moderator/superuser');
      toast({
        title: "❌ Доступ заборонено",
        description: "Тільки модератори та суперюзери можуть переглядати модерацію",
        variant: "destructive",
      });
      
      // Редирект на главную через 1 секунду
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } else {
      const role = isSuperUser ? 'superuser' : 'moderator';
      console.log(`[ModerationPage] ✅ Access granted - user is ${role}`);
      toast({
        title: `✅ Доступ дозволено`,
        description: isSuperUser 
          ? "Ви можете переглядати та змінювати статус оголошень"
          : "Ви можете переглядати оголошення (тільки читання)",
        duration: 3000,
      });
    }
  }, [hasAccess, isSuperUser, isModerator, authLoading, toast]);

  // Загрузка данных
  useEffect(() => {
    console.log('[ModerationPage] 📥 Data loading useEffect:', { 
      hasAccess,
      isSuperUser, 
      isModerator,
      authLoading,
      statusFilter, 
      searchQuery 
    });
    
    // Загружаем данные только если пользователь имеет доступ и загрузка завершена
    if (hasAccess && !authLoading) {
      console.log('[ModerationPage] 🚀 Starting data load...');
      loadModerationQueue();
      loadModerationStats();
    } else {
      console.log('[ModerationPage] ⏸️ Data load skipped:', { hasAccess, authLoading });
    }
  }, [statusFilter, searchQuery, sortBy, sortOrder, hasAccess, authLoading]);

  const loadModerationQueue = async () => {
    setLoading(true);
    try {
      console.log('[Moderation] 📤 Loading moderation queue...');

      // Используем правильные статусы для backend API
      const statusMapping: { [key: string]: string } = {
        'all': '',
        'pending': 'pending',
        'needs_review': 'needs_review',
        'rejected': 'rejected',
        'blocked': 'blocked',
        'active': 'active'
      };

      const backendStatus = statusMapping[statusFilter] || '';

      const params = new URLSearchParams({
        search: searchQuery,
        page: '1',
        page_size: '50',
        ordering: sortOrder === 'desc' ? `-${sortBy}` : sortBy
      });

      // Добавляем статус только если он не 'all'
      if (backendStatus) {
        params.append('status', backendStatus);
      }

      const response = await fetchWithAuth(`/api/ads/moderation/queue?${params}`);
      
      // Handle 401 authentication error (only if fetchWithAuth didn't handle it)
      if (response.status === 401) {
        const error = await response.json();
        toast({
          title: "❌ Требуется аутентификация",
          description: error.message || "Пожалуйста, войдите в систему",
          variant: "destructive",
        });

        // Redirect to login with callback URL
        const currentPath = window.location.pathname;
        setTimeout(() => {
          window.location.href = `/login?callbackUrl=${encodeURIComponent(currentPath)}`;
        }, 1000);
        return;
      }
      
      const result = await response.json();
      console.log('[Moderation] 📦 Backend response:', result);

      // Backend возвращает DRF paginated response: {count, next, previous, results}
      if (result.results && Array.isArray(result.results)) {
        console.log('[Moderation] ✅ Loaded ads:', result.results.length, 'из', result.count);
        console.log('[Moderation] 📋 First ad:', result.results[0]);
        console.log('[Moderation] 📋 All ads IDs:', result.results.map((ad: any) => ad.id));
        setAds(result.results);
        
        // Показываем toast с информацией
        toast({
          title: `✅ Загружено ${result.results.length} объявлений из ${result.count}`,
          description: `IDs: ${result.results.map((ad: any) => ad.id).join(', ')}`,
          duration: 5000,
        });
      } else if (result.success && result.data) {
        // Альтернативный формат для обратной совместимости
        console.log('[Moderation] ✅ Loaded ads (legacy format):', result.data.length);
        setAds(result.data);
      } else {
        console.log('[Moderation] ⚠️ No ads found, result:', result);
        setAds([]);
        
        toast({
          title: "⚠️ Объявления не найдены",
          description: `Response: ${JSON.stringify(result).substring(0, 100)}`,
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('[Moderation] ❌ Failed to load queue:', error);
      setAds([]);
    } finally {
      setLoading(false);
    }
  };

  // Мемоизируем функции для предотвращения перерисовок
  const handleModerateAd = React.useCallback(async (
    adId: number, 
    action: 'approve' | 'reject' | 'review' | 'block' | 'activate', 
    reason?: string
  ) => {
    await moderateAd(adId, action, reason);
  }, []);

  const handleSelectAd = React.useCallback((ad: CarAd) => {
    setSelectedAd(ad);
  }, []);

  const loadModerationStats = async () => {
    try {
      const response = await fetchWithAuth('/api/ads/moderation/statistics');
      
      // Handle 401 authentication error (only if fetchWithAuth didn't handle it)
      if (response.status === 401) {
        const error = await response.json();
        toast({
          title: "❌ Требуется аутентификация",
          description: error.message || "Пожалуйста, войдите в систему",
          variant: "destructive",
        });

        // Redirect to login with callback URL
        const currentPath = window.location.pathname;
        setTimeout(() => {
          window.location.href = `/login?callbackUrl=${encodeURIComponent(currentPath)}`;
        }, 1000);
        return;
      }
      
      const result = await response.json();
      console.log('[Moderation] 📊 Stats response:', result);

      // Backend возвращает stats напрямую (без обертки)
      if (result.total_ads !== undefined) {
        setStats(result);
      } else if (result.success && result.data) {
        // Альтернативный формат для обратной совместимости
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
          moderator_notes: `Модерировано суперюзером: ${redisAuth?.user?.email || 'unknown'}`
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

        toast({
          title: `✅ Объявление ${actionMessages[action]}`,
          description: `ID: ${adId}`,
          duration: 3000,
        });

        // Оптимизация: обновляем только конкретное объявление, а не весь список
        if (result.ad) {
          // Backend возвращает обновленное объявление в result.ad
          setAds(prevAds => 
            prevAds.map(ad => ad.id === adId ? { ...ad, ...result.ad } : ad)
          );
          console.log(`[Moderation] 🔄 Updated ad ${adId} locally (no full reload)`);
        } else {
          // Fallback: если backend не вернул объявление, перезагружаем список
          console.log(`[Moderation] ⚠️ No ad in response, reloading full list`);
          loadModerationQueue();
        }

        // Обновляем только статистику (легкий запрос)
        loadModerationStats();
        setSelectedAd(null);
      } else {
        console.error(`[Moderation] ❌ Failed to ${action} ad:`, result.message);
        
        toast({
          title: `❌ Ошибка при ${action}`,
          description: result.message || 'Неизвестная ошибка',
          variant: 'destructive',
          duration: 5000,
        });
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
              <strong>{t('autoria.moderation.userStatus')}</strong> {redisAuth?.user?.email || t('autoria.moderation.noAdsFound')} |
              <strong> {t('autoria.moderation.superuser')}</strong> {isSuperUser ? '✅ Да' : '❌ Нет'} |
              <strong> Redis Auth:</strong> {isAuthenticated ? '✅' : '❌'} |
              <strong> {t('autoria.moderation.authLoading')}</strong> {authLoading ? '⏳' : '✅'} |
              <strong> Superuser from Redis:</strong> {redisAuth?.user?.is_superuser ? '✅' : '❌'}
            </div>
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.total_ads}</div>
                <p className="text-xs text-gray-600">{t('autoria.moderation.totalAds')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending_moderation}</div>
                <p className="text-xs text-gray-600">{t('autoria.moderation.pendingModeration')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-orange-600">{stats.needs_review}</div>
                <p className="text-xs text-gray-600">{t('autoria.moderation.needsReview')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                <p className="text-xs text-gray-600">{t('autoria.moderation.rejected')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-gray-600">{stats.blocked}</div>
                <p className="text-xs text-gray-600">{t('autoria.moderation.block')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                <p className="text-xs text-gray-600">{t('autoria.moderation.active')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">{stats.today_moderated}</div>
                <p className="text-xs text-gray-600">{t('autoria.moderation.todayModerated')}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {t('autoria.moderation.filters')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder={t('autoria.moderation.searchPlaceholder')}
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
                  <SelectItem value="all">📋 {t('autoria.moderation.allStatuses')}</SelectItem>
                  <SelectItem value="pending">⏳ {t('autoria.moderation.pendingModeration')}</SelectItem>
                  <SelectItem value="needs_review">🔍 {t('autoria.moderation.needsReview')}</SelectItem>
                  <SelectItem value="rejected">❌ {t('autoria.moderation.rejected')}</SelectItem>
                  <SelectItem value="blocked">🚫 {t('autoria.moderation.block')}</SelectItem>
                  <SelectItem value="active">✅ {t('autoria.moderation.active')}</SelectItem>
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
                {t('autoria.moderation.refresh')}
              </Button>
              
              {/* Sorting */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 hidden sm:inline">{t('autoria.moderation.sortBy')}:</span>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">{t('autoria.moderation.createdAt')}</SelectItem>
                    <SelectItem value="title">{t('title')}</SelectItem>
                    <SelectItem value="price">{t('autoria.moderation.price')}</SelectItem>
                    <SelectItem value="status">{t('autoria.moderation.status')}</SelectItem>
                    <SelectItem value="brand">{t('autoria.moderation.brand')}</SelectItem>
                    <SelectItem value="year">{t('autoria.moderation.year')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="flex items-center gap-1"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Button>
              </div>
              
              {/* View mode toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 hidden sm:inline">{t('autoria.moderation.view')}:</span>
                <div className="flex border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ads List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            <span className="ml-4">{t('autoria.moderation.loadingModeration')}</span>
          </div>
        ) : ads.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('autoria.moderation.noAdsFound')}
                </h3>
                <p className="text-gray-600">
                  {t('autoria.moderation.noAdsDescription')}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {ads.map(ad => (
              <ModerationAdCard
                key={ad.id}
                ad={ad}
                onModerate={handleModerateAd}
                onSelectAd={handleSelectAd}
              />
            ))}
          </div>
        ) : (
          /* Table View */
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">ID</TableHead>
                    <TableHead className="min-w-[200px]">{t('title')}</TableHead>
                    <TableHead className="w-32">{t('autoria.moderation.brand')}/{t('autoria.moderation.model')}</TableHead>
                    <TableHead className="w-24">{t('autoria.moderation.year')}</TableHead>
                    <TableHead className="w-24">{t('autoria.moderation.price')}</TableHead>
                    <TableHead className="w-32">{t('autoria.moderation.status')}</TableHead>
                    <TableHead className="w-40">{t('autoria.moderation.user')}</TableHead>
                    <TableHead className="w-32">{t('autoria.moderation.created')}</TableHead>
                    <TableHead className="w-48">{t('autoria.moderation.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ads.map(ad => (
                    <TableRow key={ad.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm">{ad.id}</TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <div className="font-medium line-clamp-2 mb-1">{ad.title}</div>
                          <div className="text-xs text-gray-500 line-clamp-2">{ad.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{ad.brand}</div>
                          <div className="text-gray-500">{ad.model}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{ad.year}</TableCell>
                      <TableCell className="text-sm font-medium text-green-600">
                        {formatPrice(ad.price, ad.currency)}
                      </TableCell>
                      <TableCell>{getStatusBadge(ad.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{ad.user?.email}</div>
                          <div className="text-gray-500">{ad.city}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(new Date(ad.created_at))}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 items-center justify-start">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedAd(ad)}
                            className="h-8 w-32 text-xs font-medium flex items-center justify-center hover:bg-gray-100 hover:text-gray-900"
                          >
                            <Eye className="h-3 w-3 mr-1" />{t('autoria.moderation.viewDetails')}
                          </Button>

                          {ad.status === 'pending' || ad.status === 'needs_review' ? (
                            <>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-800 text-white hover:text-white h-8 w-32 text-xs font-medium flex items-center justify-center"
                                onClick={() => moderateAd(ad.id, 'approve')}
                              >
                                <Check className="h-3 w-3 mr-1" />{t('autoria.moderation.approve')}
                              </Button>

                              <Button
                                size="sm"
                                className="bg-red-600 hover:bg-red-800 text-white hover:text-white h-8 w-32 text-xs font-medium flex items-center justify-center"
                                onClick={() => {
                                  const reason = prompt(t('autoria.moderation.rejectionReasonPrompt'));
                                  if (reason) {
                                    moderateAd(ad.id, 'reject', reason);
                                  }
                                }}
                              >
                                <X className="h-3 w-3 mr-1" />{t('autoria.moderation.reject')}
                              </Button>
                            </>
                          ) : null}

                          {ad.status === 'rejected' ? (
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-800 text-white hover:text-white h-8 w-32 text-xs font-medium flex items-center justify-center"
                              onClick={() => moderateAd(ad.id, 'review')}
                              style={{ color: 'white' }}
                            >
                              ⚠️{t('autoria.moderation.review')}
                            </Button>
                          ) : null}

                          {ad.status === 'active' ? (
                            <Button
                              size="sm"
                              className="bg-gray-600 hover:bg-gray-800 text-white hover:text-white h-8 w-32 text-xs font-medium flex items-center justify-center"
                              onClick={() => {
                                const reason = prompt(t('autoria.moderation.blockReason'));
                                if (reason) {
                                  moderateAd(ad.id, 'block', reason);
                                }
                              }}
                            >
                              🚫 {t('autoria.moderation.block')}
                            </Button>
                          ) : null}

                          {ad.status === 'blocked' ? (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-800 text-white hover:text-white h-8 w-32 text-xs font-medium flex items-center justify-center"
                              onClick={() => moderateAd(ad.id, 'activate')}
                            >
                              ✅ {t('autoria.moderation.activate')}
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ModerationPage;