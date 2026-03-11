import { NextRequest } from 'next/server';

interface AuthenticatedFetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

interface TokenData {
  access: string;
  refresh: string;
}

/**
 * Server-side utility for making authenticated requests with automatic token refresh
 */
export class ServerAuthManager {
  /**
   * Get current auth provider from Redis
   */
  private static async getAuthProvider(request: NextRequest): Promise<'backend' | 'dummy'> {
    try {
      // provider check removed - using cookies
      // Redis removed - always return default
    } catch (error) {
      console.error('[ServerAuth] Error getting provider:', error);
    }
    return 'backend'; // default
  }

  private static async getTokensFromRedis(request: NextRequest): Promise<TokenData | null> {
    try {
      console.log('[ServerAuth] 🔍 Getting tokens from Redis...');

      // Определяем провайдер
      const provider = await this.getAuthProvider(request);
      const authKey = provider === 'dummy' ? 'dummy_auth' : 'backend_auth';
      console.log('[ServerAuth] 🔍 Using provider:', provider, 'with key:', authKey);

      const redisUrl = `${request.nextUrl.origin}/api/redis?key=${authKey}`;
      console.log('[ServerAuth] 🔍 Redis URL:', redisUrl);

      const redisResponse = await fetch(redisUrl);
      console.log('[ServerAuth] 🔍 Redis response status:', redisResponse.status);

      if (!redisResponse.ok) {
        console.error('[ServerAuth] Failed to get tokens from Redis');
        return null;
      }

      const redisData = await redisResponse.json();
      console.log('[ServerAuth] 🔍 Redis data exists:', redisData.exists);
      console.log('[ServerAuth] 🔍 Redis value present:', !!redisData.value);

      if (!redisData.exists || !redisData.value) {
        console.error('[ServerAuth] No auth data found in Redis');
        return null;
      }

      const authData = JSON.parse(redisData.value);
      console.log('[ServerAuth] 🔍 Auth data parsed successfully');
      console.log('[ServerAuth] 🔍 Access token present:', !!authData.access);
      console.log('[ServerAuth] 🔍 Refresh token present:', !!authData.refresh);

      if (!authData.access || !authData.refresh) {
        console.error('[ServerAuth] Invalid token data in Redis');
        return null;
      }

      console.log('[ServerAuth] ✅ Tokens retrieved successfully');
      return {
        access: authData.access,
        refresh: authData.refresh
      };
    } catch (error) {
      console.error('[ServerAuth] Error getting tokens from Redis:', error);
      return null;
    }
  }

  private static async refreshToken(request: NextRequest, refreshToken: string): Promise<string | null> {
    try {
      console.log('[ServerAuth] Attempting to refresh token via internal API route...');

      // Use internal Next.js API route which handles provider specifics and Redis writes
      const refreshUrl = `${request.nextUrl.origin}/api/auth/refresh`;
      const refreshResponse = await fetch(refreshUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Our internal route reads refresh from Redis; still pass it for completeness
        body: JSON.stringify({ refresh: refreshToken }),
        cache: 'no-store'
      });

      if (!refreshResponse.ok) {
        console.error('[ServerAuth] Token refresh failed:', refreshResponse.status);
        return null;
      }

      const data = await refreshResponse.json();
      const access = data?.access;
      const newRefresh = data?.refresh || refreshToken;

      if (!access) {
        console.error('[ServerAuth] No access token in refresh response');
        return null;
      }

      // Определяем провайдер для правильного ключа
      const provider = await this.getAuthProvider(request);
      const authKey = provider === 'dummy' ? 'dummy_auth' : 'backend_auth';
      console.log('[ServerAuth] Storing refreshed tokens with key:', authKey);

      // Persist back to Redis for consistency (route already does it, but double-ensure)
      // Redis call removed

      console.log('[ServerAuth] Token refreshed and stored in Redis via internal route');
      return access;
    } catch (error) {
      console.error('[ServerAuth] Error refreshing token:', error);
      return null;
    }
  }

  private static isTokenExpired(token: string): boolean {
    try {
      const base64Url = token.split('.')[1];
      if (!base64Url) {
        console.error('[ServerAuth] Invalid token format - missing payload');
        return true;
      }
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      // Use Buffer in Node.js; fallback to atob when available (edge/runtime)
      let jsonPayload: string;
      if (typeof (globalThis as any).atob === 'function') {
        jsonPayload = decodeURIComponent(
          (globalThis as any).atob(base64)
            .split('')
            .map((c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
      } else {
        jsonPayload = Buffer.from(base64, 'base64').toString('utf-8');
      }

      const { exp } = JSON.parse(jsonPayload);
      const expired = Date.now() >= exp * 1000 - 30000; // 30 seconds buffer
      return expired;
    } catch (error) {
      console.error('[ServerAuth] Error checking token expiration:', error);
      return true;
    }
  }

  /**
   * Make an authenticated request with automatic token refresh
   */
  static async authenticatedFetch(
    request: NextRequest,
    url: string,
    options: AuthenticatedFetchOptions = {}
  ): Promise<Response> {
    // Read tokens directly from request cookies (httpOnly cookies set by /api/auth/login)
    let accessToken = request.cookies.get('access_token')?.value;
    const refreshToken = request.cookies.get('refresh_token')?.value;

    // If access token is missing but refresh token exists, try to refresh
    if (!accessToken && refreshToken) {
      console.log('[ServerAuth] access_token missing, trying refresh...');
      const newAccessToken = await this.refreshToken(request, refreshToken);
      if (newAccessToken) {
        accessToken = newAccessToken;
        console.log('[ServerAuth] ✅ Token refreshed successfully');
      }
    }

    if (!accessToken) {
      throw new Error('No authentication tokens available. Please login again.');
    }

    // Check if access token is expired and refresh if needed
    if (this.isTokenExpired(accessToken)) {
      console.log('[ServerAuth] Access token expired, refreshing...');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      const newAccessToken = await this.refreshToken(request, refreshToken);
      
      if (!newAccessToken) {
        throw new Error('Failed to refresh access token');
      }
      
      accessToken = newAccessToken;
    }

    // Make the authenticated request
    const isFormData = (options as any)?.body instanceof FormData;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      ...(options.headers || {} as Record<string, string>),
    };
    // Set JSON content-type only when not sending FormData and when not provided explicitly
    if (!isFormData && !('Content-Type' in headers)) {
      headers['Content-Type'] = 'application/json';
    }

    // Ensure signal is preserved from options
    const fetchOptions: RequestInit = {
      ...options,
      headers,
    };

    const response = await fetch(url, fetchOptions);

    // If we get 401, try to refresh token and retry once
    if (response.status === 401) {
      console.log('[ServerAuth] Got 401, attempting token refresh...');
      
      const newAccessToken = await this.refreshToken(request, refreshToken || '');
      if (!newAccessToken) {
        throw new Error('Authentication failed - unable to refresh token');
      }

      // Retry the request with new token (preserve signal from original options)
      const retryHeaders = {
        ...headers,
        'Authorization': `Bearer ${newAccessToken}`,
      };

      return await fetch(url, {
        ...options,
        headers: retryHeaders,
        // Preserve signal for retry as well
        signal: options.signal,
      });
    }

    return response;
  }

  /**
   * Check if user is authenticated (has valid tokens)
   */
  static async isAuthenticated(request: NextRequest): Promise<boolean> {
    console.log('[ServerAuth] 🔍 Checking authentication...');
    
    // Read access_token directly from request cookies (httpOnly cookie set by /api/auth/login)
    const accessToken = request.cookies.get('access_token')?.value;
    const hasToken = !!accessToken;
    
    console.log('[ServerAuth] 🔍 Access token in cookie:', hasToken);
    return hasToken;
  }

  /**
   * Get user ID from access token
   */
  static async getUserId(request: NextRequest): Promise<string | null> {
    // Read access token directly from httpOnly cookie
    const accessToken = request.cookies.get('access_token')?.value;
    if (!accessToken) {
      console.error('[ServerAuth] No access_token cookie available for getUserId');
      return null;
    }

    try {
      // Decode the access token to get user ID
      const base64Url = accessToken.split('.')[1];
      if (!base64Url) {
        console.error('[ServerAuth] Invalid token format - missing payload');
        return null;
      }
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

      // Use Buffer in Node.js; fallback to atob when available (edge/runtime)
      let jsonPayload: string;
      if (typeof (globalThis as any).atob === 'function') {
        jsonPayload = decodeURIComponent(
          (globalThis as any).atob(base64)
            .split('')
            .map((c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
      } else {
        jsonPayload = Buffer.from(base64, 'base64').toString('utf-8');
      }

      const payload = JSON.parse(jsonPayload);
      console.log('[ServerAuth] Token payload:', { user_id: payload.user_id, email: payload.email });
      return payload.user_id ? payload.user_id.toString() : null;
    } catch (error) {
      console.error('[ServerAuth] Error decoding token for user ID:', error);
      return null;
    }
  }

  /**
   * Clear authentication tokens (logout)
   */
  static async clearTokens(request: NextRequest): Promise<void> {
    try {
      // Redis call removed
      console.log('[ServerAuth] Tokens cleared from Redis');
    } catch (error) {
      console.error('[ServerAuth] Error clearing tokens:', error);
    }
  }
}
