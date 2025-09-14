/**
 * Диагностика производительности и кеширования
 */

interface PerformanceMetric {
  url: string;
  method: string;
  startTime: number;
  endTime: number;
  duration: number;
  cached: boolean;
  size?: number;
}

class PerformanceDiagnostics {
  private metrics: PerformanceMetric[] = [];
  private originalFetch: typeof fetch;

  constructor() {
    this.originalFetch = window.fetch;
    this.interceptFetch();
  }

  private interceptFetch() {
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method || 'GET';
      const startTime = performance.now();

      console.log(`🚀 [Performance] Starting request: ${method} ${url}`);

      try {
        const response = await this.originalFetch(input, init);
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Проверяем, был ли ответ из кеша
        const cached = response.headers.get('cf-cache-status') === 'HIT' || 
                      response.headers.get('x-cache') === 'HIT' ||
                      response.headers.get('cache-control')?.includes('max-age');

        const size = response.headers.get('content-length') ? 
                    parseInt(response.headers.get('content-length')!) : undefined;

        const metric: PerformanceMetric = {
          url,
          method,
          startTime,
          endTime,
          duration,
          cached,
          size
        };

        this.metrics.push(metric);

        // Логируем результат
        const cacheStatus = cached ? '🎯 CACHED' : '🌐 NETWORK';
        const sizeInfo = size ? ` (${(size / 1024).toFixed(1)}KB)` : '';
        console.log(`${cacheStatus} [Performance] ${method} ${url} - ${duration.toFixed(0)}ms${sizeInfo}`);

        // Предупреждение о медленных запросах
        if (duration > 1000) {
          console.warn(`⚠️ [Performance] SLOW REQUEST: ${url} took ${duration.toFixed(0)}ms`);
        }

        return response;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        console.error(`❌ [Performance] FAILED: ${method} ${url} - ${duration.toFixed(0)}ms`, error);
        throw error;
      }
    };
  }

  getMetrics() {
    return this.metrics;
  }

  getSlowRequests(threshold = 1000) {
    return this.metrics.filter(m => m.duration > threshold);
  }

  getCacheStats() {
    const total = this.metrics.length;
    const cached = this.metrics.filter(m => m.cached).length;
    const cacheHitRate = total > 0 ? (cached / total) * 100 : 0;

    return {
      total,
      cached,
      network: total - cached,
      cacheHitRate: cacheHitRate.toFixed(1) + '%'
    };
  }

  getReferenceDataStats() {
    const referenceRequests = this.metrics.filter(m => 
      m.url.includes('/reference/') || m.url.includes('/api/public/reference/')
    );

    const stats = referenceRequests.reduce((acc, metric) => {
      const type = this.extractReferenceType(metric.url);
      if (!acc[type]) {
        acc[type] = { count: 0, totalTime: 0, cached: 0 };
      }
      acc[type].count++;
      acc[type].totalTime += metric.duration;
      if (metric.cached) acc[type].cached++;
      return acc;
    }, {} as Record<string, { count: number; totalTime: number; cached: number }>);

    return Object.entries(stats).map(([type, data]) => ({
      type,
      requests: data.count,
      avgTime: Math.round(data.totalTime / data.count),
      cacheHitRate: Math.round((data.cached / data.count) * 100) + '%'
    }));
  }

  private extractReferenceType(url: string): string {
    if (url.includes('brands')) return 'brands';
    if (url.includes('models')) return 'models';
    if (url.includes('vehicle-types')) return 'vehicle-types';
    if (url.includes('colors')) return 'colors';
    if (url.includes('regions')) return 'regions';
    if (url.includes('cities')) return 'cities';
    return 'other';
  }

  printReport() {
    console.group('📊 PERFORMANCE REPORT');
    
    const cacheStats = this.getCacheStats();
    console.log('🎯 Cache Statistics:', cacheStats);
    
    const slowRequests = this.getSlowRequests();
    if (slowRequests.length > 0) {
      console.warn('⚠️ Slow Requests (>1s):', slowRequests);
    }
    
    const referenceStats = this.getReferenceDataStats();
    console.log('📚 Reference Data Performance:', referenceStats);
    
    console.groupEnd();
  }

  clear() {
    this.metrics = [];
  }

  restore() {
    window.fetch = this.originalFetch;
  }
}

// Singleton instance
export const performanceDiagnostics = new PerformanceDiagnostics();

// Автоматический отчет каждые 30 секунд в dev режиме
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    if (performanceDiagnostics.getMetrics().length > 0) {
      performanceDiagnostics.printReport();
    }
  }, 30000);
}

/**
 * Хук для мониторинга производительности
 */
export function usePerformanceMonitor() {
  return {
    getMetrics: () => performanceDiagnostics.getMetrics(),
    getCacheStats: () => performanceDiagnostics.getCacheStats(),
    getReferenceStats: () => performanceDiagnostics.getReferenceDataStats(),
    getSlowRequests: (threshold?: number) => performanceDiagnostics.getSlowRequests(threshold),
    printReport: () => performanceDiagnostics.printReport(),
    clear: () => performanceDiagnostics.clear()
  };
}

/**
 * Компонент для отображения статистики производительности
 */
export function PerformanceStats() {
  const [stats, setStats] = React.useState<any>(null);
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setStats({
        cache: performanceDiagnostics.getCacheStats(),
        reference: performanceDiagnostics.getReferenceDataStats(),
        slow: performanceDiagnostics.getSlowRequests()
      });
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  if (!stats || process.env.NODE_ENV !== 'development') return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: 10,
      right: 10,
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <div><strong>🎯 Cache Hit Rate:</strong> {stats.cache.cacheHitRate}</div>
      <div><strong>📊 Total Requests:</strong> {stats.cache.total}</div>
      <div><strong>⚠️ Slow Requests:</strong> {stats.slow.length}</div>
      {stats.reference.map((ref: any) => (
        <div key={ref.type}>
          <strong>{ref.type}:</strong> {ref.avgTime}ms ({ref.cacheHitRate})
        </div>
      ))}
    </div>
  );
}

/**
 * Быстрая диагностика - вызовите в консоли
 */
(window as any).performanceReport = () => performanceDiagnostics.printReport();
(window as any).clearPerformanceMetrics = () => performanceDiagnostics.clear();
