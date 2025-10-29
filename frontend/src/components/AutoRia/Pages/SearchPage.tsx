"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { alertHelpers } from '@/components/ui/alert-dialog-helper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatCardPrice } from '@/utils/priceFormatter';
import {
  Search, Heart, Eye, MapPin, Calendar, Gauge, Fuel, Settings, Grid, List,
  Star, Car, User, Edit, Trash2, ExternalLink, Zap, Cog, Hash, AlertTriangle, FileText, Phone
} from 'lucide-react';
import CarAdsService from '@/services/autoria/carAds.service';
import { FavoritesService } from '@/services/autoria/favorites.service';
import AdCounters from '@/components/AutoRia/Components/AdCounters';
import { VirtualSelect } from '@/components/ui/virtual-select';
import { useTranslation } from '@/contexts/I18nContext';
import { cachedFetch } from '@/utils/cachedFetch';
import AnalyticsTabContent from '@/components/AutoRia/Analytics/AnalyticsTabContent';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAutoRiaAuth } from '@/hooks/autoria/useAutoRiaAuth';
import { smartFetch } from '@/utils/smartFetch';
import { CurrencySelector } from '@/components/AutoRia/CurrencySelector/CurrencySelector';
import { usePriceConverter } from '@/hooks/usePriceConverter';
import CarAdCard from '@/components/AutoRia/Components/CarAdCard';
import CarAdListItem from '@/components/AutoRia/Components/CarAdListItem';

// Простой тип для автомобиля
interface CarAd {
  id: number;
  title: string;
  brand?: string;
  model?: string;
  year?: number;
  price?: number;
  currency?: string;
  price_usd?: number; // Цена в USD для отображения
  price_eur?: number; // Цена в EUR для отображения
  mileage?: number;
  city?: string;
  city_name?: string; // Название города
  region_name?: string; // Название региона
  mark_name?: string; // Название марки
  vehicle_type_name?: string; // Тип транспорта
  fuel_type?: string;
  engine_volume?: number;
  transmission?: string;
  license_plate?: string;
  vin_code?: string;
  accident_history?: boolean;
  is_favorite?: boolean;
  view_count?: number; // Количество просмотров
  favorites_count?: number; // Количество добавлений в избранное
  phone_views_count?: number; // Количество показов телефона
  is_vip?: boolean; // VIP статус
  is_premium?: boolean; // Premium статус
  body_type?: string; // Тип кузова
  images?: Array<{
    image: string;
    image_display_url?: string;
    image_url?: string;
    url?: string;
    is_main?: boolean;
  }>;
  user?: {
    id: number;
    email: string;
    account_type?: string;
    phone?: string;
  };
  price_uah?: number; // Цена в UAH для отображения
  dynamic_fields?: {
    year?: number;
    mileage?: number;
    mileage_km?: number;
    fuel_type?: string;
    transmission?: string;
    [key: string]: any;
  };
  seller?: {
    phone?: string;
  };
}

const SearchPage = () => {
  // Хук для переводов
  const t = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Хук для авторизации
  const { user, isAuthenticated } = useAutoRiaAuth();

  // Хук для конвертации цен
  const { formatPrice: formatPriceInSelectedCurrency } = usePriceConverter();

  // Простые состояния
  const [searchResults, setSearchResults] = useState<CarAd[]>([]);
  const [loading, setLoading] = useState(false);
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [regionId, setRegionId] = useState(''); // Для каскадной связи регион → город
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);

  // Быстрые фильтры
  const [quickFilters, setQuickFilters] = useState({
    with_images: false,
    my_ads: false,
    favorites: false,
    verified: false,
    vip: false,
    premium: false
  });

  // Переключатель инверсии для особых фильтров
  const [invertFilters, setInvertFilters] = useState(false);



  // Дебаунсеры для поиска
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const filtersTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [activeTab, setActiveTab] = useState<'results' | 'analytics'>('results');

  // Ref для отслеживания предыдущих URL параметров
  const prevSearchParamsRef = useRef<string>('');


  // Простые фильтры
  const [filters, setFilters] = useState({
    search: '',
    vehicle_type: '',
    brand: '',
    model: '',
    condition: '',
    year_from: '',
    year_to: '',
    price_from: '',
    price_to: '',
    region: '',
    city: '',
    page_size: 20
  });

  // Дополнительные состояния для ID (для каскадных связей)
  const [selectedIds, setSelectedIds] = useState({
    vehicle_type_id: '',
    brand_id: '',
    region_id: ''
  });

  // Update URL with current filters (объявляем в самом начале, чтобы использовать везде)
  const updateURL = useCallback((newFilters: typeof filters, page: number, sort: string, order: 'asc' | 'desc') => {
    const params = new URLSearchParams();

    console.log('🔗 updateURL called with filters:', newFilters);

    // Add filters to URL (только непустые значения)
    Object.entries(newFilters).forEach(([key, value]) => {
      // Пропускаем page_size и пустые значения
      if (key === 'page_size') return;

      // Проверяем, что значение не пустое
      const stringValue = String(value).trim();
      if (stringValue !== '' && stringValue !== '0') {
        params.set(key, stringValue);
        console.log(`  ✅ Added to URL: ${key}=${stringValue}`);
      } else {
        console.log(`  ❌ Skipped empty: ${key}=${value}`);
      }
    });

    // Add pagination and sorting
    if (page > 1) params.set('page', String(page));
    if (sort !== 'created_at') params.set('sort', sort);
    if (order !== 'desc') params.set('order', order);

    // Add quick filters
    if (quickFilters.with_images) params.set('with_images', 'true');
    if (quickFilters.my_ads) params.set('my_ads', 'true');
    if (quickFilters.favorites) params.set('favorites', 'true');
    if (quickFilters.verified) params.set('verified', 'true');
    if (invertFilters) params.set('invert', 'true');

    // Update URL without page reload
    const newURL = params.toString() ? `?${params.toString()}` : '/autoria/search';
    console.log('🔗 New URL:', newURL);
    router.push(newURL, { scroll: false });
  }, [router, quickFilters, invertFilters]);

  // Простая функция поиска
  const searchCars = useCallback(async () => {
    console.log('🔍 Starting search with filters:', filters);
    console.log('🔍 Filter details:', {
      vehicle_type: filters.vehicle_type,
      brand: filters.brand,
      model: filters.model,
      search: filters.search,
      currentPage
    });

    // Определяем тип загрузки: если paginationLoading уже true, то это пагинация
    const isPagination = paginationLoading;

    if (!isPagination) {
      setLoading(true);
    }

    try {
      // Формируем простые параметры с маппингом полей для backend
      const sortFieldMapping: Record<string, string> = {
        'year': 'year_sort',
        'mileage': 'mileage_sort',
        'price': 'price',
        'created_at': 'created_at',
        'title': 'title'
      };

      const backendSortField = sortFieldMapping[sortBy] || sortBy;
      const ordering = sortOrder === 'desc' ? `-${backendSortField}` : backendSortField;
      const searchParams: any = {
        page: currentPage,
        page_size: filters.page_size,
        ordering: ordering
      };

      console.log('🔍 Search params before API call:', searchParams);
      console.log('🔍 Current page_size from filters:', filters.page_size);
      console.log('🔍 Current page:', currentPage);
      console.log('🔍 Full filters object:', filters);

      // Добавляем только заполненные фильтры
      if (filters.search) searchParams.search = filters.search;
      if (filters.vehicle_type) searchParams.vehicle_type = filters.vehicle_type;
      if (filters.brand) searchParams.mark = filters.brand; // ID марки для поиска по связи mark__id
      if (filters.condition) searchParams.condition = filters.condition; // 'new' | 'used'
      if (filters.model) searchParams.model = filters.model; // текстовое поле

      // Для region и city нужно передавать названия, а не ID (CharField в модели)
      // Но VirtualSelect возвращает ID, поэтому нужно получить название по ID
      if (filters.region) {
        // Пока передаем как есть, потом исправим
        searchParams.region = filters.region;
      }
      if (filters.city) {
        // Пока передаем как есть, потом исправим
        searchParams.city = filters.city;
      }
      if (filters.year_from) searchParams.year_from = filters.year_from;
      if (filters.year_to) searchParams.year_to = filters.year_to;
      if (filters.price_from) {
        searchParams.price_min = filters.price_from;
        searchParams.price_currency = 'USD';
      }
      if (filters.price_to) {
        searchParams.price_max = filters.price_to;
        searchParams.price_currency = 'USD';
      }

      // Добавляем быстрые фильтры с учетом инверсии
      if (quickFilters.with_images) {
        searchParams[invertFilters ? 'invert_photos' : 'with_photos_only'] = true;
      }
      if (quickFilters.my_ads) {
        searchParams[invertFilters ? 'invert_my_ads' : 'my_ads_only'] = true;
      }
      if (quickFilters.favorites) {
        // Отправим и альтернативное имя параметра на всякий случай (совместимость с backend)
        searchParams[invertFilters ? 'invert_favorites' : 'favorites_only'] = true;
        if (!invertFilters) {
          searchParams['favorites'] = 'true';
          searchParams['only_favorites'] = 'true';
        }
      }
      if (quickFilters.verified) {
        searchParams.is_validated = !invertFilters; // Для проверенных инверсия работает через булево значение
      }

      console.log('🔍 API params:', searchParams);
      console.log('🔍 Quick filters:', quickFilters);

      // Всегда используем основной API автомобилей
      // Фильтр избранного передается через параметр favorites_only
      const response = await CarAdsService.getCarAds(searchParams);

      console.log('✅ Search successful:', {
        count: response.count,
        resultsLength: response.results?.length,
        requestedPageSize: filters.page_size,
        currentPage: currentPage
      });

      const results = (response.results || []).map((item: any) => {
        if (quickFilters.favorites && !invertFilters && typeof item.is_favorite === 'undefined') {
          return { ...item, is_favorite: true };
        }
        return item;
      });

      console.log('🔍 Final results to set:', {
        resultsCount: results.length,
        totalCount: response.count || 0
      });

      setSearchResults(results);
      setTotalCount(response.count || 0);

    } catch (error: any) {
      console.error('❌ Search error:', error);
      // Если включён фильтр избранного и получаем 401/Unauthorized — покажем явное уведомление
      const msg = String(error?.message || '')
      if (quickFilters.favorites && (msg.includes('401') || /unauthorized/i.test(msg))) {
        toast({
          title: t('search.toast.loginRequired'),
          description: t('search.toast.loginRequiredDescription'),
          variant: 'destructive'
        });
      }
      setSearchResults([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
      setPaginationLoading(false);
    }
  }, [filters, currentPage, quickFilters, invertFilters, sortBy, sortOrder]);

  // Функция для пагинации (без полной перезагрузки)
  const handlePageChange = useCallback((newPage: number) => {
    if (newPage === currentPage) return;

    console.log('📄 Page change:', currentPage, '->', newPage);
    setPaginationLoading(true);
    setCurrentPage(newPage);
    updateURL(filters, newPage, sortBy, sortOrder);
    // searchCars автоматически вызовется через useCallback зависимости
  }, [currentPage, filters, sortBy, sortOrder, updateURL]);

  // Обновление фильтра (мемоизировано)
  const updateFilter = useCallback((key: string, value: any) => {
    console.log('🔄 updateFilter called:', { key, value });
    setFilters(prev => {
      console.log('🔄 Previous filters:', prev);
      const newFilters = { ...prev, [key]: value };
      console.log('🔄 New filters will be:', newFilters);
      
      // Update URL with new filters
      updateURL(newFilters, 1, sortBy, sortOrder);
      
      return newFilters;
    });
    setCurrentPage(1);

    // УБИРАЕМ автоматический поиск - только по кнопке!
    console.log('🔄 Filter updated, but search will only run on button click');
  }, [updateURL, sortBy, sortOrder]);

  // Дебаунсированное обновление поиска
  const updateSearchWithDebounce = (value: string) => {
    // Обновляем состояние сразу для UI
    setFilters(prev => {
      const newFilters = { ...prev, search: value };

      // Очищаем предыдущий таймер
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Если поле очищено, запускаем поиск сразу без debounce
      if (value.trim() === '') {
        console.log('🔍 Search cleared, triggering immediate search');

        // Обновляем URL
        updateURL(newFilters, currentPage, sortBy, sortOrder);

        // Запускаем поиск сразу
        (async () => {
          try {
            setLoading(true);
            const searchParams = buildSearchParams(newFilters, currentPage, sortBy, sortOrder);
            const response = await CarAdsService.getCarAds(searchParams);

            setSearchResults(response.results || []);
            setTotalCount(response.count || 0);
          } catch (error) {
            console.error('🔍 Auto-search error:', error);
          } finally {
            setLoading(false);
          }
        })();

        return newFilters;
      }

      // Запускаем поиск автоматически через 300ms после последнего ввода (стандарт для поиска)
      searchTimeoutRef.current = setTimeout(async () => {
        console.log('🔍 Auto-search triggered after debounce:', value);

        // Обновляем URL
        updateURL(newFilters, currentPage, sortBy, sortOrder);

        // Запускаем поиск
        try {
          setLoading(true);
          const searchParams = buildSearchParams(newFilters, currentPage, sortBy, sortOrder);
          const response = await CarAdsService.getCarAds(searchParams);

          setSearchResults(response.results || []);
          setTotalCount(response.count || 0);
        } catch (error) {
          console.error('🔍 Auto-search error:', error);
        } finally {
          setLoading(false);
        }
      }, 300); // Уменьшено с 800ms до 300ms

      return newFilters;
    });
  };

  // Сброс только поля поиска (мемоизировано)
  const clearSearchField = useCallback(async () => {
    console.log('🔍 Search field cleared via X button, triggering immediate search');

    // Очищаем таймер debounce
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Создаем новые фильтры с пустым поиском
    const newFilters = { ...filters, search: '' };

    // Обновляем состояние
    setFilters(newFilters);

    // Обновляем URL (параметр search будет удален)
    updateURL(newFilters, currentPage, sortBy, sortOrder);

    // Запускаем поиск сразу
    try {
      setLoading(true);
      const searchParams = buildSearchParams(newFilters, currentPage, sortBy, sortOrder);
      const response = await CarAdsService.getCarAds(searchParams);

      setSearchResults(response.results || []);
      setTotalCount(response.count || 0);
    } catch (error) {
      console.error('🔍 Clear search error:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, sortBy, sortOrder, updateURL]);

  // Дебаунсированное обновление фильтров - ОТКЛЮЧЕНО
  const triggerFilterSearch = useCallback(() => {
    // Очищаем предыдущий таймер
    if (filtersTimeoutRef.current) {
      clearTimeout(filtersTimeoutRef.current);
    }

    // ОТКЛЮЧАЕМ автоматический поиск для основных фильтров
    // Поиск будет запускаться только по кнопке "Поиск"
    console.log('🔄 Filter search disabled - use Search button instead');
  }, []);

  // Применение фильтров (мемоизировано)
  const applyFilters = useCallback(() => {
    console.log('🚀 APPLY FILTERS CLICKED!');
    console.log('🚀 Current filters:', filters);
    updateURL(filters, currentPage, sortBy, sortOrder);
    searchCars();
  }, [filters, currentPage, sortBy, sortOrder, updateURL, searchCars]);

  // Сброс фильтров (мемоизировано)
  const clearFilters = useCallback(async () => {
    console.log('🔄 clearFilters called - resetting all filters');

    // Сбрасываем все фильтры
    const clearedFilters = {
      search: '',
      vehicle_type: '',
      brand: '',
      model: '',
      year_from: '',
      year_to: '',
      price_from: '',
      price_to: '',
      region: '',
      city: '',
      page_size: 20
    };

    setFilters(clearedFilters);
    setCurrentPage(1);
    setRegionId(''); // Сбрасываем regionId для каскадной связи

    // Сбрасываем быстрые фильтры
    setQuickFilters({
      with_images: false,
      my_ads: false,
      favorites: false,
      verified: false,
      vip: false,
      premium: false
    });
    setInvertFilters(false);

    // Clear URL params
    router.push('/autoria/search', { scroll: false });

    console.log('🔄 clearFilters - loading all cars without filters');

    // Загружаем все автомобили без фильтров
    try {
      setLoading(true);
      const response = await CarAdsService.getCarAds({
        page: 1,
        page_size: 20,
        ordering: '-created_at'
      });

      console.log('🔄 clearFilters - loaded cars:', response);
      setSearchResults(response.results || []);
      setTotalCount(response.count || 0);
      setCurrentPage(1);
    } catch (error) {
      console.error('🔄 clearFilters - error loading cars:', error);
      setSearchResults([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Простые функции для действий (мемоизированы для предотвращения ререндера дочерних компонентов)
  const handleViewAd = useCallback((carId: number) => {
    window.location.href = `/autoria/ads/view/${carId}`;
  }, []);

  const handleEditAd = useCallback((carId: number) => {
    window.location.href = `/autoria/ads/edit/${carId}`;
  }, []);

  const { toast } = useToast();

  const handleFavoriteToggle = useCallback(async (carId: number, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (togglingIds.has(carId)) return;

    // Найдём карточку и сделаем оптимистичное обновление, как в рабочей версии
    let previousIsFavorite: boolean | undefined;
    setSearchResults(prev => prev.map(c => {
      if (c.id === carId) {
        previousIsFavorite = Boolean(c.is_favorite);
        return { ...c, is_favorite: !Boolean(c.is_favorite) };
      }
      return c;
    }));

    setTogglingIds(prev => new Set(prev).add(carId));
    console.log('🔄 Toggle favorite (optimistic) for car:', carId, 'prev:', previousIsFavorite);

    try {
      const result = await FavoritesService.toggleFavorite(carId);
      console.log('✅ Favorite toggled (server):', result);

      // Зафиксируем фактический ответ сервера (может отличаться от оптимистичного)
      setSearchResults(prevResults =>
        prevResults.map(car =>
          car.id === carId
            ? {
                ...car,
                is_favorite: Boolean(result.is_favorite),
                favorites_count: typeof (result as any).favorites_count === 'number'
                  ? (result as any).favorites_count
                  : (result.is_favorite ? (car.favorites_count || 0) + 1 : Math.max(0, (car.favorites_count || 0) - 1))
              }
            : car
        )
      );

      // Если мы на экране "Обрані":
      //  - в режиме только избранное: удаляем карточку при снятии из избранного
      //  - в режиме инверсии: удаляем карточку при добавлении в избранное
      const shouldRemoveNow = (
        quickFilters.favorites && !invertFilters && result.is_favorite === false
      ) || (
        quickFilters.favorites && invertFilters && result.is_favorite === true
      );
      if (shouldRemoveNow) {
        setSearchResults(prev => prev.filter(c => c.id !== carId));
        setTotalCount(prev => Math.max(0, (prev || 0) - 1));
      }

      // Небольшая фоновая синхронизация счётчиков
      setTimeout(async () => {
        try {
          const response = await smartFetch(`/api/autoria/cars/${carId}`);
          if (response.ok) {
            const carData = await response.json();
            setSearchResults(prevResults =>
              prevResults.map(car =>
                car.id === carId
                  ? {
                      ...car,
                      favorites_count: carData.favorites_count || 0,
                      phone_views_count: carData.phone_views_count || 0,
                      view_count: carData.view_count || 0,
                      // если backend вернул is_favorite — используем его
                      ...(typeof carData.is_favorite !== 'undefined' ? { is_favorite: Boolean(carData.is_favorite) } : {})
                    }
                  : car
              )
            );
          }
        } catch (syncError) {
          console.warn('⚠️ Failed to sync counters:', syncError);
        }
      }, 400);

    } catch (error: any) {
      console.error('❌ Error toggling favorite:', error);
      // Откатываем оптимистичное изменение, если запрос не удался
      setSearchResults(prev => prev.map(c => c.id === carId ? { ...c, is_favorite: previousIsFavorite } : c));

      const msg = String(error?.message || '')
      if (msg.toLowerCase().includes('unauthorized') || msg.includes('401')) {
        toast({ title: t('search.toast.loginRequired'), description: t('search.toast.favoriteToggleErrorDescription'), variant: 'destructive' });
      } else {
        toast({ title: t('search.toast.favoriteToggleError'), description: t('search.toast.favoriteToggleErrorDescription'), variant: 'destructive' });
      }
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(carId);
        return next;
      });
    }
  }, [togglingIds, quickFilters, invertFilters, toast]);

  // Функция удаления объявления
  const handleDeleteAd = useCallback(async (carId: number, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    if (deletingIds.has(carId)) return;

    // Проверяем, является ли пользователь владельцем
    const car = searchResults.find(c => c.id === carId);
    if (!car || !isOwner(car)) {
      toast({
        title: t('search.toast.noAccess'),
        description: t('search.toast.noAccessDescription'),
        variant: 'destructive'
      });
      return;
    }

    // Подтверждение удаления
    const confirmed = await alertHelpers.confirmDelete(t('autoria.thisAd') || 'це оголошення');
    if (!confirmed) return;

    setDeletingIds(prev => new Set(prev).add(carId));

    try {
      const response = await smartFetch(`/api/autoria/cars/${carId}/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      // Удаляем из локального состояния
      setSearchResults(prev => prev.filter(c => c.id !== carId));
      setTotalCount(prev => Math.max(0, (prev || 0) - 1));

      toast({
        title: t('search.toast.adDeleted'),
        description: t('search.toast.adDeletedDescription'),
      });

    } catch (error: any) {
      console.error('❌ Error deleting ad:', error);

      const msg = String(error?.message || '');
      if (msg.toLowerCase().includes('unauthorized') || msg.includes('401')) {
        toast({
          title: t('search.toast.loginRequiredDelete'),
          description: t('search.toast.loginRequiredDeleteDescription'),
          variant: 'destructive'
        });
      } else if (msg.toLowerCase().includes('forbidden') || msg.includes('403')) {
        toast({
          title: t('search.toast.noAccess'),
          description: t('search.toast.noAccessDescription'),
          variant: 'destructive'
        });
      } else {
        toast({
          title: t('search.toast.deleteError'),
          description: t('search.toast.deleteErrorDescription'),
          variant: 'destructive'
        });
      }
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(carId);
        return next;
      });
    }
  }, [deletingIds, toast, isAuthenticated, user, searchResults]);

  const isOwner = useCallback((car: CarAd) => {
    if (!isAuthenticated || !user) return false;

    // Проверяем по email пользователя
    const userEmail = user.email;
    const carOwnerEmail = car.user?.email;

    // Если есть email владельца объявления, сравниваем с текущим пользователем
    if (carOwnerEmail && userEmail) {
      return userEmail === carOwnerEmail;
    }

    // Если нет информации о владельце, разрешаем только суперюзерам
    return user.is_superuser || false;
  }, [isAuthenticated, user]);

  // Мемоизированный callback для обновления счетчиков (предотвращает ререндер всех карточек)
  const handleCountersUpdate = useCallback((adId: number, counters: { favorites_count: number; phone_views_count: number }) => {
    setSearchResults(prevResults => 
      prevResults.map(ad => 
        ad.id === adId 
          ? { ...ad, favorites_count: counters.favorites_count, phone_views_count: counters.phone_views_count }
          : ad
      )
    );
  }, []);

  // Restore filters from URL on mount
  useEffect(() => {
    if (isInitialized) return;

    console.log('🔄 Component mounted, restoring filters from URL');

    // Get filters from URL
    const urlFilters: typeof filters = {
      search: searchParams.get('search') || '',
      vehicle_type: searchParams.get('vehicle_type') || '',
      brand: searchParams.get('brand') || '',
      model: searchParams.get('model') || '',
      condition: searchParams.get('condition') || '',
      year_from: searchParams.get('year_from') || '',
      year_to: searchParams.get('year_to') || '',
      price_from: searchParams.get('price_from') || '',
      price_to: searchParams.get('price_to') || '',
      region: searchParams.get('region') || '',
      city: searchParams.get('city') || '',
      page_size: 20
    };

    // Get pagination and sorting from URL
    const urlPage = parseInt(searchParams.get('page') || '1');
    const urlSort = searchParams.get('sort') || 'created_at';
    const urlOrder = (searchParams.get('order') || 'desc') as 'asc' | 'desc';

    // Get quick filters from URL
    const urlQuickFilters = {
      with_images: searchParams.get('with_images') === 'true',
      my_ads: searchParams.get('my_ads') === 'true',
      favorites: searchParams.get('favorites') === 'true',
      verified: searchParams.get('verified') === 'true',
      vip: false,
      premium: false
    };

    const urlInvert = searchParams.get('invert') === 'true';

    // Update state with URL params
    setFilters(urlFilters);
    setCurrentPage(urlPage);
    setSortBy(urlSort);
    setSortOrder(urlOrder);
    setQuickFilters(urlQuickFilters);
    setInvertFilters(urlInvert);
    setIsInitialized(true);

    console.log('✅ Filters restored from URL:', { urlFilters, urlPage, urlSort, urlOrder, urlQuickFilters, urlInvert });
  }, [searchParams, isInitialized]);

  // Watch for URL changes and update filters (for direct URL navigation)
  useEffect(() => {
    if (!isInitialized) return; // Skip on initial mount

    // Создаем строку из всех параметров для сравнения
    const currentParamsString = searchParams.toString();

    // Проверяем, изменились ли параметры
    if (currentParamsString === prevSearchParamsRef.current) {
      return; // Параметры не изменились, ничего не делаем
    }

    console.log('🔄 URL changed, updating filters from searchParams');
    console.log('Previous params:', prevSearchParamsRef.current);
    console.log('Current params:', currentParamsString);

    // Обновляем ref
    prevSearchParamsRef.current = currentParamsString;

    // Читаем все параметры из URL
    const urlFilters: typeof filters = {
      search: searchParams.get('search') || '',
      vehicle_type: searchParams.get('vehicle_type') || '',
      brand: searchParams.get('brand') || '',
      model: searchParams.get('model') || '',
      condition: searchParams.get('condition') || '',
      year_from: searchParams.get('year_from') || '',
      year_to: searchParams.get('year_to') || '',
      price_from: searchParams.get('price_from') || '',
      price_to: searchParams.get('price_to') || '',
      region: searchParams.get('region') || '',
      city: searchParams.get('city') || '',
      page_size: parseInt(searchParams.get('page_size') || '20')
    };

    const urlPage = parseInt(searchParams.get('page') || '1');
    const urlSort = searchParams.get('sort') || 'created_at';
    const urlOrder = (searchParams.get('order') || 'desc') as 'asc' | 'desc';

    const urlQuickFilters = {
      with_images: searchParams.get('with_images') === 'true',
      my_ads: searchParams.get('my_ads') === 'true',
      favorites: searchParams.get('favorites') === 'true',
      verified: searchParams.get('verified') === 'true',
      vip: false,
      premium: false
    };

    const urlInvert = searchParams.get('invert') === 'true';

    // Обновляем все состояния
    setFilters(urlFilters);
    setCurrentPage(urlPage);
    setSortBy(urlSort);
    setSortOrder(urlOrder);
    setQuickFilters(urlQuickFilters);
    setInvertFilters(urlInvert);

    console.log('✅ Filters updated from URL:', { urlFilters, urlPage, urlSort, urlOrder });
  }, [searchParams, isInitialized]);

  // Загрузка при монтировании - загружаем начальные данные
  useEffect(() => {
    if (!isInitialized) return;

    console.log('🔄 Component initialized, loading data with filters');
    searchCars();
  }, [isInitialized]);

  // Очистка таймеров при размонтировании
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (filtersTimeoutRef.current) {
        clearTimeout(filtersTimeoutRef.current);
      }
    };
  }, []);

  // ПРИМЕЧАНИЕ: searchCars автоматически вызывается при изменении:
  // filters, currentPage, quickFilters, invertFilters, sortBy, sortOrder
  // Дополнительные useEffect НЕ НУЖНЫ - они создают бесконечные циклы!

  // Отдельный useEffect для page_size (для отладки)
  useEffect(() => {
    console.log('📄 Page size changed in useEffect:', filters.page_size);
    console.log('📄 Full filters in useEffect:', filters);
  }, [filters.page_size]);

  // Отдельный useEffect для отслеживания всех изменений filters
  useEffect(() => {
    console.log('🔄 Filters changed, searchCars will be called:', filters);
  }, [filters]);
  // Автопоиск при изменении пагинации/сортировки/размера страницы и быстрых фильтров
  useEffect(() => {
    console.log('🚀 Auto-search trigger', {
      currentPage,
      sortBy,
      sortOrder,
      page_size: filters.page_size,
      quickFilters,
      invertFilters
    });
    searchCars();
  }, [currentPage, sortBy, sortOrder, filters.page_size, quickFilters, invertFilters]);




  // Автоматический поиск при изменении фильтров (ВРЕМЕННО ОТКЛЮЧЕН)
  // useEffect(() => {
  //   console.log('🔄 Filters changed, triggering auto search');
  //   searchCars();
  // }, [
  //   filters.vehicle_type,
  //   filters.brand,
  //   filters.model,
  //   filters.year_from,
  //   filters.year_to,
  //   filters.price_from,
  //   filters.price_to,
  //   filters.region,
  //   filters.city
  // ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('searchTitle')}</h1>
          <p className="text-slate-600">{t('searchDesc')}</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Фильтры */}
          <div className="lg:w-80">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  {t('searchFilters')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Поиск по тексту */}
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('search')}</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder={t('enterBrandModel')}
                      value={filters.search}
                      onChange={(e) => updateSearchWithDebounce(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSearchField}
                      disabled={!filters.search}
                      className="px-3"
                      title="Очистить поиск"
                    >
                      ×
                    </Button>
                  </div>
                  {filters.search && (
                    <p className="text-xs text-slate-500 mt-1">
                      {t('autoria.searchAutoApplyNotice') || t('searchAutoApplyNotice') || 'Поиск применяется автоматически через 0.8 сек'}
                    </p>
                  )}
                </div>

                {/* Тип транспорта */}
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('vehicleType')}</label>
                  <VirtualSelect
                    placeholder={t('selectVehicleType')}
                    value={filters.vehicle_type}
                    onValueChange={(value) => updateFilter('vehicle_type', value || '')}
                    fetchOptions={async (search) => {
                      console.log('🔍 Fetching vehicle types with search:', search);
                      const params = new URLSearchParams();
                      if (search) params.append('search', search);
                      const response = await fetch(`/api/public/reference/vehicle-types?${params}`);
                      const data = await response.json();
                      console.log('🔍 Vehicle types response:', data);

                      // API возвращает объект с полем options
                      return data.options || [];
                    }}
                    allowClear={true}
                    searchable={true}
                  />
                </div>

                {/* Марка */}
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('brand')}</label>
                  <VirtualSelect
                    placeholder={t('selectBrand')}
                    value={filters.brand}
                    onValueChange={(value) => {
                      console.log('🔍 Brand selected:', value);
                      updateFilter('brand', value || '');
                      // Сбрасываем модель при смене марки
                      if (filters.model) {
                        updateFilter('model', '');
                      }
                    }}
                    fetchOptions={async (search) => {
                      console.log('🔍 Fetching brands with search:', search);
                      console.log('🔍 Current vehicle_type:', filters.vehicle_type);

                      // ✅ КАСКАДНАЯ ФИЛЬТРАЦИЯ: Если тип не выбран, возвращаем пустой массив
                      if (!filters.vehicle_type) {
                        console.log('🔍 ❌ No vehicle_type selected, returning empty array');
                        return [];
                      }

                      const params = new URLSearchParams();
                      if (search) params.append('search', search);
                      params.append('vehicle_type_id', filters.vehicle_type);
                      params.append('page_size', '1000'); // Загружаем все данные
                      console.log('🔍 ✅ Fetching brands for vehicle_type:', filters.vehicle_type);

                      const response = await fetch(`/api/public/reference/brands?${params}`);
                      const data = await response.json();
                      console.log('🔍 Brands response count:', data.options?.length || 0);
                      return data.options || [];
                    }}
                    allowClear={true}
                    searchable={true}
                    disabled={!filters.vehicle_type}
                    dependencies={[filters.vehicle_type]} // Перезагружать при смене типа транспорта
                  />
                  {!filters.vehicle_type && (
                    <p className="text-xs text-slate-500 mt-1">
                      {t('selectVehicleTypeFirst')}
                    </p>
                  )}
                </div>

                {/* Состояние (новый/б/у) */}
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('autoria.condition') || 'Состояние'}</label>
                  <VirtualSelect
                    placeholder={t('autoria.selectCondition') || 'Выберите состояние'}
                    value={filters.condition}
                    onValueChange={(value) => updateFilter('condition', value || '')}
                    fetchOptions={async () => {
                      // Простые статические варианты, как у выпадающих списков
                      return [
                        { value: 'new', label: t('autoria.new') || 'Новый' },
                        { value: 'used', label: t('autoria.used') || 'Б/у' },
                      ];
                    }}
                    allowClear={true}
                    searchable={false}
                  />
                </div>

                {/* Модель */}
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('model')}</label>
                  <VirtualSelect
                    placeholder={t('selectModel')}
                    value={filters.model}
                    onValueChange={(value) => updateFilter('model', value || '')}
                    fetchOptions={async (search) => {
                      console.log('🔍 Fetching models with search:', search);
                      console.log('🔍 Current brand:', filters.brand);

                      // Если марка не выбрана, возвращаем пустой массив
                      if (!filters.brand) {
                        console.log('🔍 No brand selected, returning empty array');
                        return [];
                      }

                      const params = new URLSearchParams();
                      if (search) params.append('search', search);
                      params.append('mark_id', filters.brand); // ИСПРАВЛЕНО: brand_id → mark_id
                      params.append('page_size', '1000'); // Загружаем все данные

                      const response = await fetch(`/api/public/reference/models?${params}`);
                      const data = await response.json();
                      console.log('🔍 Models response:', data);
                      return data.options || [];
                    }}
                    allowClear={true}
                    searchable={true}
                    disabled={!filters.brand}
                    dependencies={[filters.brand]} // Перезагружать при смене марки
                  />
                  {!filters.brand && (
                    <p className="text-xs text-slate-500 mt-1">
                      {t('selectBrandFirst')}
                    </p>
                  )}
                </div>

                {/* Год */}
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('year')}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="От"
                      value={filters.year_from}
                      onChange={(e) => updateFilter('year_from', e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="До"
                      value={filters.year_to}
                      onChange={(e) => updateFilter('year_to', e.target.value)}
                    />
                  </div>
                </div>

                {/* Цена */}
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('price')} (USD)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="От"
                      value={filters.price_from}
                      onChange={(e) => updateFilter('price_from', e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="До"
                      value={filters.price_to}
                      onChange={(e) => updateFilter('price_to', e.target.value)}
                    />
                  </div>
                </div>

                {/* Регион */}
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('region')}</label>
                  <VirtualSelect
                    placeholder={t('selectRegion')}
                    value={filters.region}
                    onValueChange={(value, label) => {
                      console.log('🔍 Region selected:', { value, label });
                      setRegionId(value || ''); // ID для каскадной связи с городами
                      updateFilter('region', value || ''); // ID для поиска автомобилей
                      // Сбрасываем город при смене региона
                      if (filters.city) {
                        updateFilter('city', '');
                      }
                    }}
                    fetchOptions={async (search) => {
                      console.log('🔍 Fetching regions with search:', search);

                      const params = new URLSearchParams();
                      if (search) params.append('search', search);
                      params.append('page_size', '1000'); // Load all data

                      const response = await fetch(`/api/public/reference/regions?${params}`);
                      const data = await response.json();
                      console.log('🔍 Regions response:', data);
                      return data.options || [];
                    }}
                    allowClear={true}
                    searchable={true}
                  />
                </div>

                {/* Город */}
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('city')}</label>
                  <VirtualSelect
                    placeholder={t('selectCity')}
                    value={filters.city}
                    onValueChange={(value, label) => {
                      console.log('🔍 City selected:', { value, label });
                      updateFilter('city', value || ''); // ID для поиска автомобилей
                    }}
                    fetchOptions={async (search) => {
                      console.log('🔍 Fetching cities with search:', search);
                      console.log('🔍 Current regionId:', regionId);

                      // Если регион не выбран, возвращаем пустой массив
                      if (!regionId) {
                        console.log('🔍 No region selected, returning empty array');
                        return [];
                      }

                      const params = new URLSearchParams();
                      if (search) params.append('search', search);
                      params.append('region_id', regionId); // Используем regionId для каскадной связи
                      params.append('page_size', '1000'); // Загружаем все данные

                      // 🚀 КЕШИРОВАНИЕ: Используем кешированный fetch для городов
                      const data = await cachedFetch(`/api/public/reference/cities?${params}`, {
                        cacheTime: 900,  // 15 минут
                        staleTime: 1800  // 30 минут stale
                      });
                      console.log('🔍 Cities response:', data);
                      return data.options || [];
                    }}
                    allowClear={true}
                    searchable={true}
                    disabled={!filters.region}
                    dependencies={[regionId]} // Перезагружать при смене региона
                  />
                  {!regionId && (
                    <p className="text-xs text-slate-500 mt-1">{t('selectRegionFirst')}</p>
                  )}
                </div>

                {/* Кнопки */}
                <div className="flex gap-2">
                  <Button onClick={applyFilters} className="flex-1" disabled={loading}>
                    <Search className="h-4 w-4 mr-2" />
                    {t('common.search')}
                  </Button>
                  <Button variant="outline" onClick={clearFilters}>
                    {t('common.clear')}
                  </Button>
                </div>

                {/* Быстрые фильтры */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-slate-700">{t('autoria.quickSearch')}</h4>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={invertFilters}
                        onChange={(e) => setInvertFilters(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-xs text-slate-600">🔄 {t('common.invert') || 'Invert'}</span>
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={quickFilters.with_images}
                        onChange={(e) => setQuickFilters(prev => ({ ...prev, with_images: e.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-slate-600">📷 {t('autoria.withPhotos') || 'With photos'}</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={quickFilters.my_ads}
                        onChange={(e) => setQuickFilters(prev => ({ ...prev, my_ads: e.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-slate-600">👤 {t('autoria.myAds') || t('myAdsTitle')}</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={quickFilters.favorites}
                        onChange={(e) => setQuickFilters(prev => ({ ...prev, favorites: e.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-slate-600">❤️ {t('autoria.favorites')}</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={quickFilters.verified}
                        onChange={(e) => setQuickFilters(prev => ({ ...prev, verified: e.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-slate-600">✅ {t('autoria.verified') || 'Verified'}</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={quickFilters.vip}
                        onChange={(e) => setQuickFilters(prev => ({ ...prev, vip: e.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-slate-600">⭐ VIP</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={quickFilters.premium}
                        onChange={(e) => setQuickFilters(prev => ({ ...prev, premium: e.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-slate-600">💎 Premium</span>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Результаты */}
          <div className="flex-1">
            {/* Заголовок результатов */}
            <div className="mb-6">
              {/* Responsive toolbar */}
              <div className="mb-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-[200px]">
                    <h2 className="text-xl font-semibold">
                      {loading ? t('common.loading') : `${t('common.found')}: ${totalCount}`}
                    </h2>
                    {!loading && totalCount > 0 && (
                      <p className="text-sm text-slate-600">
                        {filters.page_size === 0 ?
                          `${totalCount} ${t('autoria.total', 'total')}` :
                          `${searchResults.length} / ${totalCount} • ${t('page', 'Page')} ${currentPage} ${t('autoria.of', 'of')} ${Math.ceil(totalCount / filters.page_size)}`
                        }
                      </p>
                    )}
                  </div>

	            {/* Tabs: Results / Analytics */}
	            {!loading && totalCount > 0 && (
	              <div className="mt-2">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1">
                    <TabsList>
                      <TabsTrigger value="results">{t('searchResults')}</TabsTrigger>
                      <TabsTrigger value="analytics">{t('analytics')}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="results">
                      {/* Контент результатов будет отображаться ниже */}
                    </TabsContent>
                    <TabsContent value="analytics">
                      <AnalyticsTabContent filters={filters as any} results={searchResults as any} loading={loading} />
                    </TabsContent>
                  </Tabs>

                  {/* Currency Selector - всегда видимый */}
                  <CurrencySelector showLabel={true} />
                </div>
	              </div>
	            )}


                  {activeTab === 'results' && !loading && searchResults.length > 0 && (
                    <div className="flex-1 flex flex-wrap gap-3 items-center">
                      {/* Sort (combined) */}
                      <div className="flex items-center gap-2 min-w-[200px] flex-1">
                        <span className="text-sm text-slate-600 whitespace-nowrap">{t('common.sort') || 'Sort'}:</span>
                        <select
                          value={`${sortBy}_${sortOrder}`}
                          onChange={(e) => {
                            const val = e.target.value as string;
                            const [field, dir] = val.split('_');
                            setSortBy(field as any);
                            setSortOrder((dir as 'asc' | 'desc') || 'desc');
                            setCurrentPage(1); // Сбрасываем на первую страницу при изменении сортировки
                          }}
                          className="text-sm border border-gray-300 rounded px-2 py-1 flex-1 min-w-0"
                        >
                          <option value="created_at_desc">{t('autoria.byDate') || 'By date'} ↓</option>
                          <option value="created_at_asc">{t('autoria.byDate') || 'By date'} ↑</option>
                          <option value="price_desc">{t('autoria.byPrice') || 'By price'} ↓</option>
                          <option value="price_asc">{t('autoria.byPrice') || 'By price'} ↑</option>
                          <option value="year_desc">{t('autoria.byYear') || 'By year'} ↓</option>
                          <option value="year_asc">{t('autoria.byYear') || 'By year'} ↑</option>
                          <option value="mileage_desc">{t('autoria.byMileage') || 'By mileage'} ↓</option>
                          <option value="mileage_asc">{t('autoria.byMileage') || 'By mileage'} ↑</option>
                          <option value="title_asc">{t('autoria.byTitle') || 'By title'} A→Z</option>
                        </select>
                      </div>

                      {/* Per page */}
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <span className="text-sm text-slate-600 whitespace-nowrap">{t('autoria.perPage') || 'Per page'}:</span>
                        <select
                          value={filters.page_size === 0 ? 'all' : String(filters.page_size)}
                          onChange={(e) => {
                            const val = e.target.value === 'all' ? 0 : parseInt(e.target.value);
                            console.log('📄 Page size changed to:', val);
                            const newPageSize = isNaN(val) ? 20 : val;

                            // Обновляем состояние
                            const newFilters = { ...filters, page_size: newPageSize };
                            setFilters(newFilters);
                            setCurrentPage(1);

                            console.log('📄 New filters after page_size change:', newFilters);
                          }}
                          className="text-sm border border-gray-300 rounded px-2 py-1 w-[80px]"
                        >
                          <option value="all">{t('autoria.all') || 'Все'}</option>
                          <option value={1}>1</option>
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                          <option value={200}>200</option>
                        </select>
                      </div>

                      {/* View mode */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600 hidden sm:inline">{t('autoria.view') || 'View'}:</span>
                        <div className="flex border rounded-lg overflow-hidden">
                          <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                          >
                            <Grid className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                          >
                            <List className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Результаты */}
            {activeTab === 'results' && (
              loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <span className="ml-4">{t('common.loading')}</span>
                </div>
              ) : searchResults.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <Search className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">
                        {t('autoria.noAdsFound') || t('common.none')}
                      </h3>
                      <p className="text-slate-600 mb-6">
                        {t('autoria.tryAdjustFilters') || t('common.search')}
                      </p>
                      <Button onClick={clearFilters}>
                        {t('common.clear')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div
                  className={`${viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : 'space-y-3'} transition-opacity duration-300 ${paginationLoading ? 'opacity-50' : 'opacity-100'}`}
                >
                  {searchResults.map((car) => (
                    viewMode === 'grid' ? (
                      <CarAdCard 
                        key={car.id} 
                        ad={car}
                        onCountersUpdate={handleCountersUpdate}
                      />
                    ) : (
                      <CarAdListItem 
                        key={car.id} 
                        ad={car}
                        onCountersUpdate={handleCountersUpdate}
                        onDelete={handleDeleteAd}
                        isOwner={isOwner}
                        togglingIds={togglingIds}
                        deletingIds={deletingIds}
                      />
                    )
                ))}
              </div>
            )
            )}

            {/* Пагинация */}
            {activeTab === 'results' && !loading && searchResults.length > 0 && filters.page_size !== 0 && totalCount > filters.page_size && (
              <div className="flex justify-center items-center gap-4 mt-8 mb-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (currentPage > 1) {
                      handlePageChange(currentPage - 1);
                    }
                  }}
                  disabled={currentPage <= 1 || paginationLoading}
                  className="flex items-center gap-2"
                >
                  {paginationLoading ? '⏳' : '←'} {t('autoria.prev') || 'Prev'}
                </Button>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">
                    {t('page', 'Page')} {currentPage} / {filters.page_size === 0 ? 1 : Math.ceil(totalCount / filters.page_size)}
                  </span>
                  {paginationLoading && (
                    <span className="text-xs text-blue-500 animate-pulse">
                      {t('loading.pleaseWait')}
                    </span>
                  )}
                </div>

                <Button
                  variant="outline"
                  onClick={() => {
                    if (filters.page_size !== 0 && currentPage < Math.ceil(totalCount / filters.page_size)) {
                      handlePageChange(currentPage + 1);
                    }
                  }}
                  disabled={filters.page_size === 0 || currentPage >= Math.ceil(totalCount / filters.page_size) || paginationLoading}
                  className="flex items-center gap-2"
                >
                  {t('autoria.next') || 'Next'} {paginationLoading ? '⏳' : '→'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
