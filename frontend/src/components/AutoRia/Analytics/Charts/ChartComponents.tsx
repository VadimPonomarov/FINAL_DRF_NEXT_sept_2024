'use client';

import React, { Suspense, lazy } from 'react';
import { useI18n } from '@/contexts/I18nContext';

// Динамические импорты для Chart.js компонентов
const ChartComponents = lazy(async () => {
  // Загружаем Chart.js и react-chartjs-2 динамически
  await import('chart.js/auto');
  const { Line, Bar, Pie, Doughnut, Scatter } = await import('react-chartjs-2');

  return {
    default: {
      Line,
      Bar,
      Pie,
      Doughnut,
      Scatter
    }
  };
});

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

// График распределения цен
export const PriceDistributionChart: React.FC<ChartProps> = ({ data, options, className }) => {
  const { t } = useI18n();
  const chartOptions = {
    ...commonOptions,
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
    scales: {
      x: {
        title: {
          display: true,
          text: t('autoria.analytics.price'),
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      y: {
        title: {
          display: true,
          text: t('autoria.analytics.adsQuantity'),
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
  };

  return (
    <div className={`w-full h-96 ${className}`}>
      <Bar data={data} options={chartOptions} />
    </div>
  );
};

// График ТОП марок
export const TopBrandsChart: React.FC<ChartProps> = ({ data, options, className }) => {
  const { t } = useI18n();
  const chartOptions = {
    ...commonOptions,
    ...options,
    indexAxis: 'y' as const,
    plugins: {
      ...commonOptions.plugins,
      title: {
        display: true,
        text: t('autoria.analytics.topBrands'),
        font: {
          size: 16,
          weight: 'bold',
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: t('autoria.analytics.adsQuantity'),
        },
      },
      y: {
        title: {
          display: true,
          text: t('autoria.analytics.brand'),
        },
      },
    },
  };

  return (
    <div className={`w-full h-96 ${className}`}>
      <Bar data={data} options={chartOptions} />
    </div>
  );
};

// Круговая диаграмма по регионам
export const RegionalStatsChart: React.FC<ChartProps> = ({ data, options, className }) => {
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    ...options,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      title: {
        display: true,
        text: 'Распределение по регионам',
        font: {
          size: 16,
          weight: 'bold',
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
  };

  return (
    <div className={`w-full h-96 ${className}`}>
      <Pie data={data} options={chartOptions} />
    </div>
  );
};

// График месячных трендов
export const MonthlyTrendsChart: React.FC<ChartProps> = ({ data, options, className }) => {
  const { t } = useI18n();
  const chartOptions = {
    ...commonOptions,
    ...options,
    plugins: {
      ...commonOptions.plugins,
      title: {
        display: true,
        text: t('autoria.analytics.monthlyTrends'),
        font: {
          size: 16,
          weight: 'bold',
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: t('autoria.analytics.month'),
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      y: {
        title: {
          display: true,
          text: t('autoria.analytics.adsQuantity'),
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: `${t('autoria.analytics.averagePrice')} ($)`,
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  return (
    <div className={`w-full h-96 ${className}`}>
      <Line data={data} options={chartOptions} />
    </div>
  );
};

// Диаграмма типов продавцов
export const SellerTypesChart: React.FC<ChartProps> = ({ data, options, className }) => {
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    ...options,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: true,
        text: 'Типы продавцов',
        font: {
          size: 16,
          weight: 'bold',
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
  };

  return (
    <div className={`w-full h-80 ${className}`}>
      <Doughnut data={data} options={chartOptions} />
    </div>
  );
};

// Корреляционный график цена-год
export const PriceYearCorrelationChart: React.FC<ChartProps> = ({ data, options, className }) => {
  const chartOptions = {
    ...commonOptions,
    ...options,
    plugins: {
      ...commonOptions.plugins,
      title: {
        display: true,
        text: 'Корреляция цены и года выпуска',
        font: {
          size: 16,
          weight: 'bold',
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Год выпуска',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Цена ($)',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
  };

  return (
    <div className={`w-full h-96 ${className}`}>
      <Scatter data={data} options={chartOptions} />
    </div>
  );
};
