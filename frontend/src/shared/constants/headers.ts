import { HEADERS } from "@/shared/constants/constants";

/**
 * Проверяет, истёк ли JWT токен
 */
function isTokenExpired(token: string, bufferSeconds: number = 300): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < (currentTime + bufferSeconds);
  } catch {
    return true;
  }
}

// Optional baseUrlOverride lets API routes pass request.nextUrl.origin for reliability
export const getAuthorizationHeaders = async (baseUrlOverride?: string): Promise<Record<string, string>> => {
  try {
    const baseUrl = baseUrlOverride || process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const redisUrl = `${baseUrl}/api/redis?key=backend_auth`;

    let accessToken: string | undefined;
    try {
      const response = await fetch(redisUrl, { signal: controller.signal, cache: 'no-store' });
      clearTimeout(timeoutId);

      if (response.ok) {
        const responseData = await response.json();
        const { value: authData } = responseData || {};
        if (authData) {
          const parsedData = typeof authData === 'string' ? JSON.parse(authData) : authData;
          accessToken = parsedData?.access || parsedData?.token || parsedData?.access_token;
          
          // ПРОАКТИВНАЯ ПРОВЕРКА: если токен истёк, обновляем его СРАЗУ
          if (accessToken && isTokenExpired(accessToken)) {
            console.log('[getAuthorizationHeaders] Access token expired, refreshing proactively...');
            const refreshResp = await fetch(`${baseUrl}/api/auth/refresh`, { method: 'POST', cache: 'no-store' });
            if (refreshResp.ok) {
              const refreshData = await refreshResp.json().catch(() => ({} as any));
              accessToken = refreshData?.access;
              console.log('[getAuthorizationHeaders] Token refreshed successfully');
            } else {
              console.warn('[getAuthorizationHeaders] Token refresh failed:', refreshResp.status);
            }
          }
        }
      }

      // If no token found, try to refresh once via internal API
      if (!accessToken) {
        const refreshResp = await fetch(`${baseUrl}/api/auth/refresh`, { method: 'POST', cache: 'no-store' });
        if (refreshResp.ok) {
          const data = await refreshResp.json().catch(() => ({} as any));
          accessToken = data?.access;
        }
      }
    } catch (_err) {
      clearTimeout(timeoutId);
      // ignore; fall back to default headers below
    }

    const common = {
      ...HEADERS,
      "Content-Type": "application/json",
    } as Record<string, string>;

    if (!accessToken) return common;

    return {
      ...common,
      Authorization: `Bearer ${accessToken}`,
    };
  } catch (_error) {
    return {
      ...HEADERS,
      "Content-Type": "application/json",
    };
  }
};