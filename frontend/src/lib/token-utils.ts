import { apiGetSession, apiSetSession } from './session-api';

/**
 * Token utilities for the new cookie/session scheme
 */

export interface TokenData {
  access: string;
  userId?: string;
  email?: string;
  loginAt?: number;
  expiresAt?: number;
  refreshAttempts?: number;
  lastRefreshTime?: number;
  lastRefreshFailed?: boolean;
}

/**
 * Get access token from Redis session
 */
export async function getAccessToken(key: string = 'backend_auth'): Promise<string | null> {
  try {
    const sessionData = await apiGetSession(key);
    if (!sessionData) return null;

    const tokenData: TokenData = typeof sessionData === 'string' 
      ? JSON.parse(sessionData) 
      : sessionData;

    return tokenData.access || null;
  } catch (error) {
    console.error('[getAccessToken] Error:', error);
    return null;
  }
}

/**
 * Save access token to Redis session
 */
export async function saveAccessToken(key: string, tokenData: TokenData, ttl: number = 3600): Promise<boolean> {
  try {
    return await apiSetSession(key, JSON.stringify(tokenData));
  } catch (error) {
    console.error('[saveAccessToken] Error:', error);
    return false;
  }
}

/**
 * Get full token data from Redis session
 */
export async function getTokenData(key: string = 'backend_auth'): Promise<TokenData | null> {
  try {
    const sessionData = await apiGetSession(key);
    if (!sessionData) return null;

    return typeof sessionData === 'string' 
      ? JSON.parse(sessionData) 
      : sessionData;
  } catch (error) {
    console.error('[getTokenData] Error:', error);
    return null;
  }
}
