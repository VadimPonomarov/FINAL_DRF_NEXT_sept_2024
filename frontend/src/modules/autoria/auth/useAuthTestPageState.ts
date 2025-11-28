"use client";

import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { useToast } from '@/modules/autoria/shared/hooks/use-toast';

interface AuthStatusState {
  hasToken: boolean;
  tokenValid: boolean;
  loading: boolean;
  error: string | null;
  tokenPreview: string | null;
}

export interface UseAuthTestPageStateResult {
  authStatus: AuthStatusState;
  testToken: string;
  setTestToken: (value: string) => void;
  checkAuthStatus: () => Promise<void>;
  setTestAuthToken: () => Promise<void>;
  clearAuthToken: () => Promise<void>;
}

export function useAuthTestPageState(): UseAuthTestPageStateResult {
  const { t } = useI18n();
  const { toast } = useToast();

  const [authStatus, setAuthStatus] = useState<AuthStatusState>({
    hasToken: false,
    tokenValid: false,
    loading: true,
    error: null,
    tokenPreview: null,
  });

  const [testToken, setTestToken] = useState('');

  // Check current authentication state
  const checkAuthStatus = useCallback(async () => {
    setAuthStatus((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Check token in Redis
      const response = await fetch('/api/redis?key=backend_auth');

      if (!response.ok) {
        setAuthStatus({
          hasToken: false,
          tokenValid: false,
          loading: false,
          error: 'Failed to check Redis',
          tokenPreview: null,
        });
        return;
      }

      const { value: authData } = await response.json();

      if (!authData) {
        setAuthStatus({
          hasToken: false,
          tokenValid: false,
          loading: false,
          error: null,
          tokenPreview: null,
        });
        return;
      }

      const parsedData = typeof authData === 'string' ? JSON.parse(authData) : authData;
      const accessToken = parsedData.access || parsedData.token;

      if (!accessToken) {
        setAuthStatus({
          hasToken: false,
          tokenValid: false,
          loading: false,
          error: null,
          tokenPreview: null,
        });
        return;
      }

      // Test token with profile API
      const profileResponse = await fetch('/api/user/profile/', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      setAuthStatus({
        hasToken: true,
        tokenValid: profileResponse.ok,
        loading: false,
        error: profileResponse.ok ? null : `API returned ${profileResponse.status}`,
        tokenPreview: accessToken.substring(0, 20) + '...',
      });
    } catch (error) {
      setAuthStatus({
        hasToken: false,
        tokenValid: false,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        tokenPreview: null,
      });
    }
  }, []);

  // Set test token in Redis
  const setTestAuthToken = useCallback(async () => {
    if (!testToken.trim()) {
      toast({
        title: t('common.warning'),
        description: 'Please enter a token',
        variant: 'destructive',
      });
      return;
    }

    try {
      const authData = {
        access: testToken.trim(),
        token_type: 'Bearer',
      };

      const response = await fetch('/api/redis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'backend_auth',
          value: JSON.stringify(authData),
        }),
      });

      if (response.ok) {
        toast({
          title: '✅ ' + t('common.success'),
          description: 'Token saved successfully!',
        });
        setTestToken('');
        checkAuthStatus();
      } else {
        toast({
          title: '❌ ' + t('common.error'),
          description: 'Failed to save token',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: '❌ ' + t('common.error'),
        description:
          'Error saving token: ' + (error instanceof Error ? error.message : 'Unknown error'),
        variant: 'destructive',
      });
    }
  }, [checkAuthStatus, t, testToken, toast]);

  // Clear token from Redis
  const clearAuthToken = useCallback(async () => {
    try {
      const response = await fetch('/api/redis', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'backend_auth',
        }),
      });

      if (response.ok) {
        toast({
          title: '✅ ' + t('common.success'),
          description: 'Token cleared successfully!',
        });
        checkAuthStatus();
      } else {
        toast({
          title: '❌ ' + t('common.error'),
          description: 'Failed to clear token',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: '❌ ' + t('common.error'),
        description:
          'Error clearing token: ' + (error instanceof Error ? error.message : 'Unknown error'),
        variant: 'destructive',
      });
    }
  }, [checkAuthStatus, t, toast]);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return {
    authStatus,
    testToken,
    setTestToken,
    checkAuthStatus,
    setTestAuthToken,
    clearAuthToken,
  };
}
