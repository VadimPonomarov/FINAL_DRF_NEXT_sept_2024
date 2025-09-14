'use client';

import React, { Suspense, lazy } from 'react';
import { useI18n } from '@/contexts/I18nContext';

// Заглушка для загрузки
const ChartSkeleton = () => (
  <div className="w-full h-64 bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
    <div className="text-gray-500">Loading chart...</div>
  </div>
);

interface ChartProps {
  data: any;
  options?: any;
  className?: string;
}

// Общие настройки для всех графиков
const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#fff',
      bodyColor: '#fff',
      borderColor: '#333',
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(0, 0, 0, 0.1)',
      },
    },
    y: {
      grid: {
        color: 'rgba(0, 0, 0, 0.1)',
      },
    },
  },
};

// Динамический импорт для Line Chart
const DynamicLineChart = lazy(async () => {
  await import('chart.js/auto');
  const { Line } = await import('react-chartjs-2');
  
  return {
    default: ({ data, options, className }: ChartProps) => (
      <div className={className}>
        <Line data={data} options={{ ...commonOptions, ...options }} />
      </div>
    )
  };
});

// Динамический импорт для Bar Chart
const DynamicBarChart = lazy(async () => {
  await import('chart.js/auto');
  const { Bar } = await import('react-chartjs-2');
  
  return {
    default: ({ data, options, className }: ChartProps) => (
      <div className={className}>
        <Bar data={data} options={{ ...commonOptions, ...options }} />
      </div>
    )
  };
});

// Динамический импорт для Pie Chart
const DynamicPieChart = lazy(async () => {
  await import('chart.js/auto');
  const { Pie } = await import('react-chartjs-2');
  
  return {
    default: ({ data, options, className }: ChartProps) => (
      <div className={className}>
        <Pie data={data} options={{ ...commonOptions, ...options }} />
      </div>
    )
  };
});

// Динамический импорт для Doughnut Chart
const DynamicDoughnutChart = lazy(async () => {
  await import('chart.js/auto');
  const { Doughnut } = await import('react-chartjs-2');
  
  return {
    default: ({ data, options, className }: ChartProps) => (
      <div className={className}>
        <Doughnut data={data} options={{ ...commonOptions, ...options }} />
      </div>
    )
  };
});

// График распределения цен
export const PriceDistributionChart: React.FC<ChartProps> = ({ data, options, className }) => {
  const { t } = useI18n();
  const chartOptions = {
    ...options,
    plugins: {
      ...commonOptions.plugins,
      title: {
        display: true,
        text: t('autoria.analytics.priceDistributionTitle'),
        font: {
          size: 16,
          weight: 'bold',
        },
      },
    },
  };

  return (
    <Suspense fallback={<ChartSkeleton />}>
      <DynamicBarChart data={data} options={chartOptions} className={className} />
    </Suspense>
  );
};

// График популярности брендов
export const BrandPopularityChart: React.FC<ChartProps> = ({ data, options, className }) => {
  const { t } = useI18n();
  const chartOptions = {
    ...options,
    plugins: {
      ...commonOptions.plugins,
      title: {
        display: true,
        text: t('autoria.analytics.brandPopularityTitle'),
        font: {
          size: 16,
          weight: 'bold',
        },
      },
    },
  };

  return (
    <Suspense fallback={<ChartSkeleton />}>
      <DynamicPieChart data={data} options={chartOptions} className={className} />
    </Suspense>
  );
};

// График динамики продаж
export const SalesTrendChart: React.FC<ChartProps> = ({ data, options, className }) => {
  const { t } = useI18n();
  const chartOptions = {
    ...options,
    plugins: {
      ...commonOptions.plugins,
      title: {
        display: true,
        text: t('autoria.analytics.salesTrendTitle'),
        font: {
          size: 16,
          weight: 'bold',
        },
      },
    },
  };

  return (
    <Suspense fallback={<ChartSkeleton />}>
      <DynamicLineChart data={data} options={chartOptions} className={className} />
    </Suspense>
  );
};

// График региональной статистики
export const RegionalStatsChart: React.FC<ChartProps> = ({ data, options, className }) => {
  const { t } = useI18n();
  const chartOptions = {
    ...options,
    plugins: {
      ...commonOptions.plugins,
      title: {
        display: true,
        text: t('autoria.analytics.regionalStatsTitle'),
        font: {
          size: 16,
          weight: 'bold',
        },
      },
    },
  };

  return (
    <Suspense fallback={<ChartSkeleton />}>
      <DynamicDoughnutChart data={data} options={chartOptions} className={className} />
    </Suspense>
  );
};

// Экспорт всех компонентов
export {
  DynamicLineChart as LineChart,
  DynamicBarChart as BarChart,
  DynamicPieChart as PieChart,
  DynamicDoughnutChart as DoughnutChart
};
