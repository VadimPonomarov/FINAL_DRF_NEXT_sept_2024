/**
 * Simplified fetch helper for public API routes
 * Does not require authentication or Redis
 */

/**
 * Fetch data from Django backend without authentication
 * Used for public reference data endpoints
 */
export async function fetchPublicData<T = any>(
  endpoint: string,
  params?: Record<string, string>
): Promise<T | null> {
  try {
    // Get backend URL from environment
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // Build URL with parameters
    const urlParams = new URLSearchParams(params || {});
    const url = `${backendUrl}/${endpoint}${urlParams.toString() ? `?${urlParams.toString()}` : ''}`;

    console.log(`[Public Fetch] GET ${url}`);

    // Make request to Django backend
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error(`[Public Fetch] Error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    console.log(`[Public Fetch] Success`);

    return data;

  } catch (error) {
    console.error('[Public Fetch] Exception:', error);
    return null;
  }
}

