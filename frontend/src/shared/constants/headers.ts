import { HEADERS } from "@/shared/constants/constants";
import { getAccessToken } from "@/lib/token-utils";
import type { NextRequest } from 'next/server';

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
// Optional req: if passed, reads access_token cookie directly (server-side routes)
export const getAuthorizationHeaders = async (baseUrlOverride?: string, req?: NextRequest): Promise<Record<string, string>> => {
  try {
    const baseUrl = baseUrlOverride || process.env.NEXTAUTH_URL || 'http://localhost:3000';

    let accessToken: string | undefined;
    try {
      // Priority 1: read directly from request cookies (server-side API routes)
      if (req) {
        accessToken = req.cookies.get('access_token')?.value || undefined;
      }
      // Priority 2: fall back to session/cookie API chain
      if (!accessToken) {
        accessToken = await getAccessToken('backend_auth') || undefined;
      }
      
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

      // If no token found, try to refresh once via internal API
      if (!accessToken) {
        const refreshResp = await fetch(`${baseUrl}/api/auth/refresh`, { method: 'POST', cache: 'no-store' });
        if (refreshResp.ok) {
          const data = await refreshResp.json().catch(() => ({} as any));
          accessToken = data?.access;
        }
      }
    } catch (_err) {
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
