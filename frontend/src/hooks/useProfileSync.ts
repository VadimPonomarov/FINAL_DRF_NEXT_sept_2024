"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { RawAccountAddress } from '@/types/backend-user';

interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  date_joined: string;
}

interface AccountData {
  id: number;
  user: number;
  account_type: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProfileSyncData {
  profile: UserProfile | null;
  account: AccountData | null;
  address: RawAccountAddress | null;
}

interface UseProfileSyncOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseProfileSyncReturn {
  data: ProfileSyncData;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  updateProfile: (profileData: Partial<UserProfile>) => Promise<UserProfile>;
  updateAccount: (accountData: Partial<AccountData>) => Promise<AccountData>;
  updateAddress: (addressData: Partial<RawAccountAddress>) => Promise<RawAccountAddress>;
  createAddress: (addressData: Partial<RawAccountAddress>) => Promise<RawAccountAddress>;
  clearError: () => void;
}

export const useProfileSync = (options: UseProfileSyncOptions = {}): UseProfileSyncReturn => {
  const {
    autoRefresh = true,
    refreshInterval = 30000 // 30 seconds
  } = options;

  const [data, setData] = useState<ProfileSyncData>({
    profile: null,
    account: null,
    address: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Fetch all profile data
  const fetchProfileData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);

    try {
      // Fetch profile data
      const profileResponse = await fetch('/api/users/profile/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!profileResponse.ok) {
        throw new Error(`Profile API error: ${profileResponse.status}`);
      }

      const profileData = await profileResponse.json();

      // Fetch account data
      const accountResponse = await fetch('/api/user/account/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      let accountData = null;
      if (accountResponse.ok) {
        const accountList = await accountResponse.json();
        // Take the first account if available
        accountData = Array.isArray(accountList) ? accountList[0] || null : accountList;
      }

      // Fetch address data
      const addressResponse = await fetch('/api/user/addresses/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      let addressData = null;
      if (addressResponse.ok) {
        const addressList = await addressResponse.json();
        // Take the first address if available
        const results = addressList.results || addressList;
        addressData = Array.isArray(results) ? results[0] || null : null;
      }

      if (mountedRef.current) {
        setData({
          profile: profileData,
          account: accountData,
          address: addressData
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load profile data';
      if (mountedRef.current) {
        setError(errorMessage);
      }
      console.error('Error fetching profile data:', err);
    } finally {
      if (mountedRef.current && showLoading) {
        setLoading(false);
      }
    }
  }, []);

  // Initial load and auto-refresh setup
  useEffect(() => {
    fetchProfileData();

    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchProfileData(false); // Don't show loading for auto-refresh
      }, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchProfileData, autoRefresh, refreshInterval]);

  // Manual refresh
  const refreshData = useCallback(async () => {
    await fetchProfileData(true);
  }, [fetchProfileData]);

  // Update profile
  const updateProfile = useCallback(async (profileData: Partial<UserProfile>): Promise<UserProfile> => {
    setError(null);

    try {
      const response = await fetch('/api/users/profile/', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const updatedProfile = await response.json();
      
      // Update local state
      setData(prev => ({
        ...prev,
        profile: updatedProfile
      }));
      
      // Refresh to get latest data
      setTimeout(() => fetchProfileData(false), 1000);
      
      return updatedProfile;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
      throw err;
    }
  }, [fetchProfileData]);

  // Update account
  const updateAccount = useCallback(async (accountData: Partial<AccountData>): Promise<AccountData> => {
    setError(null);

    try {
      const response = await fetch('/api/user/account/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(accountData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const updatedAccount = await response.json();
      
      // Update local state
      setData(prev => ({
        ...prev,
        account: updatedAccount
      }));
      
      // Refresh to get latest data
      setTimeout(() => fetchProfileData(false), 1000);
      
      return updatedAccount;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update account';
      setError(errorMessage);
      throw err;
    }
  }, [fetchProfileData]);

  // Update address
  const updateAddress = useCallback(async (addressData: Partial<RawAccountAddress>): Promise<RawAccountAddress> => {
    setError(null);

    if (!data.address) {
      throw new Error('No address to update');
    }

    try {
      const response = await fetch(`/api/accounts/addresses/${data.address.id}/detail/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addressData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const updatedAddress = await response.json();
      
      // Update local state
      setData(prev => ({
        ...prev,
        address: updatedAddress
      }));
      
      // Refresh to get latest geocoded data
      setTimeout(() => fetchProfileData(false), 1000);
      
      return updatedAddress;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update address';
      setError(errorMessage);
      throw err;
    }
  }, [data.address, fetchProfileData]);

  // Create address (only if none exists)
  const createAddress = useCallback(async (addressData: Partial<RawAccountAddress>): Promise<RawAccountAddress> => {
    setError(null);

    if (data.address) {
      throw new Error('Address already exists. Use update instead.');
    }

    try {
      const response = await fetch('/api/accounts/addresses/create/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addressData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const newAddress = await response.json();
      
      // Update local state
      setData(prev => ({
        ...prev,
        address: newAddress
      }));
      
      // Refresh to get latest data
      setTimeout(() => fetchProfileData(false), 1000);
      
      return newAddress;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create address';
      setError(errorMessage);
      throw err;
    }
  }, [data.address, fetchProfileData]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    refreshData,
    updateProfile,
    updateAccount,
    updateAddress,
    createAddress,
    clearError
  };
};
