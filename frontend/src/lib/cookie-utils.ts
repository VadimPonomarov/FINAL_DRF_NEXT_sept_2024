import { NextRequest, NextResponse } from 'next/server';

/**
 * Cookie utilities for token management
 */

export const COOKIE_NAMES = {
  REFRESH_TOKEN: 'refresh_token',
  AUTH_PROVIDER: 'auth_provider'
} as const;

export const COOKIE_OPTIONS = {
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 30 * 24 * 60 * 60 // 30 days
};

/**
 * Set refresh token in HTTP-only cookie
 */
export function setRefreshTokenCookie(response: NextResponse, refreshToken: string): void {
  response.cookies.set(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, COOKIE_OPTIONS);
}

/**
 * Set auth provider in cookie
 */
export function setAuthProviderCookie(response: NextResponse, provider: string): void {
  response.cookies.set(COOKIE_NAMES.AUTH_PROVIDER, provider, COOKIE_OPTIONS);
}

/**
 * Get refresh token from request cookies
 */
export function getRefreshTokenFromRequest(request: NextRequest): string | undefined {
  return request.cookies.get(COOKIE_NAMES.REFRESH_TOKEN)?.value;
}

/**
 * Get auth provider from request cookies
 */
export function getAuthProviderFromRequest(request: NextRequest): string | undefined {
  return request.cookies.get(COOKIE_NAMES.AUTH_PROVIDER)?.value;
}

/**
 * Clear auth cookies
 */
export function clearAuthCookies(response: NextResponse): void {
  response.cookies.delete(COOKIE_NAMES.REFRESH_TOKEN);
  response.cookies.delete(COOKIE_NAMES.AUTH_PROVIDER);
}

/**
 * Create response with cleared cookies (for logout)
 */
export function createLogoutResponse(): NextResponse {
  const response = NextResponse.json({ success: true });
  clearAuthCookies(response);
  return response;
}
