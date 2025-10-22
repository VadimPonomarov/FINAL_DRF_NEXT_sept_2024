import { CarAd, ModerationStats } from '../../api/autoria/autoria.types';

/**
 * Smart Cache Manager for AutoRia Services
 * - Prevents duplicate requests
 * - Rational cache TTL based on data type
 * - Cache invalidation strategies
 * - Memory management
 * - Performance monitoring
 */

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
  hits: number;
  lastAccessed: number;
}

export interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  maxMemoryUsage: number; // in MB
  cleanupInterval: number; // in ms
}

export class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private memoryUsage: number = 0;

  private constructor() {
    this.config = {
      maxSize: 1000, // Maximum number of cache entries
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxMemoryUsage: 50, // 50MB
      cleanupInterval: 60 * 1000 // 1 minute
    };

    this.startCleanupTimer();
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Get cache entry with smart TTL management
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.updateMemoryUsage();
      return null;
    }

    // Update access statistics
    entry.hits++;
    entry.lastAccessed = Date.now();
    
    return entry.data;
  }

  /**
   * Set cache entry with smart TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // Check memory usage before adding
    if (this.shouldEvict()) {
      this.evictLeastUsed();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.getSmartTTL(key),
      key,
      hits: 0,
      lastAccessed: Date.now()
    };

    this.cache.set(key, entry);
    this.updateMemoryUsage();
  }

  /**
   * Get smart TTL based on data type and key pattern
   */
  private getSmartTTL(key: string): number {
    // Static reference data - long cache
    if (key.includes('reference') || key.includes('vehicle_types') || key.includes('brands')) {
      return 30 * 60 * 1000; // 30 minutes
    }

    // User-specific data - medium cache
    if (key.includes('user_') || key.includes('my_ads')) {
      return 2 * 60 * 1000; // 2 minutes
    }

    // Moderation stats - short cache (changes frequently)
    if (key.includes('moderation_stats')) {
      return 1 * 60 * 1000; // 1 minute
    }

    // Search results - medium cache
    if (key.includes('search_')) {
      return 3 * 60 * 1000; // 3 minutes
    }

    // Ad details - medium cache
    if (key.includes('ad_details_')) {
      return 5 * 60 * 1000; // 5 minutes
    }

    // Moderation queue - very short cache (changes very frequently)
    if (key.includes('moderation_queue')) {
      return 30 * 1000; // 30 seconds
    }

    // Default TTL
    return this.config.defaultTTL;
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return (Date.now() - entry.timestamp) > entry.ttl;
  }

  /**
   * Check if we should evict entries
   */
  private shouldEvict(): boolean {
    return this.cache.size >= this.config.maxSize || 
           this.memoryUsage > this.config.maxMemoryUsage;
  }

  /**
   * Evict least used entries
   */
  private evictLeastUsed(): void {
    const entries = Array.from(this.cache.entries());
    
    // Sort by last accessed time and hits
    entries.sort(([, a], [, b]) => {
      const scoreA = a.lastAccessed + (a.hits * 1000); // Hits add weight
      const scoreB = b.lastAccessed + (b.hits * 1000);
      return scoreA - scoreB;
    });

    // Remove 20% of least used entries
    const toRemove = Math.ceil(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }

    this.updateMemoryUsage();
    this.log('cache_evicted', { removed: toRemove, remaining: this.cache.size });
  }

  /**
   * Update memory usage estimation
   */
  private updateMemoryUsage(): void {
    let totalSize = 0;
    
    for (const [, entry] of this.cache) {
      // Rough estimation of memory usage
      const dataSize = JSON.stringify(entry.data).length * 2; // UTF-16 chars
      const metadataSize = 200; // Rough size of metadata
      totalSize += dataSize + metadataSize;
    }
    
    this.memoryUsage = totalSize / (1024 * 1024); // Convert to MB
  }

  /**
   * Clear cache by pattern
   */
  clear(pattern?: string): number {
    if (!pattern) {
      const count = this.cache.size;
      this.cache.clear();
      this.memoryUsage = 0;
      this.log('cache_cleared', { pattern: 'all', count });
      return count;
    }

    const regex = new RegExp(pattern);
    let removed = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        removed++;
      }
    }

    this.updateMemoryUsage();
    this.log('cache_cleared', { pattern, removed });
    return removed;
  }

  /**
   * Invalidate related caches
   */
  invalidateRelated(type: string, id?: number): void {
    const patterns = this.getInvalidationPatterns(type, id);
    
    for (const pattern of patterns) {
      this.clear(pattern);
    }
    
    this.log('cache_invalidated', { type, id, patterns });
  }

  /**
   * Get invalidation patterns based on data type
   */
  private getInvalidationPatterns(type: string, id?: number): string[] {
    const patterns: string[] = [];

    switch (type) {
      case 'ad':
        patterns.push('ad_details_');
        patterns.push('search_');
        patterns.push('user_ads_');
        if (id) {
          patterns.push(`ad_details_${id}`);
        }
        break;

      case 'moderation':
        patterns.push('moderation_queue');
        patterns.push('moderation_stats');
        patterns.push('moderation_analytics');
        break;

      case 'user':
        patterns.push('user_ads_');
        patterns.push('user_');
        if (id) {
          patterns.push(`user_ads_${id}`);
        }
        break;

      case 'search':
        patterns.push('search_');
        break;

      case 'reference':
        patterns.push('reference');
        patterns.push('vehicle_types');
        patterns.push('brands');
        patterns.push('models');
        break;
    }

    return patterns;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    memoryUsage: number;
    hitRate: number;
    entries: Array<{
      key: string;
      age: number;
      hits: number;
      ttl: number;
    }>;
  } {
    const entries = Array.from(this.cache.values()).map(entry => ({
      key: entry.key,
      age: Date.now() - entry.timestamp,
      hits: entry.hits,
      ttl: entry.ttl
    }));

    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
    const hitRate = this.cache.size > 0 ? totalHits / this.cache.size : 0;

    return {
      size: this.cache.size,
      memoryUsage: this.memoryUsage,
      hitRate,
      entries
    };
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      this.updateMemoryUsage();
      this.log('cache_cleanup', { removed, remaining: this.cache.size });
    }
  }

  /**
   * Stop cleanup timer
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.cache.clear();
    this.memoryUsage = 0;
  }

  /**
   * Logging
   */
  private log(level: string, data: any): void {
    console.log(`[CacheManager] ${level}:`, data);
  }

  /**
   * Preload frequently accessed data
   */
  async preloadFrequentData(): Promise<void> {
    // This could preload common reference data, user info, etc.
    this.log('preload_started', {});
    
    // Example: Preload vehicle types and brands
    // This would be implemented based on actual usage patterns
  }

  /**
   * Warm up cache with common queries
   */
  async warmUpCache(): Promise<void> {
    this.log('warmup_started', {});
    
    // This could warm up cache with common queries
    // Implementation would depend on actual usage patterns
  }
}


