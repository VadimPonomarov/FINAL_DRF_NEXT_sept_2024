/**
 * Утилиты для подготовки данных для Chart.js
 */

// Цветовая палитра для графиков
export const CHART_COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  accent: '#F59E0B',
  danger: '#EF4444',
  warning: '#F97316',
  info: '#06B6D4',
  success: '#22C55E',
  purple: '#8B5CF6',
  pink: '#EC4899',
  indigo: '#6366F1',
};

export const CHART_COLOR_PALETTE = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#22C55E', '#6366F1',
  '#84CC16', '#F43F5E', '#14B8A6', '#A855F7', '#EAB308'
];

// Интерфейсы для данных
interface AnalyticsData {
  metrics?: any;
  charts?: any;
  platform_overview?: any;
  top_makes?: any[];
  regional_stats?: any[];
  seller_stats?: any[];
  price_stats?: any;
}

interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
  yAxisID?: string;
}

interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

/**
 * Подготовка данных для графика распределения цен
 */
export const preparePriceDistributionData = (analyticsData: AnalyticsData): ChartData => {
  // Если есть готовые данные из Plotly
  if (analyticsData.charts?.price_distribution) {
    try {
      const plotlyData = JSON.parse(analyticsData.charts.price_distribution);
      const trace = plotlyData.data[0];
      
      return {
        labels: trace.x || [],
        datasets: [{
          label: 'Количество объявлений',
          data: trace.y || [],
          backgroundColor: CHART_COLORS.primary + '80',
          borderColor: CHART_COLORS.primary,
          borderWidth: 1,
        }]
      };
    } catch (e) {
      console.warn('Error parsing Plotly price distribution data:', e);
    }
  }
  
  // Fallback - создаем примерные данные
  const priceRanges = ['0-10k', '10k-20k', '20k-30k', '30k-40k', '40k-50k', '50k+'];
  const counts = [12, 18, 15, 8, 2, 1]; // Примерные данные
  
  return {
    labels: priceRanges,
    datasets: [{
      label: 'Количество объявлений',
      data: counts,
      backgroundColor: CHART_COLORS.primary + '80',
      borderColor: CHART_COLORS.primary,
      borderWidth: 1,
    }]
  };
};

/**
 * Подготовка данных для графика ТОП марок
 */
export const prepareTopBrandsData = (analyticsData: AnalyticsData): ChartData => {
  let brands: any[] = [];
  
  // Пробуем получить данные из разных источников
  if (analyticsData.charts?.top_brands) {
    try {
      const plotlyData = JSON.parse(analyticsData.charts.top_brands);
      const trace = plotlyData.data[0];
      brands = trace.y?.map((brand: string, index: number) => ({
        mark__name: brand,
        count: trace.x?.[index] || 0
      })) || [];
    } catch (e) {
      console.warn('Error parsing Plotly top brands data:', e);
    }
  } else if (analyticsData.top_makes) {
    brands = analyticsData.top_makes;
  }
  
  // Fallback данные
  if (brands.length === 0) {
    brands = [
      { mark__name: 'BMW', count: 16 },
      { mark__name: 'Audi', count: 5 },
      { mark__name: 'Ford', count: 5 },
      { mark__name: 'Mercedes-Benz', count: 4 },
      { mark__name: 'Toyota', count: 3 }
    ];
  }
  
  const labels = brands.map(brand => brand.mark__name || 'Unknown').slice(0, 10);
  const data = brands.map(brand => brand.count || 0).slice(0, 10);
  
  return {
    labels,
    datasets: [{
      label: 'Количество объявлений',
      data,
      backgroundColor: CHART_COLOR_PALETTE.slice(0, labels.length),
      borderColor: CHART_COLOR_PALETTE.slice(0, labels.length),
      borderWidth: 1,
    }]
  };
};

/**
 * Подготовка данных для графика по регионам
 */
export const prepareRegionalStatsData = (analyticsData: AnalyticsData): ChartData => {
  let regions: any[] = [];
  
  if (analyticsData.charts?.regional_stats) {
    try {
      const plotlyData = JSON.parse(analyticsData.charts.regional_stats);
      const trace = plotlyData.data[0];
      regions = trace.labels?.map((region: string, index: number) => ({
        region: region,
        ads_count: trace.values?.[index] || 0
      })) || [];
    } catch (e) {
      console.warn('Error parsing Plotly regional data:', e);
    }
  } else if (analyticsData.regional_stats) {
    regions = analyticsData.regional_stats;
  }
  
  // Fallback данные
  if (regions.length === 0) {
    regions = [
      { region: 'Київська область', ads_count: 15 },
      { region: 'Запорізька область', ads_count: 9 },
      { region: 'Харківська область', ads_count: 8 },
      { region: 'Львівська область', ads_count: 6 },
      { region: 'Одеська область', ads_count: 4 }
    ];
  }
  
  const labels = regions.map(region => region.region || 'Unknown').slice(0, 10);
  const data = regions.map(region => region.ads_count || 0).slice(0, 10);
  
  return {
    labels,
    datasets: [{
      label: 'Количество объявлений',
      data,
      backgroundColor: CHART_COLOR_PALETTE.slice(0, labels.length),
      borderColor: CHART_COLOR_PALETTE.slice(0, labels.length),
      borderWidth: 2,
    }]
  };
};

/**
 * Подготовка данных для графика месячных трендов
 */
export const prepareMonthlyTrendsData = (analyticsData: AnalyticsData): ChartData => {
  // Создаем примерные данные для демонстрации
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн'];
  const adsCount = [45, 52, 48, 61, 55, 67];
  const avgPrice = [28000, 29500, 27800, 31200, 30100, 32500];
  
  return {
    labels: months,
    datasets: [
      {
        label: 'Количество объявлений',
        data: adsCount,
        backgroundColor: CHART_COLORS.primary + '20',
        borderColor: CHART_COLORS.primary,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        yAxisID: 'y',
      },
      {
        label: 'Средняя цена ($)',
        data: avgPrice,
        backgroundColor: CHART_COLORS.secondary + '20',
        borderColor: CHART_COLORS.secondary,
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        yAxisID: 'y1',
      }
    ]
  };
};

/**
 * Подготовка данных для графика типов продавцов
 */
export const prepareSellerTypesData = (analyticsData: AnalyticsData): ChartData => {
  let sellerStats: any[] = [];
  
  if (analyticsData.seller_stats) {
    sellerStats = analyticsData.seller_stats;
  }
  
  // Fallback данные
  if (sellerStats.length === 0) {
    sellerStats = [
      { seller_type: 'private', count: 45 },
      { seller_type: 'dealer', count: 11 }
    ];
  }
  
  const labels = sellerStats.map(stat => {
    const type = stat.seller_type || 'unknown';
    return type === 'private' ? 'Частные' : 
           type === 'dealer' ? 'Дилеры' : 
           'Другие';
  });
  const data = sellerStats.map(stat => stat.count || 0);
  
  return {
    labels,
    datasets: [{
      label: 'Количество объявлений',
      data,
      backgroundColor: [CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.accent],
      borderColor: [CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.accent],
      borderWidth: 2,
    }]
  };
};

/**
 * Подготовка данных для корреляционного графика
 */
export const preparePriceYearCorrelationData = (analyticsData: AnalyticsData): ChartData => {
  // Создаем примерные данные для демонстрации корреляции
  const dataPoints = [
    { x: 2010, y: 15000 },
    { x: 2012, y: 18000 },
    { x: 2014, y: 22000 },
    { x: 2016, y: 28000 },
    { x: 2018, y: 35000 },
    { x: 2020, y: 42000 },
    { x: 2022, y: 48000 },
    { x: 2024, y: 55000 }
  ];
  
  return {
    labels: [], // Не используется для scatter plot
    datasets: [{
      label: 'Цена vs Год выпуска',
      data: dataPoints,
      backgroundColor: CHART_COLORS.primary + '60',
      borderColor: CHART_COLORS.primary,
      borderWidth: 1,
    }]
  };
};

/**
 * Получение конфигурации для анимации графиков
 */
export const getChartAnimationConfig = () => ({
  animation: {
    duration: 1000,
    easing: 'easeInOutQuart' as const,
  },
  hover: {
    animationDuration: 300,
  },
  responsiveAnimationDuration: 500,
});

/**
 * Получение общих настроек для всех графиков
 */
export const getCommonChartOptions = () => ({
  responsive: true,
  maintainAspectRatio: false,
  ...getChartAnimationConfig(),
  plugins: {
    legend: {
      labels: {
        usePointStyle: true,
        padding: 20,
      },
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#fff',
      bodyColor: '#fff',
      borderColor: '#333',
      borderWidth: 1,
      cornerRadius: 8,
      displayColors: true,
    },
  },
});
