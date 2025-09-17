"use client";

import React, { useMemo } from "react";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Activity, TrendingUp, Users, Car, Eye, DollarSign, Target, Zap, Calendar as CalendarIcon } from "lucide-react";
// Charts
import { PriceDistributionChart, TopBrandsChart, MonthlyTrendsChart } from "@/components/AutoRia/Analytics/Charts/ChartComponents";
import { Line } from "react-chartjs-2";
import { useI18n } from '@/contexts/I18nContext';

// Регистрация Chart.js компонентов
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface AnalyticsTabContentProps {
  filters: Record<string, any>;
  results: any[];
  loading?: boolean;
}

const numberFmt = (n: number) => new Intl.NumberFormat("uk-UA").format(Math.max(0, Math.floor(n || 0)));

export default function AnalyticsTabContent({ filters, results, loading }: AnalyticsTabContentProps) {
  const { t } = useI18n();
  // Простая агрегация поверх текущей выдачи (как сигнал; реальные графики подключим к API)
  const total = results?.length || 0;
  const avgPrice = (() => {
    const prices = (results || []).map((r: any) => r.price_usd || r.price || 0).filter(Boolean);
    if (!prices.length) return 0;
    return Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  })();

  const viewsSum = (results || []).reduce((acc: number, r: any) => acc + (r.views_count || r.view_count || 0), 0);

  const [dateFrom, setDateFrom] = React.useState<Date | undefined>();

  const topBrandsData = useMemo(() => {
    const counts: Record<string, number> = {};
    (results || []).forEach((r: any) => {
      const brand = r?.mark?.name || r?.mark_name || r?.brand || '—';
      counts[brand] = (counts[brand] || 0) + 1;
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    return {
      labels: top.map(([l]) => String(l)),
      datasets: [{
        label: t('autoria.analytics.adsCount'),
        data: top.map(([, v]) => v as number),
        backgroundColor: 'rgba(59,130,246,0.5)',
        borderColor: '#3B82F6',
        borderWidth: 1,
      }]
    };
  }, [results]);

  const monthlyTrendsData = useMemo(() => {
    const map: Record<string, { count: number; sum: number; n: number }> = {};
    (results || []).forEach((r: any) => {
      const created = r?.created_at || r?.createdAt;
      if (!created) return;
      const month = String(created).slice(0, 7);
      const price = Number(r?.price_usd || r?.price || 0) || 0;
      if (!map[month]) map[month] = { count: 0, sum: 0, n: 0 };
      map[month].count += 1;
      if (price > 0) { map[month].sum += price; map[month].n += 1; }
    });
    const labels = Object.keys(map).sort();
    const counts = labels.map(l => map[l].count);
    const avgs = labels.map(l => map[l].n ? Math.round(map[l].sum / map[l].n) : 0);
    return {
      labels,
      datasets: [
        {
          label: t('autoria.analytics.ads'),
          data: counts,
          borderColor: '#10B981',
          backgroundColor: 'rgba(16,185,129,0.2)',
          tension: 0.25,
          fill: true,
          yAxisID: 'y',
        },
        {
          label: `${t('autoria.analytics.averagePrice')} ($)`,
          data: avgs,
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245,158,11,0.2)',
          tension: 0.25,
          fill: false,
          yAxisID: 'y1',
        }
      ]
    };
  }, [results]);

  const [dateTo, setDateTo] = React.useState<Date | undefined>();

      // Заменяем заглушки: показываем реальные графики

  const [analyticsTab, setAnalyticsTab] = React.useState<string>('trends');

  // Данные из API для таймсерии
  const [series, setSeries] = React.useState<{ x: string[]; y: number[] }>({ x: [], y: [] });

  React.useEffect(() => {
    // Динамический импорт Chart.js для избежания проблем с HMR
    import('chart.js/auto').catch(console.error);

    try {
      const params = new URLSearchParams();
      const add = (k: string, v: any) => { if (v !== undefined && v !== null && String(v) !== '') params.set(k, String(v)); };
      // маппинг доступных фильтров в API
      add('vehicle_type', filters?.vehicle_type);
      add('mark_id', filters?.brand || filters?.mark);
      add('model', filters?.model);
      add('condition', filters?.condition);
      add('year_from', filters?.year_from);
      add('year_to', filters?.year_to);
      add('price_min', filters?.price_from);
      add('price_max', filters?.price_to);
      const qs = params.toString();
      fetch(`/api/ads/analytics/search/series${qs ? `?${qs}` : ''}`, { cache: 'no-store' })
        .then(r => r.json())
        .then((data) => {
          const ts = data?.series?.timeseries || data?.timeseries || {};
          if (Array.isArray(ts.x) && Array.isArray(ts.y)) {
            setSeries({ x: ts.x, y: ts.y });
          } else {
            setSeries({ x: [], y: [] });
          }
        })
        .catch(() => setSeries({ x: [], y: [] }));
    } catch {
      setSeries({ x: [], y: [] });
    }
  }, [filters]);

  return (
    <div className="space-y-6">

      {/* Краткое резюме активных фильтров */}
      <Card className="shadow-sm border bg-card text-card-foreground">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {t('autoria.analytics.currentSelectionSummary')}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {t('autoria.analytics.filtersAppliedToAnalytics')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(filters)
              .filter(([k, v]) => typeof v !== "undefined" && v !== "" && v !== null)
              .slice(0, 12)
              .map(([k, v]) => (
                <Badge key={k} variant="outline" className="text-xs">
                  {k}: {String(v)}
                </Badge>
              ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {dateFrom ? dateFrom.toLocaleDateString() : t('autoria.analytics.fromDate')} — {dateTo ? dateTo.toLocaleDateString() : t('autoria.analytics.toDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2">
                <div className="flex gap-2">
                  <div>
                    <div className="text-xs mb-1 text-muted-foreground">С</div>
                    <Calendar selected={dateFrom} onSelect={setDateFrom} />
                  </div>
                  <div>
                    <div className="text-xs mb-1 text-muted-foreground">По</div>
                    <Calendar selected={dateTo} onSelect={setDateTo} />
                  </div>
                </div>
              </PopoverContent>
            </Popover>

          </div>
        </CardContent>
      </Card>

      {/* KPI карточки */}
      <div className="flex flex-wrap gap-4 lg:gap-6">
        <Card className="flex-1 min-w-[220px] bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-blue-800">{t('autoria.analytics.adsInSelection')}</CardTitle>
            <div className="p-2 bg-blue-200 rounded-full">
              <Car className="h-4 w-4 text-blue-700" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl lg:text-3xl font-bold text-blue-900 mb-2">{numberFmt(total)}</div>
          </CardContent>
        </Card>

        <Card className="flex-1 min-w-[220px] bg-gradient-to-br from-purple-50 via-purple-100 to-purple-50 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-purple-800">{t('autoria.analytics.totalViews')}</CardTitle>
            <div className="p-2 bg-purple-200 rounded-full">
              <Eye className="h-4 w-4 text-purple-700" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl lg:text-3xl font-bold text-purple-900 mb-2">{numberFmt(viewsSum)}</div>
          </CardContent>
        </Card>

        <Card className="flex-1 min-w-[220px] bg-gradient-to-br from-green-50 via-green-100 to-green-50 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-green-800">{t('autoria.analytics.averagePrice')}</CardTitle>
            <div className="p-2 bg-green-200 rounded-full">
              <DollarSign className="h-4 w-4 text-green-700" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl lg:text-3xl font-bold text-green-900 mb-2">${numberFmt(avgPrice)}</div>
          </CardContent>
        </Card>

        <Card className="flex-1 min-w-[220px] bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50 border-orange-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-orange-800">Активность пользователей</CardTitle>
            <div className="p-2 bg-orange-200 rounded-full">
              <Users className="h-4 w-4 text-orange-700" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl lg:text-3xl font-bold text-orange-900 mb-2">{numberFmt((viewsSum / (total || 1)) | 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Вкладки аналитики с контентом */}
      <Tabs value={analyticsTab} onValueChange={setAnalyticsTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="trends">{t('autoria.analytics.trends')}</TabsTrigger>
          <TabsTrigger value="distributions">{t('autoria.analytics.distributions')}</TabsTrigger>
          <TabsTrigger value="comparison">{t('autoria.analytics.comparison')}</TabsTrigger>
          <TabsTrigger value="forecasts">{t('autoria.analytics.forecasts')}</TabsTrigger>
        </TabsList>

        <TabsContent value="trends">
          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-blue-600" />
                {t('autoria.analytics.viewsDynamics')}
              </CardTitle>
              <CardDescription className="text-sm">{t('autoria.analytics.basedOnCurrentResults')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="min-h-[320px] md:min-h-[360px] lg:min-h-[420px]">
                {/* Простейшая линия по датам создания текущих результатов */}
                <Line
                  data={useMemo(() => {
                    // Используем серверную таймсерию, если доступна
                    if (series?.x?.length && series?.y?.length) {
                      return {
                        labels: series.x,
                        datasets: [{
                          label: t('autoria.analytics.adsPerDay'),
                          data: series.y,
                          borderColor: '#3B82F6',
                          backgroundColor: 'rgba(59,130,246,0.2)',
                          tension: 0.25,
                          fill: true,
                        }]
                      };
                    }
                    // Fallback: считаем по текущей выдаче
                    const byDay: Record<string, number> = {};
                    (results || []).forEach((r: any) => {
                      const d = (r.created_at || '').slice(0, 10);
                      if (!d) return;
                      byDay[d] = (byDay[d] || 0) + 1;
                    });
                    const labels = Object.keys(byDay).sort();
                    const values = labels.map(l => byDay[l]);
                    return {
                      labels,
                      datasets: [{
                        label: t('autoria.analytics.adsPerDay'),
                        data: values,
                        borderColor: '#3B82F6',
                        backgroundColor: 'rgba(59,130,246,0.2)',
                        tension: 0.25,
                        fill: true,
                      }]
                    };
                  }, [results, series])}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { x: { grid: { display: false } }, y: { beginAtZero: true } }
                  }}
                  className="h-[320px]"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distributions">
          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
                {t('autoria.analytics.priceDistribution')}
              </CardTitle>
              <CardDescription className="text-sm">{t('autoria.analytics.binsBuiltFromSelection')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="min-h-[320px] md:min-h-[360px] lg:min-h-[420px]">
                <PriceDistributionChart
                  data={useMemo(() => {
                    const prices = (results || [])
                      .map((r: any) => r.price_usd || r.price || 0)
                      .filter((p: number) => typeof p === 'number' && p > 0)
                      .sort((a: number, b: number) => a - b);
                    if (prices.length === 0) return { labels: [], datasets: [{ label: t('autoria.analytics.noData'), data: [] }] };
                    const bins = 10;
                    const min = prices[0];
                    const max = prices[prices.length - 1];
                    const step = (max - min) / bins || 1;
                    const edges = Array.from({ length: bins + 1 }, (_, i) => Math.round(min + i * step));
                    const counts = Array(bins).fill(0);
                    for (const p of prices) {
                      const idx = Math.min(Math.floor((p - min) / step), bins - 1);
                      counts[idx]++;
                    }
                    const labels = Array.from({ length: bins }, (_, i) => `$${edges[i]}–$${edges[i + 1]}`);
                    return {
                      labels,
                      datasets: [{
                        label: t('autoria.analytics.adsCount'),
                        data: counts,
                        backgroundColor: 'rgba(16,185,129,0.5)',
                        borderColor: '#10B981',
                        borderWidth: 1,
                      }]
                    };
                  }, [results])}
                  options={{ maintainAspectRatio: false }}
                  className="h-[320px]"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison">
          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                {t('autoria.analytics.comparison')}
              </CardTitle>
              <CardDescription className="text-sm">{t('autoria.analytics.brandComparison')}</CardDescription>
            </CardHeader>
            <CardContent>
              <TopBrandsChart data={topBrandsData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecasts">
          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                {t('autoria.analytics.forecasts')}
              </CardTitle>
              <CardDescription className="text-sm">{t('autoria.analytics.mlForecastsPricesAndDemand')}</CardDescription>
            </CardHeader>
            <CardContent>
              <MonthlyTrendsChart data={monthlyTrendsData} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

