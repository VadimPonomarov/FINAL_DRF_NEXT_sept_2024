/**
 * React Hook for Cascading Profile Data Loading
 * Optimized tab-based data loading with caching
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  CascadingProfileService, 
  PersonalInfoTabData, 
  AccountSettingsTabData, 
  AddressesTabData 
} from '@/services/cascadingProfileService';

// ========================================
// TYPES
// ========================================

export type TabName = 'personal-info' | 'account-settings' | 'addresses';

export interface TabDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastLoaded: Date | null;
}

export interface CascadingProfileState {
  personalInfo: TabDataState<PersonalInfoTabData>;
  accountSettings: TabDataState<AccountSettingsTabData>;
  addresses: TabDataState<AddressesTabData>;
}

// ========================================
// HOOK
// ========================================

export function useCascadingProfile() {
  const [state, setState] = useState<CascadingProfileState>({
    personalInfo: { data: null, loading: false, error: null, lastLoaded: null },
    accountSettings: { data: null, loading: false, error: null, lastLoaded: null },
    addresses: { data: null, loading: false, error: null, lastLoaded: null }
  });

  // Cache duration (5 minutes)
  const CACHE_DURATION = 5 * 60 * 1000;

  /**
   * Check if data is fresh (within cache duration)
   */
  const isDataFresh = useCallback((lastLoaded: Date | null): boolean => {
    if (!lastLoaded) return false;
    return Date.now() - lastLoaded.getTime() < CACHE_DURATION;
  }, [CACHE_DURATION]);

  /**
   * Load specific tab data
   */
  const loadTabData = useCallback(async (tabName: TabName, forceReload = false) => {
    const stateKey = tabName.replace('-', '') as keyof CascadingProfileState;
    const currentTabState = state[stateKey];

    // ✅ ИСПРАВЛЕНИЕ: Безопасная проверка lastLoaded
    if (!currentTabState) {
      console.error(`[useCascadingProfile] ❌ Invalid tab state for ${tabName}`);
      return null;
    }

    // Skip if data is fresh and not forcing reload
    if (!forceReload && currentTabState.lastLoaded && isDataFresh(currentTabState.lastLoaded)) {
      console.log(`[useCascadingProfile] 💾 Using cached data for ${tabName}`);
      return currentTabState.data;
    }

    // Set loading state
    setState(prev => ({
      ...prev,
      [stateKey]: {
        ...prev[stateKey],
        loading: true,
        error: null
      }
    }));

    try {
      console.log(`[useCascadingProfile] 📤 Loading ${tabName} data...`);
      
      const data = await CascadingProfileService.loadTabData(tabName);
      
      if (data) {
        setState(prev => ({
          ...prev,
          [stateKey]: {
            data,
            loading: false,
            error: null,
            lastLoaded: new Date()
          }
        }));
        
        console.log(`[useCascadingProfile] ✅ ${tabName} data loaded successfully`);
        return data;
      } else {
        throw new Error(`Failed to load ${tabName} data`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setState(prev => ({
        ...prev,
        [stateKey]: {
          ...prev[stateKey],
          loading: false,
          error: errorMessage
        }
      }));
      
      console.error(`[useCascadingProfile] ❌ Error loading ${tabName} data:`, error);
      return null;
    }
  }, [state, isDataFresh]);

  /**
   * Preload all tabs data
   */
  const preloadAllTabs = useCallback(async () => {
    console.log('[useCascadingProfile] 📤 Preloading all tabs...');
    
    // Set all tabs to loading
    setState(prev => ({
      personalInfo: { ...prev.personalInfo, loading: true, error: null },
      accountSettings: { ...prev.accountSettings, loading: true, error: null },
      addresses: { ...prev.addresses, loading: true, error: null }
    }));

    try {
      const result = await CascadingProfileService.preloadAllTabs();
      const now = new Date();
      
      setState({
        personalInfo: {
          data: result.personalInfo,
          loading: false,
          error: result.personalInfo ? null : 'Failed to load personal info',
          lastLoaded: result.personalInfo ? now : null
        },
        accountSettings: {
          data: result.accountSettings,
          loading: false,
          error: result.accountSettings ? null : 'Failed to load account settings',
          lastLoaded: result.accountSettings ? now : null
        },
        addresses: {
          data: result.addresses,
          loading: false,
          error: result.addresses ? null : 'Failed to load addresses',
          lastLoaded: result.addresses ? now : null
        }
      });
      
      console.log('[useCascadingProfile] ✅ All tabs preloaded successfully');
      return result;
    } catch (error) {
      console.error('[useCascadingProfile] ❌ Error preloading tabs:', error);
      
      // Set error state for all tabs
      setState(prev => ({
        personalInfo: { ...prev.personalInfo, loading: false, error: 'Preload failed' },
        accountSettings: { ...prev.accountSettings, loading: false, error: 'Preload failed' },
        addresses: { ...prev.addresses, loading: false, error: 'Preload failed' }
      }));
      
      return null;
    }
  }, []);

  /**
   * Refresh specific tab data
   */
  const refreshTab = useCallback((tabName: TabName) => {
    return loadTabData(tabName, true);
  }, [loadTabData]);

  /**
   * Clear cache for specific tab
   */
  const clearTabCache = useCallback((tabName: TabName) => {
    setState(prev => ({
      ...prev,
      [tabName.replace('-', '')]: {
        data: null,
        loading: false,
        error: null,
        lastLoaded: null
      }
    }));
  }, []);

  /**
   * Clear all cache
   */
  const clearAllCache = useCallback(() => {
    setState({
      personalInfo: { data: null, loading: false, error: null, lastLoaded: null },
      accountSettings: { data: null, loading: false, error: null, lastLoaded: null },
      addresses: { data: null, loading: false, error: null, lastLoaded: null }
    });
  }, []);

  return {
    // State
    state,
    
    // Actions
    loadTabData,
    preloadAllTabs,
    refreshTab,
    clearTabCache,
    clearAllCache,
    
    // Utilities
    isDataFresh: (tabName: TabName) => {
      const tabState = state[tabName.replace('-', '') as keyof CascadingProfileState];
      return isDataFresh(tabState.lastLoaded);
    },
    
    // Getters
    getPersonalInfo: () => state.personalInfo,
    getAccountSettings: () => state.accountSettings,
    getAddresses: () => state.addresses,
    
    // Loading states
    isAnyLoading: state.personalInfo.loading || state.accountSettings.loading || state.addresses.loading,
    isAllLoaded: state.personalInfo.data && state.accountSettings.data && state.addresses.data
  };
}
