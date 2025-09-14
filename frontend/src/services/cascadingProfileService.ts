/**
 * Cascading Profile Service - Optimized tab-based data loading
 * Each tab loads all its related data in a single request
 */

import { fetchWithDomain } from '@/app/api/(helpers)/common';

// ========================================
// TYPE DEFINITIONS
// ========================================

export interface PersonalInfoTabData {
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
    date_joined: string;
    last_login: string | null;
    profile: any;
  };
  settings: {
    language: string;
    timezone: string;
    notifications_enabled: boolean;
    email_notifications: boolean;
  };
  stats: {
    profile_completion: number;
    addresses_count: number;
    account_age_days: number;
    last_login: string | null;
  };
}

export interface AccountSettingsTabData {
  account: any;
  business_settings: {
    business_name?: string;
    tax_id?: string;
    business_address?: string;
    business_phone?: string;
    business_email?: string;
    business_website?: string;
    business_description?: string;
  };
  notification_settings: {
    email_notifications: boolean;
    sms_notifications: boolean;
    push_notifications: boolean;
    marketing_emails: boolean;
    new_message_notifications: boolean;
    ad_status_notifications: boolean;
    system_notifications: boolean;
  };
  account_preferences: {
    language: string;
    currency: string;
    timezone: string;
    date_format: string;
    auto_renew_ads: boolean;
    show_phone_in_ads: boolean;
    allow_messages: boolean;
  };
  stats: {
    account_type: string;
    is_verified: boolean;
    created_at: string;
    last_updated: string | null;
  };
}

export interface AddressesTabData {
  addresses: any[];
  analytics: {
    total_addresses: number;
    geocoded_addresses: number;
    not_geocoded_addresses: number;
    geocoding_success_rate: number;
    regions_count: number;
    localities_count: number;
    most_used_region: string | null;
    most_used_locality: string | null;
  };
  geocoding_metrics: {
    accuracy_levels: {
      high: number;
      medium: number;
      low: number;
    };
    coordinates_available: number;
    formatted_addresses: number;
  };
  region_distribution: Record<string, number>;
  locality_distribution: Record<string, number>;
}

// ========================================
// CASCADING TAB SERVICES
// ========================================

/**
 * TAB 1: Personal Info Service
 * Loads: User Profile + Settings + Statistics
 */
export class PersonalInfoTabService {
  
  static async getTabData(): Promise<PersonalInfoTabData | null> {
    try {
      console.log('[PersonalInfoTabService] 📤 Loading personal info tab data...');
      
      const data = await fetchWithDomain<PersonalInfoTabData>('api/accounts/profile/personal-info/', {
        domain: 'internal',
        redirectOnError: false
      });

      if (!data) {
        console.error('[PersonalInfoTabService] ❌ No data received');
        return null;
      }

      console.log('[PersonalInfoTabService] ✅ Personal info tab data loaded successfully');
      return data;
    } catch (error) {
      console.error('[PersonalInfoTabService] ❌ Error loading personal info tab data:', error);
      return null;
    }
  }
}

/**
 * TAB 2: Account Settings Service
 * Loads: Account + Business Data + Notifications + Preferences
 */
export class AccountSettingsTabService {
  
  static async getTabData(): Promise<AccountSettingsTabData | null> {
    try {
      console.log('[AccountSettingsTabService] 📤 Loading account settings tab data...');
      
      const data = await fetchWithDomain<AccountSettingsTabData>('api/accounts/profile/account-settings/', {
        domain: 'internal',
        redirectOnError: false
      });

      if (!data) {
        console.error('[AccountSettingsTabService] ❌ No data received');
        return null;
      }

      console.log('[AccountSettingsTabService] ✅ Account settings tab data loaded successfully');
      return data;
    } catch (error) {
      console.error('[AccountSettingsTabService] ❌ Error loading account settings tab data:', error);
      return null;
    }
  }
}

/**
 * TAB 3: Addresses Service
 * Loads: All Addresses + Analytics + Geocoding Stats
 */
export class AddressesTabService {
  
  static async getTabData(): Promise<AddressesTabData | null> {
    try {
      console.log('[AddressesTabService] 📤 Loading addresses tab data...');
      
      const data = await fetchWithDomain<AddressesTabData>('api/accounts/profile/addresses/', {
        domain: 'internal',
        redirectOnError: false
      });

      if (!data) {
        console.error('[AddressesTabService] ❌ No data received');
        return null;
      }

      console.log('[AddressesTabService] ✅ Addresses tab data loaded successfully');
      console.log(`[AddressesTabService] 📊 Loaded ${data.addresses.length} addresses with analytics`);
      return data;
    } catch (error) {
      console.error('[AddressesTabService] ❌ Error loading addresses tab data:', error);
      return null;
    }
  }
}

// ========================================
// UNIFIED CASCADING SERVICE
// ========================================

/**
 * Master Cascading Service
 * Coordinates all tab data loading
 */
export class CascadingProfileService {
  
  /**
   * Load specific tab data
   */
  static async loadTabData(tabName: 'personal-info' | 'account-settings' | 'addresses'): Promise<any> {
    switch (tabName) {
      case 'personal-info':
        return PersonalInfoTabService.getTabData();
      case 'account-settings':
        return AccountSettingsTabService.getTabData();
      case 'addresses':
        return AddressesTabService.getTabData();
      default:
        console.error('[CascadingProfileService] ❌ Unknown tab name:', tabName);
        return null;
    }
  }

  /**
   * Preload all tab data (for performance)
   */
  static async preloadAllTabs(): Promise<{
    personalInfo: PersonalInfoTabData | null;
    accountSettings: AccountSettingsTabData | null;
    addresses: AddressesTabData | null;
  }> {
    try {
      console.log('[CascadingProfileService] 📤 Preloading all tab data...');
      
      const [personalInfoResponse, accountSettingsResponse, addressesResponse] = await Promise.allSettled([
        PersonalInfoTabService.getTabData(),
        AccountSettingsTabService.getTabData(),
        AddressesTabService.getTabData()
      ]);

      const result = {
        personalInfo: personalInfoResponse.status === 'fulfilled' ? personalInfoResponse.value : null,
        accountSettings: accountSettingsResponse.status === 'fulfilled' ? accountSettingsResponse.value : null,
        addresses: addressesResponse.status === 'fulfilled' ? addressesResponse.value : null
      };

      console.log('[CascadingProfileService] ✅ All tab data preloaded successfully');
      return result;
    } catch (error) {
      console.error('[CascadingProfileService] ❌ Error preloading tab data:', error);
      return {
        personalInfo: null,
        accountSettings: null,
        addresses: null
      };
    }
  }
}
