"use client";

import { useSearchParams } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VirtualSelect } from '@/components/ui/virtual-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  TrendingUp,
  Users,
  Car,
  Eye,
  Heart,
  RefreshCw,
  Download,
  Calendar,
  Filter,
  Activity,
  DollarSign,
  Target,
  Zap,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';

import { useI18n } from '@/contexts/I18nContext';

interface KPIData {
  totalUsers: number;
  totalAds: number;
  totalViews: number;
  totalFavorites: number;
  conversionRate: number;
  avgPrice: number;
  activeUsers: number;
  newUsers: number;
}

interface AnalyticsFilters {
  period: '7d' | '30d' | '90d' | '1y';
  search: string;
  vehicle_type: string;
  brand: string;
  model: string;
  year_from: string;
  year_to: string;
  price_from: string;
  price_to: string;
  region: string;
  city: string;
  page_size: number;
}

const SimpleEnhancedAnalyticsPage: React.FC = () => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<AnalyticsFilters>({
    period: '30d',
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
    page_size: 20,
  });
  const [regionId, setRegionId] = useState('');
  const [invertFilters, setInvertFilters] = useState(false);
  const [searchText, setSearchText] = useState('');

  const [kpiData, setKpiData] = useState<KPIData>({
    totalUsers: 45123,
    totalAds: 21456,
    totalViews: 892341,
    totalFavorites: 34567,
    conversionRate: 3.2,
    avgPrice: 285000,
    activeUsers: 12890,
    newUsers: 2341
  });

  const searchParams = useSearchParams();
  // Инициализация фильтров из URL (переход со страницы поиска)
  useEffect(() => {
    const sp = searchParams;
    if (!sp) return;
    const get = (k: string) => sp.get(k) || '';
    setFilters(prev => ({
      ...prev,
      search: get('search') || prev.search,
      vehicle_type: get('vehicle_type') || prev.vehicle_type,
      brand: get('brand') || prev.brand,
      model: get('model') || prev.model,
      year_from: get('year_from') || prev.year_from,
      year_to: get('year_to') || prev.year_to,
      price_from: get('price_from') || prev.price_from,
      price_to: get('price_to') || prev.price_to,
      region: get('region') || prev.region,
      city: get('city') || prev.city,
    }));
    const r = get('region');
    if (r) setRegionId(r);
  }, [searchParams]);

  const updateFilter = (key: keyof AnalyticsFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Загрузка данных
  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // Здесь будет реальная загрузка данных
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Симуляция обновления данных
      setKpiData(prev => ({
        ...prev,
        totalUsers: prev.totalUsers + Math.floor(Math.random() * 100),
        totalViews: prev.totalViews + Math.floor(Math.random() * 1000)
      }));
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [filters]);

  const handleFilterChange = (key: keyof AnalyticsFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleRefresh = () => {
    loadAnalyticsData();
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (value < 0) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('uk-UA').format(num);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: 'UAH',
      minimumFractionDigits: 0
    }).format(num);
  };

  return (
    <div className="analytics-container">
      <div className="mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-7xl">
        {/* Заголовок */}
        {/* Хедер с фильтрами справа */}
        <div className="flex flex-col gap-4 lg:gap-6">
          {/* Левая часть: заголовок/описание/период/кнопки */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Промышленная аналитика</h1>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 shadow-sm">
                  <Zap className="h-3 w-3 mr-1" />
                  AI-Powered
                </Badge>
                <Badge variant="outline" className="bg-gradient-to-r from-green-500 to-blue-500 text-white border-0 shadow-sm">
                  <Activity className="h-3 w-3 mr-1" />
                  ML Прогнозы
                </Badge>
              </div>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
              Современная система аналитики с машинным обучением и интерактивными графиками
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
              <Select value={filters.period} onValueChange={(value) => handleFilterChange('period', value)}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 дней</SelectItem>
                  <SelectItem value="30d">30 дней</SelectItem>
                  <SelectItem value="90d">90 дней</SelectItem>
                  <SelectItem value="1y">1 год</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:ml-auto">
                <Button variant="outline" onClick={handleRefresh} disabled={loading} className="w-full sm:w-auto">
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Обновить</span>
                  <span className="sm:hidden">Обн.</span>
                </Button>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Download className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Экспорт</span>
                  <span className="sm:hidden">Эксп.</span>
                </Button>
              </div>
            </div>
          </div>
          </div>

          {/* Панель фильтров — отдельной строкой под шапкой */}
          <div className="w-full">
            <Card className="w-full shadow-sm border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Filter className="h-5 w-5 text-blue-600" />
                  Интерактивные фильтры
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  {/* Поиск по тексту */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Поиск</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Марка, модель..."
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({...prev, search: e.target.value}))}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFilters(prev => ({...prev, search: ''}))}
                        disabled={!filters.search}
                        className="px-3"
                        title="Очистить поиск"
                      >
                        ×
                      </Button>
                    </div>
                  </div>

                  {/* Тип транспорта */}
                  <VirtualSelect
                    placeholder="Тип транспорта"
                    value={filters.vehicle_type}
                    onValueChange={(value) => setFilters(prev => ({...prev, vehicle_type: value || ''}))}
                    fetchOptions={async (search) => {
                      const params = new URLSearchParams();
                      if (search) params.append('search', search);
                      const response = await fetch(`/api/public/reference/vehicle-types?${params}`);
                      const data = await response.json();
                      return Array.isArray(data) ? data.map((i:any)=>({value: String(i.id), label: i.name})) : [];
                    }}
                    allowClear
                    searchable
                  />

                  {/* Марка */}
                  <VirtualSelect
                    placeholder="Марка"
                    value={filters.brand}
                    onValueChange={(value) => {
                      setFilters(prev => ({...prev, brand: value || '', model: ''}));
                    }}
                    fetchOptions={async (search) => {
                      const params = new URLSearchParams();
                      if (search) params.append('search', search);
                      if (filters.vehicle_type) params.append('vehicle_type_id', filters.vehicle_type);
                      params.append('page_size', '1000');
                      const response = await fetch(`/api/public/reference/brands?${params}`);
                      const data = await response.json();
                      return data.options || [];
                    }}
                    allowClear
                    searchable
                    disabled={!filters.vehicle_type}
                    dependencies={[filters.vehicle_type]}
                  />

                  {/* Модель */}
                  <VirtualSelect
                    placeholder="Модель"
                    value={filters.model}
                    onValueChange={(value) => setFilters(prev => ({...prev, model: value || ''}))}
                    fetchOptions={async (search) => {
                      if (!filters.brand) return [];
                      const params = new URLSearchParams();
                      if (search) params.append('search', search);
                      params.append('brand_id', filters.brand);
                      params.append('page_size', '1000');
                      const response = await fetch(`/api/public/reference/models?${params}`);
                      const data = await response.json();
                      return data.options || [];
                    }}
                    allowClear
                    searchable
                    disabled={!filters.brand}
                    dependencies={[filters.brand]}
                  />

                  {/* Цена */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Цена (USD)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="number" placeholder="От" value={filters.price_from} onChange={(e)=>setFilters(p=>({...p, price_from: e.target.value}))} />
                      <Input type="number" placeholder="До" value={filters.price_to} onChange={(e)=>setFilters(p=>({...p, price_to: e.target.value}))} />
                    </div>
                  </div>

                  {/* Регион */}
                  <VirtualSelect
                    placeholder="Регион"
                    value={filters.region}
                    onValueChange={(value) => {
                      setRegionId(value || '');
                      setFilters(prev => ({...prev, region: value || '', city: ''}));
                    }}
                    fetchOptions={async (search) => {
                      const params = new URLSearchParams();
                      if (search) params.append('search', search);
                      params.append('page_size', '1000');
                      const response = await fetch(`/api/public/reference/regions?${params}`);
                      const data = await response.json();
                      return data.options || [];
                    }}
                    allowClear
                    searchable
                  />

                  {/* Город */}
                  <VirtualSelect
                    placeholder="Город"
                    value={filters.city}
                    onValueChange={(value) => setFilters(prev => ({...prev, city: value || ''}))}
                    fetchOptions={async (search) => {
                      if (!regionId) return [];
                      const params = new URLSearchParams();
                      if (search) params.append('search', search);
                      params.append('region_id', regionId);
                      params.append('page_size', '1000');
                      const response = await fetch(`/api/public/reference/cities?${params}`);
                      const data = await response.json();
                      return data.options || [];
                    }}
                    allowClear
                    searchable
                    disabled={!filters.region}
                    dependencies={[regionId]}
                  />

                  <Button variant="outline" className="w-full h-10">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Диапазон дат</span>
                    <span className="sm:hidden">Даты</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

        {/* Фильтры перенесены в хедер */}

        {/* KPI карточки перемещены в таб "Тренды" */}

        {/* Табы с графиками */}
        <Tabs defaultValue="trends" className="space-y-6">
          <div className="overflow-visible">
            <TabsList className="flex flex-col sm:flex-row flex-wrap gap-2 w-full h-auto p-1 bg-white/80 backdrop-blur-sm shadow-sm">
              <TabsTrigger value="trends" className="analytics-tab-trigger data-[state=active]:bg-blue-500 data-[state=active]:text-white flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                <span>{t('autoria.analytics.trends')}</span>
              </TabsTrigger>
              <TabsTrigger value="distribution" className="analytics-tab-trigger data-[state=active]:bg-green-500 data-[state=active]:text-white flex items-center">
                <Target className="h-4 w-4 mr-2" />
                <span>{t('autoria.analytics.distributions')}</span>
              </TabsTrigger>
              <TabsTrigger value="comparison" className="analytics-tab-trigger data-[state=active]:bg-purple-500 data-[state=active]:text-white flex items-center">
                <Zap className="h-4 w-4 mr-2" />
                <span>{t('autoria.analytics.comparison')}</span>
              </TabsTrigger>
              <TabsTrigger value="forecasts" className="analytics-tab-trigger data-[state=active]:bg-orange-500 data-[state=active]:text-white flex items-center">
                <Activity className="h-4 w-4 mr-2" />
                <span>{t('autoria.analytics.forecasts')}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="trends" className="space-y-4 mt-6">
            {/* Основные графики — выше KPI по best practices */}
            <div className="flex flex-wrap gap-4 lg:gap-6">
              <Card className="flex-1 min-w-[320px] shadow-lg border-0 bg-white/90 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="h-5 w-5 text-blue-600" />
                    Активность пользователей
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Динамика активности за выбранный период
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="min-h-[320px] md:min-h-[360px] lg:min-h-[420px] flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-blue-50 rounded-xl border border-blue-100">
                    <div className="text-center p-4">
                      <div className="p-4 bg-blue-100 rounded-full w-fit mx-auto mb-4">
                        <Activity className="h-8 w-8 sm:h-12 sm:w-12 text-blue-600" />
                      </div>
                      <p className="text-base sm:text-lg font-semibold text-blue-900 mb-2">Интерактивный график</p>
                      <p className="text-xs sm:text-sm text-blue-700 max-w-xs mx-auto">
                        Линейный график с зумом и прогнозами на основе ML
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="flex-1 min-w-[320px] shadow-lg border-0 bg-white/90 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Просмотры и выручка
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Статистика просмотров и выручки с ML прогнозами
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="min-h-[320px] md:min-h-[360px] lg:min-h-[420px] flex items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-green-50 rounded-xl border border-green-100">
                    <div className="text-center p-4">
                      <div className="p-4 bg-green-100 rounded-full w-fit mx-auto mb-4">
                        <TrendingUp className="h-8 w-8 sm:h-12 sm:w-12 text-green-600" />
                      </div>
                      <p className="text-base sm:text-lg font-semibold text-green-900 mb-2">ML Прогнозирование</p>
                      <p className="text-xs sm:text-sm text-green-700 max-w-xs mx-auto">
                        Алгоритмы машинного обучения для предсказаний
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* KPI карточки внутри таба Тренды */}
            <div className="flex flex-wrap gap-4 lg:gap-6">
              <Card className="flex-1 min-w-[220px] lg:min-w-[240px] bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium text-blue-800">Всего пользователей</CardTitle>
                  <div className="p-2 bg-blue-200 rounded-full">
                    <Users className="h-4 w-4 text-blue-700" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl lg:text-3xl font-bold text-blue-900 mb-2">{formatNumber(kpiData.totalUsers)}</div>
                  <div className="flex items-center text-xs text-blue-700">
                    {getTrendIcon(5.2)}
                    <span className="ml-1 font-medium">+5.2% за месяц</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="flex-1 min-w-[220px] lg:min-w-[240px] bg-gradient-to-br from-green-50 via-green-100 to-green-50 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium text-green-800">Всего объявлений</CardTitle>
                  <div className="p-2 bg-green-200 rounded-full">
                    <Car className="h-4 w-4 text-green-700" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl lg:text-3xl font-bold text-green-900 mb-2">{formatNumber(kpiData.totalAds)}</div>
                  <div className="flex items-center text-xs text-green-700">
                    {getTrendIcon(3.1)}
                    <span className="ml-1 font-medium">+3.1% за месяц</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="flex-1 min-w-[220px] lg:min-w-[240px] bg-gradient-to-br from-purple-50 via-purple-100 to-purple-50 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium text-purple-800">Всего просмотров</CardTitle>
                  <div className="p-2 bg-purple-200 rounded-full">
                    <Eye className="h-4 w-4 text-purple-700" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl lg:text-3xl font-bold text-purple-900 mb-2">{formatNumber(kpiData.totalViews)}</div>
                  <div className="flex items-center text-xs text-purple-700">
                    {getTrendIcon(12.5)}
                    <span className="ml-1 font-medium">+12.5% за месяц</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="flex-1 min-w-[220px] lg:min-w-[240px] bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50 border-orange-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium text-orange-800">Средняя цена</CardTitle>
                  <div className="p-2 bg-orange-200 rounded-full">
                    <DollarSign className="h-4 w-4 text-orange-700" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl lg:text-3xl font-bold text-orange-900 mb-2">{formatCurrency(kpiData.avgPrice)}</div>
                  <div className="flex items-center text-xs text-orange-700">
                    {getTrendIcon(-2.1)}
                    <span className="ml-1 font-medium">-2.1% за месяц</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-wrap gap-4 lg:gap-6">
              <Card className="flex-1 min-w-[320px] shadow-lg border-0 bg-white/90 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="h-5 w-5 text-blue-600" />
                    Активность пользователей
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Динамика активности за выбранный период
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="min-h-[320px] md:min-h-[360px] lg:min-h-[420px] flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-blue-50 rounded-xl border border-blue-100">
                    <div className="text-center p-4">
                      <div className="p-4 bg-blue-100 rounded-full w-fit mx-auto mb-4">
                        <Activity className="h-8 w-8 sm:h-12 sm:w-12 text-blue-600" />
                      </div>
                      <p className="text-base sm:text-lg font-semibold text-blue-900 mb-2">Интерактивный график</p>
                      <p className="text-xs sm:text-sm text-blue-700 max-w-xs mx-auto">
                        Линейный график с зумом и прогнозами на основе ML
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="flex-1 min-w-[320px] shadow-lg border-0 bg-white/90 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Просмотры и выручка
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Статистика просмотров и выручки с ML прогнозами
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="min-h-[320px] md:min-h-[360px] lg:min-h-[420px] flex items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-green-50 rounded-xl border border-green-100">
                    <div className="text-center p-4">
                      <div className="p-4 bg-green-100 rounded-full w-fit mx-auto mb-4">
                        <TrendingUp className="h-8 w-8 sm:h-12 sm:w-12 text-green-600" />
                      </div>
                      <p className="text-base sm:text-lg font-semibold text-green-900 mb-2">ML Прогнозирование</p>
                      <p className="text-xs sm:text-sm text-green-700 max-w-xs mx-auto">
                        Алгоритмы машинного обучения для предсказаний
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="distribution" className="space-y-4 mt-6">
            <div className="flex flex-wrap gap-4 lg:gap-6">
              <Card className="flex-1 min-w-[320px] shadow-lg border-0 bg-white/90 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5 text-purple-600" />
                    Популярные бренды
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Распределение объявлений по брендам
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="min-h-[320px] md:min-h-[360px] lg:min-h-[420px] flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 rounded-xl border border-purple-100">
                    <div className="text-center p-4">
                      <div className="p-4 bg-purple-100 rounded-full w-fit mx-auto mb-4">
                        <Target className="h-8 w-8 sm:h-12 sm:w-12 text-purple-600" />
                      </div>
                      <p className="text-base sm:text-lg font-semibold text-purple-900 mb-2">Круговая диаграмма</p>
                      <p className="text-xs sm:text-sm text-purple-700 max-w-xs mx-auto">
                        Интерактивные сегменты с процентами и анимацией
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="flex-1 min-w-[320px] shadow-lg border-0 bg-white/90 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="h-5 w-5 text-orange-600" />
                    Активность по регионам
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Количество объявлений по регионам
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="min-h-[320px] md:min-h-[360px] lg:min-h-[420px] flex items-center justify-center bg-gradient-to-br from-orange-50 via-red-50 to-orange-50 rounded-xl border border-orange-100">
                    <div className="text-center p-4">
                      <div className="p-4 bg-orange-100 rounded-full w-fit mx-auto mb-4">
                        <BarChart3 className="h-8 w-8 sm:h-12 sm:w-12 text-orange-600" />
                      </div>
                      <p className="text-base sm:text-lg font-semibold text-orange-900 mb-2">Столбчатая диаграмма</p>
                      <p className="text-xs sm:text-sm text-orange-700 max-w-xs mx-auto">
                        Сортировка, фильтрация и детализация
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4 mt-6">
            <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Zap className="h-5 w-5 text-cyan-600" />
                  Сравнительная аналитика
                </CardTitle>
                <CardDescription className="text-sm">
                  Сравнение показателей за разные периоды
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="min-h-[360px] md:min-h-[420px] lg:min-h-[480px] flex items-center justify-center bg-gradient-to-br from-cyan-50 via-blue-50 to-cyan-50 rounded-xl border border-cyan-100">
                  <div className="text-center p-6">
                    <div className="p-4 bg-cyan-100 rounded-full w-fit mx-auto mb-4">
                      <Zap className="h-10 w-10 sm:h-12 sm:w-12 text-cyan-600" />
                    </div>
                    <p className="text-lg sm:text-xl font-semibold text-cyan-900 mb-3">Система сравнений</p>
                    <p className="text-sm sm:text-base text-cyan-700 max-w-md mx-auto">
                      Сравнение периодов, регионов, категорий с интерактивными элементами
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="forecasts" className="space-y-4 mt-6">
            <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="h-5 w-5 text-indigo-600" />
                  ML Прогнозирование
                </CardTitle>
                <CardDescription className="text-sm">
                  Прогнозы на основе машинного обучения
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="min-h-[360px] md:min-h-[420px] lg:min-h-[480px] flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-indigo-50 rounded-xl border border-indigo-100">
                  <div className="text-center p-6">
                    <div className="p-4 bg-indigo-100 rounded-full w-fit mx-auto mb-4">
                      <Activity className="h-10 w-10 sm:h-12 sm:w-12 text-indigo-600" />
                    </div>
                    <p className="text-lg sm:text-xl font-semibold text-indigo-900 mb-3">Система прогнозирования</p>
                    <p className="text-sm sm:text-base text-indigo-700 max-w-md mx-auto">
                      4 алгоритма ML для предсказаний с высокой точностью
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>
  );
};

export default SimpleEnhancedAnalyticsPage;
