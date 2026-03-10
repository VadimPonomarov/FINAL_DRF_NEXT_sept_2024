/**
 * Common API helpers for making authenticated requests
 * Provides fetchData and fetchWithDomain functions with Bearer token support
 */

import { getAuthorizationHeaders } from '@/shared/constants/headers';
import { resolveServiceUrl } from '@/shared/utils/api/serviceUrlResolver';
import { redirect } from 'next/navigation';
import { logger } from '@/shared/utils/logger';

// Server-side check
const __isServer = typeof window === 'undefined';
const __frontendBaseUrl = __isServer 
  ? (process.env.NEXT_PUBLIC_IS_DOCKER === 'true' ? 'http://frontend:3000' : 'http://localhost:3000') 
  : '';


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
    logger.debug(`[fetchWithDomain] ${method} ${endpoint}`);

    // Determine if we're on server or client
    const isServer = typeof window === 'undefined';

    // Build URL using Next.js API routes as proxy
    // This avoids CORS issues and follows the project architecture
    let url: string;

    // Check if endpoint starts with 'api/' or '/api/' - these are direct Next.js API routes
    // These are Next.js API routes that should NOT be proxied
    const isDirectApiRoute = endpoint.startsWith('api/auth/') ||
                             endpoint.startsWith('/api/auth/') ||
                             endpoint.startsWith('api/autoria/') ||
                             endpoint.startsWith('/api/autoria/') ||
                             endpoint.startsWith('api/user/') ||
                             endpoint.startsWith('/api/user/') ||
                             endpoint.startsWith('api/redis') ||
                             endpoint.startsWith('/api/redis') ||
                             endpoint.startsWith('api/public/') ||
                             endpoint.startsWith('/api/public/');

    // Normalize endpoint to remove leading slash for consistent handling
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

    if (isServer) {
      // Server-side: use absolute URL to Next.js API
      const baseUrl = process.env.NEXT_PUBLIC_IS_DOCKER === 'true'
        ? 'http://frontend:3000'
        : 'http://localhost:3000';

      if (isDirectApiRoute) {
        // Direct API route - no proxy needed
        url = `${baseUrl}/${normalizedEndpoint}`;
      } else {
        // Backend endpoint - use proxy
        url = `${baseUrl}/api/proxy/${normalizedEndpoint}`;
      }
    } else {
      // Client-side: use relative URL
      if (isDirectApiRoute) {
        // Direct API route - no proxy needed
        url = `/${normalizedEndpoint}`;
      } else {
        // Backend endpoint - use proxy
        url = `/api/proxy/${normalizedEndpoint}`;
      }
    }

    logger.debug(`[fetchWithDomain] 🔍 Endpoint: ${endpoint}`);
    logger.debug(`[fetchWithDomain] 🔍 isDirectApiRoute: ${isDirectApiRoute}`);
    logger.debug(`[fetchWithDomain] ${isDirectApiRoute ? 'Direct' : 'Proxied'} URL: ${url}`);

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
      const isAuthError = response.status === 401 || response.status === 403;
      if (isAuthError && !redirectOnError) {
        logger.debug(`[fetchWithDomain] Auth error (${response.status}) - not redirecting`);
      } else {
        logger.error(`[fetchWithDomain] Error: ${response.status} ${response.statusText}`);
      }

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
    logger.debug(`[fetchWithDomain] Success`);

    return data as T;

  } catch (error) {
    logger.error('[fetchWithDomain] Exception:', error);

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


export const clientRefreshToken = async (): Promise<string | null> => null;
