/**
 * Service for caching user profile data in localStorage
 * Provides methods to cache, retrieve, and invalidate profile data
 */

import { ProfileApiResponse, AccountApiResponse, BackendRawAddress } from '@/common/interfaces/profile.interfaces';

interface CachedProfileData {
  profile: ProfileApiResponse | null;
  account: AccountApiResponse | null;
  addresses: BackendRawAddress[];
  timestamp: number;
  version: string;
}

const CACHE_KEY = 'user_profile_cache';
const CACHE_VERSION = '1.0';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

export class ProfileCacheService {
  /**
   * Save profile data to cache
   */
  static saveToCache(
    profile: ProfileApiResponse | null,
    account: AccountApiResponse | null,
    addresses: BackendRawAddress[]
  ): void {
    try {
      const cacheData: CachedProfileData = {
        profile,
        account,
        addresses,
        timestamp: Date.now(),
        version: CACHE_VERSION
      };

      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log('[ProfileCache] ✅ Profile data saved to cache');
    } catch (error) {
      console.error('[ProfileCache] ❌ Error saving to cache:', error);
    }
  }

  /**
   * Get profile data from cache if valid
   */
  static getFromCache(): CachedProfileData | null {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) {
        console.log('[ProfileCache] No cached data found');
        return null;
      }

      const cacheData: CachedProfileData = JSON.parse(cached);
      
      // Check version compatibility
      if (cacheData.version !== CACHE_VERSION) {
        console.log('[ProfileCache] Cache version mismatch, invalidating');
        this.clearCache();
        return null;
      }

      // Check if cache is still valid
      const now = Date.now();
      const isExpired = (now - cacheData.timestamp) > CACHE_DURATION;
      
      if (isExpired) {
        console.log('[ProfileCache] Cache expired, invalidating');
        this.clearCache();
        return null;
      }

      console.log('[ProfileCache] ✅ Valid cached data found');
      return cacheData;
    } catch (error) {
      console.error('[ProfileCache] ❌ Error reading from cache:', error);
      this.clearCache();
      return null;
    }
  }

  /**
   * Check if cache exists and is valid
   */
  static isCacheValid(): boolean {
    return this.getFromCache() !== null;
  }

  /**
   * Clear all cached profile data
   */
  static clearCache(): void {
    try {
      localStorage.removeItem(CACHE_KEY);
      console.log('[ProfileCache] ✅ Cache cleared');
    } catch (error) {
      console.error('[ProfileCache] ❌ Error clearing cache:', error);
    }
  }

  /**
   * Get cache info for debugging
   */
  static getCacheInfo(): { exists: boolean; timestamp?: number; age?: number } {
    const cached = this.getFromCache();
    if (!cached) {
      return { exists: false };
    }

    const age = Date.now() - cached.timestamp;
    return {
      exists: true,
      timestamp: cached.timestamp,
      age: Math.round(age / 1000) // age in seconds
    };
  }
}
