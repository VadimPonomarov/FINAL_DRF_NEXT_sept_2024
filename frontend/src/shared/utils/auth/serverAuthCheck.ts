import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/configs/auth';
import { redis } from '@/lib/redis';

/**
 * Серверная утилита для проверки авторизации в Server Components и Server Actions
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * ДВУХРІВНЕВА ПЕРЕВІРКА:
 * 1. NextAuth сесія (cookies)
 * 2. Backend токени (Redis)
 * 
 * При отсутствии чего-либо делает SERVER REDIRECT по приоритетам:
 * - Нет NextAuth сесії → /api/auth/signin
 * - Нет backend токенів → /login
 * 
 * ИСПОЛЬЗОВАНИЕ в Server Component:
 * ```typescript
 * export default async function AutoRiaPage() {
 *   await requireAutoRiaAuth(); // Проверка + redirect если нет авторизации
 *   
 *   // Код страницы выполнится только если авторизация OK
 *   return <div>Protected content</div>;
 * }
 * ```
 * 
 * ИСПОЛЬЗОВАНИЕ в Server Action:
 * ```typescript
 * 'use server';
 * export async function myServerAction() {
 *   await requireAutoRiaAuth(); // Проверка + redirect если нет авторизации
 *   
 *   // Код действия выполнится только если авторизация OK
 *   return { success: true };
 * }
 * ```
 */

/**
 * Проверяет наличие NextAuth сесії и backend токенів для доступа к AutoRia
 * @param callbackUrl - URL для редиректа после входа (по умолчанию текущий путь)
 * @throws Redirect - делает server redirect если авторизация отсутствует
 */
export async function requireAutoRiaAuth(callbackUrl?: string): Promise<void> {
  console.log('[ServerAuthCheck] Checking authorization for AutoRia...');
  
  // УРОВЕНЬ 1: Проверка NextAuth сесії
  const session = await getServerSession(authConfig);
  
  if (!session?.user?.email) {
    console.log('[ServerAuthCheck] ❌ No NextAuth session - redirecting to signin');
    const signinUrl = `/api/auth/signin${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`;
    redirect(signinUrl);
  }
  
  console.log('[ServerAuthCheck] ✅ NextAuth session found:', session.user.email);
  
  // УРОВЕНЬ 2: Проверка backend токенів в Redis
  try {
    const backendAuthData = await redis.get('backend_auth');
    
    if (!backendAuthData) {
      console.log('[ServerAuthCheck] ❌ No backend tokens in Redis - redirecting to /login');
      const loginUrl = `/login${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`;
      redirect(loginUrl);
    }
    
    // Парсим токены
    const tokenData = typeof backendAuthData === 'string' 
      ? JSON.parse(backendAuthData) 
      : backendAuthData;
    
    if (!tokenData.access) {
      console.log('[ServerAuthCheck] ❌ No access token in Redis - redirecting to /login');
      const loginUrl = `/login${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`;
      redirect(loginUrl);
    }
    
    console.log('[ServerAuthCheck] ✅ Backend tokens found - access granted');
    
  } catch (error) {
    console.error('[ServerAuthCheck] ❌ Error checking backend tokens:', error);
    const loginUrl = `/login${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`;
    redirect(loginUrl);
  }
}

/**
 * Получает текущую сесію NextAuth (только чтение, без redirect)
 * @returns Session или null если сесія отсутствует
 */
export async function getAuthSession() {
  return await getServerSession(authConfig);
}

/**
 * Получает backend токены из Redis (только чтение, без redirect)
 * @returns Токены или null если отсутствуют
 */
export async function getBackendTokens(): Promise<{ access: string; refresh: string } | null> {
  try {
    const backendAuthData = await redis.get('backend_auth');
    
    if (!backendAuthData) {
      return null;
    }
    
    const tokenData = typeof backendAuthData === 'string' 
      ? JSON.parse(backendAuthData) 
      : backendAuthData;
    
    if (!tokenData.access) {
      return null;
    }
    
    return {
      access: tokenData.access,
      refresh: tokenData.refresh || ''
    };
  } catch (error) {
    console.error('[ServerAuthCheck] Error getting backend tokens:', error);
    return null;
  }
}
