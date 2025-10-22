import { BaseService } from './base-service';
import { AutoRiaApiTemplates } from '../../api/autoria/autoria-api-templates';
import { CarAd, ModerationStats, ModerationAction, SearchFilters } from '../../api/autoria/autoria.types';

/**
 * Moderation Service
 * Handles all moderation-related operations with best practices
 */
export class ModerationService extends BaseService {
  private static instance: ModerationService;

  private constructor() {
    super();
  }

  static getInstance(): ModerationService {
    if (!ModerationService.instance) {
      ModerationService.instance = new ModerationService();
    }
    return ModerationService.instance;
  }

  /**
   * Get moderation statistics
   */
  async getStats(): Promise<ModerationStats> {
    return this.measurePerformance(async () => {
      const template = AutoRiaApiTemplates.getModerationStats();
      const result = await this.executeWithCache(template, 'moderation_stats', 2 * 60 * 1000); // 2 minutes cache
      
      return this.transformResponse(result);
    }, 'getModerationStats');
  }

  /**
   * Get moderation queue with filters
   */
  async getQueue(filters?: SearchFilters): Promise<CarAd[]> {
    return this.measurePerformance(async () => {
      const sanitizedFilters = this.sanitizeFilters(filters || {});
      const template = AutoRiaApiTemplates.getModerationQueue(sanitizedFilters);
      const cacheKey = `moderation_queue_${JSON.stringify(sanitizedFilters)}`;
      
      const result = await this.executeWithCache(template, cacheKey, 30 * 1000); // 30 seconds cache
      
      return this.transformResponse(result);
    }, 'getModerationQueue');
  }

  /**
   * Moderate single ad
   */
  async moderateAd(adId: number, action: ModerationAction): Promise<CarAd> {
    this.validateId(adId);
    this.validateRequired(action, ['action']);

    return this.measurePerformance(async () => {
      const template = AutoRiaApiTemplates.moderateAd(adId, action);
      const result = await this.executeWithCache(template);
      
      // Invalidate related caches
      this.invalidateCache('moderation');
      
      return this.transformResponse(result);
    }, 'moderateAd');
  }

  /**
   * Bulk moderate multiple ads
   */
  async bulkModerate(adIds: number[], action: ModerationAction): Promise<CarAd[]> {
    if (!Array.isArray(adIds) || adIds.length === 0) {
      throw new Error('adIds must be a non-empty array');
    }

    adIds.forEach(id => this.validateId(id));
    this.validateRequired(action, ['action']);

    return this.measurePerformance(async () => {
      const template = AutoRiaApiTemplates.bulkModerate(adIds, action);
      const result = await this.executeWithCache(template);
      
      // Invalidate related caches
      this.invalidateCache('moderation');
      
      return this.transformResponse(result);
    }, 'bulkModerate');
  }

  /**
   * Get ads by status
   */
  async getAdsByStatus(status: string, filters?: Omit<SearchFilters, 'status'>): Promise<CarAd[]> {
    const statusFilters = { ...filters, status };
    return this.getQueue(statusFilters);
  }

  /**
   * Get pending moderation ads
   */
  async getPendingAds(filters?: Omit<SearchFilters, 'status'>): Promise<CarAd[]> {
    return this.getAdsByStatus('pending_moderation', filters);
  }

  /**
   * Get ads needing review
   */
  async getNeedsReviewAds(filters?: Omit<SearchFilters, 'status'>): Promise<CarAd[]> {
    return this.getAdsByStatus('needs_review', filters);
  }

  /**
   * Get rejected ads
   */
  async getRejectedAds(filters?: Omit<SearchFilters, 'status'>): Promise<CarAd[]> {
    return this.getAdsByStatus('rejected', filters);
  }

  /**
   * Get active ads
   */
  async getActiveAds(filters?: Omit<SearchFilters, 'status'>): Promise<CarAd[]> {
    return this.getAdsByStatus('active', filters);
  }

  /**
   * Approve ad
   */
  async approveAd(adId: number, reason?: string): Promise<CarAd> {
    return this.moderateAd(adId, { action: 'approve', reason });
  }

  /**
   * Reject ad
   */
  async rejectAd(adId: number, reason: string): Promise<CarAd> {
    this.validateRequired({ reason }, ['reason']);
    return this.moderateAd(adId, { action: 'reject', reason });
  }

  /**
   * Block ad
   */
  async blockAd(adId: number, reason: string): Promise<CarAd> {
    this.validateRequired({ reason }, ['reason']);
    return this.moderateAd(adId, { action: 'block', reason });
  }

  /**
   * Activate ad
   */
  async activateAd(adId: number): Promise<CarAd> {
    return this.moderateAd(adId, { action: 'activate' });
  }

  /**
   * Mark ad for review
   */
  async reviewAd(adId: number, reason?: string): Promise<CarAd> {
    return this.moderateAd(adId, { action: 'review', reason });
  }

  /**
   * Bulk approve ads
   */
  async bulkApprove(adIds: number[], reason?: string): Promise<CarAd[]> {
    return this.bulkModerate(adIds, { action: 'approve', reason });
  }

  /**
   * Bulk reject ads
   */
  async bulkReject(adIds: number[], reason: string): Promise<CarAd[]> {
    this.validateRequired({ reason }, ['reason']);
    return this.bulkModerate(adIds, { action: 'reject', reason });
  }

  /**
   * Bulk block ads
   */
  async bulkBlock(adIds: number[], reason: string): Promise<CarAd[]> {
    this.validateRequired({ reason }, ['reason']);
    return this.bulkModerate(adIds, { action: 'block', reason });
  }

  /**
   * Get moderation analytics
   */
  async getAnalytics(): Promise<any> {
    return this.measurePerformance(async () => {
      const template = AutoRiaApiTemplates.getModerationAnalytics();
      const result = await this.executeWithCache(template, 'moderation_analytics', 5 * 60 * 1000); // 5 minutes cache
      
      return this.transformResponse(result);
    }, 'getModerationAnalytics');
  }

  /**
   * Search ads in moderation queue
   */
  async searchAds(query: string, filters?: Omit<SearchFilters, 'search'>): Promise<CarAd[]> {
    if (!query.trim()) {
      throw new Error('Search query cannot be empty');
    }

    const searchFilters = { ...filters, search: query.trim() };
    return this.getQueue(searchFilters);
  }

  /**
   * Get moderation queue with pagination
   */
  async getQueuePaginated(
    page: number = 1, 
    pageSize: number = 20, 
    filters?: SearchFilters
  ): Promise<{ results: CarAd[]; count: number; page: number; pageSize: number }> {
    this.validatePagination(page, pageSize);

    const paginatedFilters = { 
      ...filters, 
      page, 
      page_size: pageSize 
    };

    return this.measurePerformance(async () => {
      const template = AutoRiaApiTemplates.getModerationQueue(paginatedFilters);
      const cacheKey = `moderation_queue_paginated_${JSON.stringify(paginatedFilters)}`;
      
      const result = await this.executeWithCache(template, cacheKey, 30 * 1000);
      const data = this.transformResponse(result);
      
      return {
        results: data,
        count: data.length,
        page,
        pageSize
      };
    }, 'getQueuePaginated');
  }

  /**
   * Clear all moderation caches
   */
  clearModerationCache(): void {
    this.invalidateCache('moderation');
  }
}
