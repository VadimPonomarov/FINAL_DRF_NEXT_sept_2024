/**
 * Сервис для работы со статистикой
 */
import { apiClient } from './api';

export interface GeneralStats {
  total_ads: number;
  active_ads: number;
  favorite_ads: number;
}

export interface MakeStats {
  mark__name: string;
  count: number;
}

export interface PriceStats {
  min_price: number;
  max_price: number;
  avg_price: number;
}

export interface YearStats {
  min_year: number;
  max_year: number;
  avg_year: number;
  count: number;
}

export interface MileageStats {
  min_mileage: number;
  max_mileage: number;
  avg_mileage: number;
  count: number;
}

export interface RegionStats {
  region: string;
  count: number;
}

export interface SellerStats {
  seller_type: string;
  count: number;
}

export interface CurrencyStats {
  currency: string;
  count: number;
}

export interface DailyActivity {
  day: string;
  count: number;
}

export interface DetailedStatistics {
  general: GeneralStats;
  top_makes: MakeStats[];
  price_stats: PriceStats;
  year_stats: YearStats;
  mileage_stats: MileageStats;
  top_regions: RegionStats[];
  seller_stats: SellerStats[];
  currency_stats: CurrencyStats[];
  daily_activity: DailyActivity[];
}

export interface StatisticsResponse {
  success: boolean;
  data: DetailedStatistics;
  error?: string;
}

class StatisticsService {
  /**
   * Получить детальную статистику
   * Доступно только премиум пользователям и суперпользователям
   */
  async getDetailedStatistics(): Promise<StatisticsResponse> {
    try {
      console.log('[StatisticsService] 📊 Fetching platform statistics...');

      // Используем Next.js API route вместо прямого запроса к backend
      const response = await fetch('/api/ads/platform-statistics', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}`);
      }

      console.log('[StatisticsService] ✅ Statistics fetched successfully');
      return result;
    } catch (error: any) {
      console.error('Error fetching detailed statistics:', error);
      
      if (error.response?.status === 403) {
        return {
          success: false,
          data: {} as DetailedStatistics,
          error: 'Access denied. Premium subscription required.'
        };
      }
      
      return {
        success: false,
        data: {} as DetailedStatistics,
        error: error.response?.data?.error || 'Failed to fetch statistics'
      };
    }
  }

  /**
   * Форматировать число с разделителями тысяч
   */
  formatNumber(num: number): string {
    return new Intl.NumberFormat('uk-UA').format(num);
  }

  /**
   * Форматировать цену
   */
  formatPrice(price: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'UAH',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  }

  /**
   * Форматировать процент
   */
  formatPercent(value: number, total: number): string {
    if (total === 0) return '0%';
    const percent = (value / total) * 100;
    return `${percent.toFixed(1)}%`;
  }

  /**
   * Получить цвет для графика по индексу
   */
  getChartColor(index: number): string {
    const colors = [
      '#3B82F6', // blue
      '#EF4444', // red
      '#10B981', // green
      '#F59E0B', // yellow
      '#8B5CF6', // purple
      '#EC4899', // pink
      '#06B6D4', // cyan
      '#84CC16', // lime
      '#F97316', // orange
      '#6B7280'  // gray
    ];
    return colors[index % colors.length];
  }
}

export const statisticsService = new StatisticsService();
