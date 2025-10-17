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
    // Use Docker service name if in Docker, otherwise localhost
    const isDocker = process.env.NEXT_PUBLIC_IS_DOCKER === 'true';
    const backendUrl = isDocker
      ? 'http://app:8000'  // Docker service name
      : (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000');

    // Build URL with parameters
    const urlParams = new URLSearchParams(params || {});
    const queryString = urlParams.toString() ? `?${urlParams.toString()}` : '';
    const url = `${backendUrl}/${endpoint}${queryString}`;

    console.log(`[Public Fetch] GET ${url}`);

    // Make request
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

