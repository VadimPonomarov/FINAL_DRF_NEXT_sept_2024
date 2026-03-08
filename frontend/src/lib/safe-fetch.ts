/**
 * Safe fetch wrapper that prevents API calls before authentication
 * Silently ignores errors during initialization to avoid console spam
 */

let isAuthenticated = false;
let authCheckPromise: Promise<boolean> | null = null;

// Check if user is authenticated
async function checkAuth(): Promise<boolean> {
  if (authCheckPromise) {
    return authCheckPromise;
  }

  authCheckPromise = (async () => {
    try {
      // Check if we have any auth cookies
      if (typeof document !== 'undefined') {
        const hasCookies = document.cookie.includes('next-auth') || 
                          document.cookie.includes('access') ||
                          document.cookie.includes('refresh');
        isAuthenticated = hasCookies;
        return hasCookies;
      }
      return false;
    } catch {
      return false;
    } finally {
      authCheckPromise = null;
    }
  })();

  return authCheckPromise;
}

// Mark user as authenticated (call after successful login)
export function markAuthenticated() {
  isAuthenticated = true;
}

// Reset authentication state (call after logout)
export function resetAuthentication() {
  isAuthenticated = false;
}

/**
 * Safe fetch that only executes if user is authenticated
 * Returns null if not authenticated instead of throwing errors
 */
export async function safeFetch(
  url: string,
  options?: RequestInit,
  requireAuth: boolean = true
): Promise<Response | null> {
  // If auth is not required, proceed normally
  if (!requireAuth) {
    return fetch(url, options);
  }

  // Check authentication status
  const authenticated = await checkAuth();
  
  if (!authenticated) {
    // Silently return null instead of making the request
    console.debug(`[safeFetch] Skipping ${url} - not authenticated`);
    return null;
  }

  try {
    return await fetch(url, options);
  } catch (error) {
    // Only log auth-related errors
    if (error instanceof Response) {
      if (error.status === 401 || error.status === 403) {
        console.warn(`[safeFetch] Auth error ${error.status} for ${url}`);
        isAuthenticated = false;
      }
    }
    throw error;
  }
}

/**
 * Safe fetch with JSON parsing
 */
export async function safeFetchJSON<T>(
  url: string,
  options?: RequestInit,
  requireAuth: boolean = true
): Promise<T | null> {
  const response = await safeFetch(url, options, requireAuth);
  
  if (!response) {
    return null;
  }

  if (!response.ok) {
    // Only log auth errors
    if (response.status === 401 || response.status === 403) {
      console.warn(`[safeFetchJSON] Auth error ${response.status} for ${url}`);
    }
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}
