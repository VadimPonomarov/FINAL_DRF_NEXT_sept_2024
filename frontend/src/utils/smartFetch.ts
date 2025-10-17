/**
 * Smart fetch wrapper that automatically uses fetchWithAuth for protected endpoints
 * and regular fetch for public endpoints.
 * 
 * This ensures proper 401 error handling with automatic token refresh and redirect to login.
 */

import { fetchWithAuth } from './fetchWithAuth';

/**
 * List of endpoint patterns that require authentication
 */
const PROTECTED_PATTERNS = [
  /^\/api\/autoria\//,
  /^\/api\/ads\//,
  /^\/api\/user\//,
  /^\/api\/tracking\//,
];

/**
 * List of endpoint patterns that are always public (no auth needed)
 */
const PUBLIC_PATTERNS = [
  /^\/api\/public\//,
  /^\/api\/auth\//,
  /^\/api\/redis/,
];

/**
 * Determines if an endpoint requires authentication
 */
function requiresAuth(url: string | URL | Request): boolean {
  const urlString = typeof url === 'string' ? url : url instanceof Request ? url.url : url.toString();
  
  // Extract pathname from full URL or use as-is if it's already a path
  let pathname: string;
  try {
    const urlObj = new URL(urlString, 'http://localhost');
    pathname = urlObj.pathname;
  } catch {
    pathname = urlString;
  }

  // Check if it's explicitly public
  if (PUBLIC_PATTERNS.some(pattern => pattern.test(pathname))) {
    return false;
  }

  // Check if it's explicitly protected
  if (PROTECTED_PATTERNS.some(pattern => pattern.test(pathname))) {
    return true;
  }

  // Default: assume public for safety (won't break existing functionality)
  return false;
}

/**
 * Smart fetch that automatically uses fetchWithAuth for protected endpoints
 * 
 * Usage:
 * ```typescript
 * // Automatically uses fetchWithAuth for /api/autoria/*
 * const response = await smartFetch('/api/autoria/cars/123');
 * 
 * // Uses regular fetch for /api/public/*
 * const response = await smartFetch('/api/public/reference/brands');
 * ```
 */
export async function smartFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  if (requiresAuth(input)) {
    console.log('[smartFetch] Using fetchWithAuth for protected endpoint:', input);
    return fetchWithAuth(input, init);
  } else {
    console.log('[smartFetch] Using regular fetch for public endpoint:', input);
    return fetch(input, init);
  }
}

/**
 * Export for testing purposes
 */
export { requiresAuth };

