"use client";

import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useCallback } from 'react';

/**
 * Hook for handling authentication errors and automatic redirects
 *
 * ВАЖНО: 401 ошибки НЕ обрабатываются здесь!
 * ApiClient и fetchData автоматически делают refresh токенов при 401.
 * Этот hook используется только для критических auth ошибок после неудачного refresh.
 */
export function useAuthErrorHandler() {
  const router = useRouter();

  const handleAuthError = useCallback(async (error: any, response?: Response) => {
    // ВАЖНО: НЕ обрабатываем 401 ошибки здесь!
    // ApiClient и fetchData автоматически делают refresh токенов при 401
    // Мы обрабатываем только критические auth ошибки (например, "Authentication required" после неудачного refresh)

    if (error?.message?.includes('Authentication required') || error?.message?.includes('Authentication failed')) {
      console.log('[AuthErrorHandler] Critical authentication error detected (after failed refresh), redirecting to login...');

      try {
        // Sign out from NextAuth
        await signOut({ redirect: false });

        // Clear any local storage tokens
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }

        // Redirect to login with error message
        router.push('/login?alert=session_expired&message=Your session has expired. Please log in again.');
      } catch (signOutError) {
        console.error('[AuthErrorHandler] Error during sign out:', signOutError);
        // Force redirect even if sign out fails
        router.push('/login?alert=auth_error&message=Authentication error. Please log in again.');
      }

      return true; // Indicates error was handled
    }

    return false; // Error was not an auth error
  }, [router]);

  const handleApiError = useCallback(async (error: any, response?: Response) => {
    const wasAuthError = await handleAuthError(error, response);
    
    if (!wasAuthError) {
      // Handle other types of errors
      console.error('[AuthErrorHandler] Non-auth error:', error);
    }
    
    return wasAuthError;
  }, [handleAuthError]);

  return {
    handleAuthError,
    handleApiError,
  };
}

/**
 * Utility function to check if an error is an authentication error
 */
export function isAuthError(error: any, response?: Response): boolean {
  return (
    response?.status === 401 ||
    error?.message?.includes('Authentication') ||
    error?.message?.includes('Unauthorized') ||
    error?.message?.includes('Token') ||
    error?.message?.includes('session')
  );
}

/**
 * Utility function for making authenticated API calls with error handling
 */
export async function authenticatedApiCall<T>(
  url: string,
  options: RequestInit = {},
  onAuthError?: () => void
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 401) {
      console.log('[AuthenticatedApiCall] 401 error, triggering auth error handler');
      if (onAuthError) {
        onAuthError();
      }
      throw new Error('Authentication required');
    }

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[AuthenticatedApiCall] Error:', error);
    
    if (isAuthError(error) && onAuthError) {
      onAuthError();
    }
    
    throw error;
  }
}
