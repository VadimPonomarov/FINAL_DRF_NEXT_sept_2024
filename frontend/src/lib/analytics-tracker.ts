/**
 * Analytics Tracker for AutoRia Integration
 * ========================================
 * Provides analytics tracking functionality for car listings and user interactions
 * Integrates with Django backend analytics API
 */

export interface AnalyticsEvent {
  event: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  userId?: string;
  carId?: string;
  metadata?: Record<string, any>;
}

export interface CarViewEvent extends AnalyticsEvent {
  carId: string;
  carBrand: string;
  carModel: string;
  price: number;
  year: number;
  location: string;
}

export interface SearchEvent extends AnalyticsEvent {
  searchQuery: string;
  filters: Record<string, any>;
  resultsCount: number;
}

export interface ContactEvent extends AnalyticsEvent {
  carId: string;
  contactType: 'phone' | 'email' | 'message';
  sellerId: string;
}

export interface PageViewData {
  url: string;
  page_type: string;
  page_title: string;
  metadata?: Record<string, any>;
}

export interface SearchQueryData {
  query_text: string;
  filters_applied: Record<string, any>;
  results_count: number;
}

export interface AdAnalyticsData {
  total_views: number;
  unique_views: number;
  phone_reveals: number;
  favorites_added: number;
  shares: number;
  conversion_rate: number;
  avg_view_duration?: number;
  quality_views: number;
  bounce_rate: number;
}

/**
 * Analytics Tracker Class
 */
export class AnalyticsTracker {
  private isEnabled: boolean = true;
  private userId?: string;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.isEnabled = process.env.NODE_ENV === 'production';
  }

  /**
   * Initialize tracker with user ID
   */
  init(userId?: string) {
    this.userId = userId;
    this.track({
      event: 'session_start',
      category: 'session',
      action: 'start',
      userId: this.userId,
      metadata: {
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      }
    });
  }

  /**
   * Track page view - returns Promise for Django backend integration
   */
  async trackPageView(data: PageViewData): Promise<any> {
    try {
      console.log('[AnalyticsTracker] Tracking page view (DISABLED):', data);

      // Временно отключаем трекинг страниц для отладки
      return { success: true, disabled: true };

      /*
      const response = await fetch('/api/autoria/ads/analytics/track/page-view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to track page view: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[AnalyticsTracker] Page view tracked successfully:', result);
      return result;
      */
    } catch (error) {
      console.error('[AnalyticsTracker] Error tracking page view (DISABLED):', error);
      return { success: false, disabled: true, error: error.message };
    }
  }

  /**
   * Track search query - returns Promise for Django backend integration
   */
  async trackSearchQuery(data: SearchQueryData): Promise<any> {
    try {
      console.log('[AnalyticsTracker] Tracking search query (DISABLED):', data);

      // Временно отключаем аналитику для отладки
      return { success: true, disabled: true };

      /*
      const response = await fetch('/api/autoria/ads/analytics/track/search-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to track search query: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[AnalyticsTracker] Search query tracked successfully:', result);
      return result;
      */
    } catch (error) {
      console.error('[AnalyticsTracker] Error tracking search query (DISABLED):', error);
      return { success: false, disabled: true, error: error.message };
    }
  }

  /**
   * Track ad view
   */
  async viewAd(adId: number, sourcePage: string = ''): Promise<any> {
    try {
      console.log('[AnalyticsTracker] Tracking ad view:', { adId, sourcePage });

      const response = await fetch('/api/autoria/ads/analytics/track/ad-interaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ad_id: adId,
          interaction_type: 'view',
          source_page: sourcePage,
          metadata: {
            timestamp: new Date().toISOString(),
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to track ad view: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[AnalyticsTracker] Ad view tracked successfully:', result);
      return result;
    } catch (error) {
      console.error('[AnalyticsTracker] Error tracking ad view:', error);
      throw error;
    }
  }

  /**
   * Track phone reveal
   */
  async revealPhone(adId: number): Promise<any> {
    try {
      console.log('[AnalyticsTracker] Tracking phone reveal:', adId);

      const response = await fetch('/api/autoria/ads/analytics/track/ad-interaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ad_id: adId,
          interaction_type: 'phone_reveal',
          metadata: {
            timestamp: new Date().toISOString(),
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to track phone reveal: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[AnalyticsTracker] Phone reveal tracked successfully:', result);
      return result;
    } catch (error) {
      console.error('[AnalyticsTracker] Error tracking phone reveal:', error);
      throw error;
    }
  }

  /**
   * Add to favorites
   */
  async addToFavorites(adId: number): Promise<any> {
    try {
      console.log('[AnalyticsTracker] Tracking add to favorites:', adId);

      const response = await fetch('/api/autoria/ads/analytics/track/ad-interaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ad_id: adId,
          interaction_type: 'favorite_add',
          metadata: {
            timestamp: new Date().toISOString(),
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to track add to favorites: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[AnalyticsTracker] Add to favorites tracked successfully:', result);
      return result;
    } catch (error) {
      console.error('[AnalyticsTracker] Error tracking add to favorites:', error);
      throw error;
    }
  }

  /**
   * Remove from favorites
   */
  async removeFromFavorites(adId: number): Promise<any> {
    try {
      console.log('[AnalyticsTracker] Tracking remove from favorites:', adId);

      const response = await fetch('/api/autoria/ads/analytics/track/ad-interaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ad_id: adId,
          interaction_type: 'favorite_remove',
          metadata: {
            timestamp: new Date().toISOString(),
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to track remove from favorites: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[AnalyticsTracker] Remove from favorites tracked successfully:', result);
      return result;
    } catch (error) {
      console.error('[AnalyticsTracker] Error tracking remove from favorites:', error);
      throw error;
    }
  }

  /**
   * Share ad
   */
  async shareAd(adId: number, method: string = 'link'): Promise<any> {
    try {
      console.log('[AnalyticsTracker] Tracking ad share:', { adId, method });

      const response = await fetch('/api/autoria/ads/analytics/track/ad-interaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ad_id: adId,
          interaction_type: 'share',
          metadata: {
            share_method: method,
            timestamp: new Date().toISOString(),
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to track ad share: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[AnalyticsTracker] Ad share tracked successfully:', result);
      return result;
    } catch (error) {
      console.error('[AnalyticsTracker] Error tracking ad share:', error);
      throw error;
    }
  }

  /**
   * Get ad analytics for card display
   */
  async getAdAnalyticsForCard(adId: number): Promise<AdAnalyticsData> {
    try {
      console.log('[AnalyticsTracker] Getting ad analytics for card:', adId);

      const response = await fetch(`/api/autoria/ads/analytics/${adId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get ad analytics: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[AnalyticsTracker] Ad analytics retrieved successfully:', result);
      return result;
    } catch (error) {
      console.error('[AnalyticsTracker] Error getting ad analytics:', error);
      // Return default analytics data on error
      return {
        total_views: 0,
        unique_views: 0,
        phone_reveals: 0,
        favorites_added: 0,
        shares: 0,
        conversion_rate: 0,
        quality_views: 0,
        bounce_rate: 0,
      };
    }
  }

  /**
   * Track generic event (legacy method for backward compatibility)
   */
  track(event: AnalyticsEvent) {
    if (!this.isEnabled) {
      console.log('[Analytics] Event tracked (dev mode):', event);
      return;
    }

    try {
      // Add session and timestamp data
      const enrichedEvent = {
        ...event,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        userId: event.userId || this.userId,
      };

      // Send to analytics service (Google Analytics, Mixpanel, etc.)
      this.sendToAnalytics(enrichedEvent);

      // Store locally for offline support
      this.storeLocally(enrichedEvent);

    } catch (error) {
      console.error('[Analytics] Failed to track event:', error);
    }
  }

  /**
   * Track car view event (legacy method)
   */
  trackCarView(carData: {
    carId: string;
    brand: string;
    model: string;
    price: number;
    year: number;
    location: string;
  }) {
    this.track({
      event: 'car_view',
      category: 'cars',
      action: 'view',
      carId: carData.carId,
      label: `${carData.brand} ${carData.model}`,
      value: carData.price,
      metadata: {
        carBrand: carData.brand,
        carModel: carData.model,
        carYear: carData.year,
        carLocation: carData.location,
      }
    });
  }

  /**
   * Track search event (legacy method)
   */
  trackSearch(searchData: {
    query: string;
    filters: Record<string, any>;
    resultsCount: number;
  }) {
    this.track({
      event: 'search',
      category: 'search',
      action: 'perform',
      label: searchData.query,
      value: searchData.resultsCount,
      metadata: {
        searchQuery: searchData.query,
        filters: searchData.filters,
        resultsCount: searchData.resultsCount,
      }
    });
  }

  /**
   * Track contact event (legacy method)
   */
  trackContact(contactData: {
    carId: string;
    contactType: 'phone' | 'email' | 'message';
    sellerId: string;
  }) {
    this.track({
      event: 'contact_seller',
      category: 'engagement',
      action: contactData.contactType,
      carId: contactData.carId,
      label: contactData.contactType,
      metadata: {
        sellerId: contactData.sellerId,
        contactType: contactData.contactType,
      }
    });
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Send event to analytics service
   */
  private sendToAnalytics(event: AnalyticsEvent & { sessionId: string; timestamp: string }) {
    // Implementation for sending to Google Analytics, Mixpanel, etc.
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', event.action, {
        event_category: event.category,
        event_label: event.label,
        value: event.value,
        custom_map: event.metadata,
      });
    }

    // Send to custom analytics endpoint
    if (typeof fetch !== 'undefined') {
      fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }).catch(error => {
        console.error('[Analytics] Failed to send to server:', error);
      });
    }
  }

  /**
   * Store event locally for offline support
   */
  private storeLocally(event: AnalyticsEvent & { sessionId: string; timestamp: string }) {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = localStorage.getItem('analytics_events') || '[]';
        const events = JSON.parse(stored);
        events.push(event);

        // Keep only last 100 events
        if (events.length > 100) {
          events.splice(0, events.length - 100);
        }

        localStorage.setItem('analytics_events', JSON.stringify(events));
      } catch (error) {
        console.error('[Analytics] Failed to store locally:', error);
      }
    }
  }
}

// Export singleton instance
export const analyticsTracker = new AnalyticsTracker();

// Export convenience functions for legacy compatibility
export const trackCarView = (carData: Parameters<AnalyticsTracker['trackCarView']>[0]) =>
  analyticsTracker.trackCarView(carData);

export const trackSearch = (searchData: Parameters<AnalyticsTracker['trackSearch']>[0]) =>
  analyticsTracker.trackSearch(searchData);

export const trackContact = (contactData: Parameters<AnalyticsTracker['trackContact']>[0]) =>
  analyticsTracker.trackContact(contactData);

// New async convenience functions
export const trackPageView = (data: PageViewData) =>
  analyticsTracker.trackPageView(data);

export const trackSearchQuery = (data: SearchQueryData) =>
  analyticsTracker.trackSearchQuery(data);

export const viewAd = (adId: number, sourcePage?: string) =>
  analyticsTracker.viewAd(adId, sourcePage);

export const revealPhone = (adId: number) =>
  analyticsTracker.revealPhone(adId);

export const addToFavorites = (adId: number) =>
  analyticsTracker.addToFavorites(adId);

export const removeFromFavorites = (adId: number) =>
  analyticsTracker.removeFromFavorites(adId);

export const shareAd = (adId: number, method?: string) =>
  analyticsTracker.shareAd(adId, method);

export const getAdAnalyticsForCard = (adId: number) =>
  analyticsTracker.getAdAnalyticsForCard(adId);

export default analyticsTracker;
