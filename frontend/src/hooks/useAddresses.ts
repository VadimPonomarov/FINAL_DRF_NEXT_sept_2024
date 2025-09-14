"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { RawAccountAddress } from '@/types/backend-user';

interface UseAddressesOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  accountId?: number;
}

interface UseAddressesReturn {
  addresses: RawAccountAddress[];
  loading: boolean;
  error: string | null;
  refreshAddresses: () => Promise<void>;
  createAddress: (data: Partial<RawAccountAddress>) => Promise<RawAccountAddress>;
  updateAddress: (id: number, data: Partial<RawAccountAddress>) => Promise<RawAccountAddress>;
  deleteAddress: (id: number) => Promise<void>;
  getAddressById: (id: number) => RawAccountAddress | undefined;
  clearError: () => void;
}

export const useAddresses = (options: UseAddressesOptions = {}): UseAddressesReturn => {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    accountId
  } = options;

  const [addresses, setAddresses] = useState<RawAccountAddress[]>([]);
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

  // Fetch addresses from API
  const fetchAddresses = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const url = '/api/accounts/addresses';

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const addressList = data.results || data;

      if (mountedRef.current) {
        setAddresses(addressList);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load addresses';
      if (mountedRef.current) {
        setError(errorMessage);
      }
      console.error('Error fetching addresses:', err);
    } finally {
      if (mountedRef.current && showLoading) {
        setLoading(false);
      }
    }
  }, [accountId]);

  // Initial load and auto-refresh setup
  useEffect(() => {
    fetchAddresses();

    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchAddresses(false); // Don't show loading for auto-refresh
      }, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchAddresses, autoRefresh, refreshInterval]);

  // Manual refresh
  const refreshAddresses = useCallback(async () => {
    await fetchAddresses(true);
  }, [fetchAddresses]);

  // Create new address
  const createAddress = useCallback(async (data: Partial<RawAccountAddress>): Promise<RawAccountAddress> => {
    setError(null);

    try {
      const response = await fetch('/api/accounts/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const newAddress = await response.json();
      
      // Update local state immediately
      setAddresses(prev => [newAddress, ...prev]);
      
      // Refresh to get latest data from server
      setTimeout(() => fetchAddresses(false), 1000);
      
      return newAddress;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create address';
      setError(errorMessage);
      throw err;
    }
  }, [fetchAddresses]);

  // Update existing address
  const updateAddress = useCallback(async (id: number, data: Partial<RawAccountAddress>): Promise<RawAccountAddress> => {
    setError(null);

    try {
      const response = await fetch(`/api/accounts/addresses/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const updatedAddress = await response.json();
      
      // Update local state immediately
      setAddresses(prev => prev.map(addr => addr.id === id ? updatedAddress : addr));
      
      // Refresh to get latest geocoded data from server
      setTimeout(() => fetchAddresses(false), 1000);
      
      return updatedAddress;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update address';
      setError(errorMessage);
      throw err;
    }
  }, [fetchAddresses]);

  // Delete address
  const deleteAddress = useCallback(async (id: number): Promise<void> => {
    setError(null);

    try {
      const response = await fetch(`/api/accounts/addresses/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Update local state immediately
      setAddresses(prev => prev.filter(addr => addr.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete address';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Get address by ID
  const getAddressById = useCallback((id: number): RawAccountAddress | undefined => {
    return addresses.find(addr => addr.id === id);
  }, [addresses]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    addresses,
    loading,
    error,
    refreshAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    getAddressById,
    clearError
  };
};
