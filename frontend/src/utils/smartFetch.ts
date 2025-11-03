/**
 * Smart fetch wrapper that automatically uses fetchWithAuth for protected endpoints
 * and regular fetch for public endpoints.
 * 
 * This ensures proper 401 error handling with automatic token refresh and redirect to login.
 */

import { fetchWithAuth } from './fetchWithAuth';

// Simple client-side in-memory cache (browser only)
type CacheEntry = { body: string; status: number; headers: Record<string, string>; expiresAt: number };
const SMART_CACHE_TTL_MS = 300_000; // 5 minutes
const smartCache: Map<string, CacheEntry> = typeof window !== 'undefined' ? (window as any).__smartFetchCache__ || new Map() : new Map();
if (typeof window !== 'undefined' && !(window as any).__smartFetchCache__) {
  (window as any).__smartFetchCache__ = smartCache;
}

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
  // Determine method
  const method = (init?.method || 'GET').toUpperCase();

  if (requiresAuth(input)) {
    console.log('[smartFetch] Using fetchWithAuth for protected endpoint:', input);
    return fetchWithAuth(input, init);
  } else {
    // Client-side cache only for GET requests and when not explicitly disabled
    const cacheable = typeof window !== 'undefined' && method === 'GET' && init?.cache !== 'no-store';

    // Normalize URL for cache key (sort params)
    const toKey = (inp: RequestInfo | URL) => {
      const urlString = typeof inp === 'string' ? inp : inp instanceof Request ? inp.url : inp.toString();
      try {
        const u = new URL(urlString, window.location.origin);
        const params = Array.from(u.searchParams.entries()).sort(([a], [b]) => a.localeCompare(b));
        const sp = new URLSearchParams(params);
        u.search = sp.toString();
        return u.toString();
      } catch {
        return urlString;
      }
    };

    if (cacheable && PUBLIC_PATTERNS.some(p => {
      const urlString = typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString();
      try { return p.test(new URL(urlString, window.location.origin).pathname); } catch { return p.test(urlString); }
    })) {
      const key = toKey(input);
      const now = Date.now();
      const cached = smartCache.get(key);
      if (cached && cached.expiresAt > now) {
        console.log('[smartFetch] Returning cached public response for:', key);
        return new Response(cached.body, { status: cached.status, headers: cached.headers });
      }

      // Fetch and cache
      const resp = await fetch(input, { ...init, cache: 'no-store' });
      const text = await resp.text();
      // Store basic headers
      const headers: Record<string, string> = {
        'Content-Type': resp.headers.get('Content-Type') || 'application/json'
      };
      if (resp.ok) {
        smartCache.set(key, { body: text, status: resp.status, headers, expiresAt: now + SMART_CACHE_TTL_MS });
      }
      return new Response(text, { status: resp.status, headers });
    }

    console.log('[smartFetch] Using regular fetch for public endpoint:', input);
    return fetch(input, init);
  }
}

/**
 * Export for testing purposes
 */
export { requiresAuth };

