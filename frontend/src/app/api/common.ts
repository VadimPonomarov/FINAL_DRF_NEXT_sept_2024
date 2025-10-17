/**
 * Common API helpers for making authenticated requests
 * Provides fetchData and fetchWithDomain functions with Bearer token support
 */

import { getAuthorizationHeaders } from '@/common/constants/headers';
import { resolveServiceUrl } from '@/utils/api/serviceUrlResolver';
import { redirect } from 'next/navigation';

// Server-side check
const __isServer = typeof window === 'undefined';
const __frontendBaseUrl = __isServer 
  ? (process.env.NEXT_PUBLIC_IS_DOCKER === 'true' ? 'http://frontend:3000' : 'http://localhost:3000') 
  : '';

/**
 * Helper to get data from Redis via API
 */
async function apiGetRedis(key: string): Promise<string | null> {
  try {
    const res = await fetch(`${__frontendBaseUrl}/api/redis?key=${encodeURIComponent(key)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.exists ? (data.value as string) : null;
  } catch {
    return null;
  }
}

/**
 * Helper to set data in Redis via API
 */
async function apiSetRedis(key: string, value: string): Promise<boolean> {
  try {
    const res = await fetch(`${__frontendBaseUrl}/api/redis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Options for fetchWithDomain
 */
interface FetchWithDomainOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: any;
  domain?: 'internal' | 'external';
  redirectOnError?: boolean;
  headers?: Record<string, string>;
}

/**
 * Enhanced fetch function with domain support and error handling
 * Used by services for making authenticated requests to backend
 *
 * IMPORTANT: This function uses Next.js API routes as a proxy layer
 * instead of making direct requests to the backend. This ensures:
 * - No CORS issues
 * - Proper authentication handling
 * - Consistent error handling
 */
export async function fetchWithDomain<T = any>(
  endpoint: string,
  options: FetchWithDomainOptions = {}
): Promise<T | null> {
  const {
    method = 'GET',
    body,
    domain = 'internal',
    redirectOnError = true,
    headers: customHeaders = {}
  } = options;

  try {
    console.log(`[fetchWithDomain] ${method} ${endpoint}`);

    // Determine if we're on server or client
    const isServer = typeof window === 'undefined';

    // Build URL using Next.js API routes as proxy
    // This avoids CORS issues and follows the project architecture
    let url: string;

    if (isServer) {
      // Server-side: use absolute URL to Next.js API
      const baseUrl = process.env.NEXT_PUBLIC_IS_DOCKER === 'true'
        ? 'http://frontend:3000'
        : 'http://localhost:3000';
      url = `${baseUrl}/api/proxy/${endpoint}`;
    } else {
      // Client-side: use relative URL
      url = `/api/proxy/${endpoint}`;
    }

    console.log(`[fetchWithDomain] Proxied URL: ${url}`);

    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...customHeaders
      },
      // НЕ используем credentials: 'include', так как мы используем Bearer токены в заголовках
      // credentials: 'include' вызывает CORS ошибку с Access-Control-Allow-Origin: *
      cache: 'no-store'
    };

    // Add body for non-GET requests
    if (body && method !== 'GET') {
      requestOptions.body = JSON.stringify(body);
    }

    // Make request through Next.js API route
    const response = await fetch(url, requestOptions);

    // Handle errors
    if (!response.ok) {
      console.error(`[fetchWithDomain] Error: ${response.status} ${response.statusText}`);

      if (redirectOnError) {
        if (response.status === 401 || response.status === 403) {
          redirect('/login');
        } else if (response.status === 404) {
          redirect('/not-found');
        } else {
          redirect('/error');
        }
      }

      return null;
    }

    // Parse response
    const data = await response.json();
    console.log(`[fetchWithDomain] Success`);

    return data as T;

  } catch (error) {
    console.error('[fetchWithDomain] Exception:', error);

    if (redirectOnError) {
      redirect('/error');
    }

    return null;
  }
}

/**
 * Legacy fetchData function for backward compatibility
 * Redirects to helpers.ts implementation
 */
export { fetchData } from '@/app/api/helpers';

