/**
 * API endpoint для LOGOUT (выход из backend)
 * Новая схема:
 * - Очищает HTTP-only cookies (refresh token, auth provider)
 * - Очищает Redis сессию (access token)
 * - Оставляет NextAuth сессию если нужно
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/configs/auth';
import { clearAuthCookies } from '@/lib/cookie-utils';

async function deleteRedisKeys(nextUrl: NextRequest['nextUrl'], keys: string[]) {
  await Promise.all(
    keys.map(async (key) => {
      try {
        const url = new URL(`${nextUrl.origin}/api/redis`);
        url.searchParams.set('key', key);

        const response = await fetch(url.toString(), {
          method: 'DELETE',
          cache: 'no-store',
        });

        if (!response.ok) {
          console.warn('[API /auth/logout] ⚠️ Failed to delete Redis key:', key, response.status);
        }
      } catch (error) {
        console.error('[API /auth/logout] ❌ Error deleting Redis key:', key, error);
      }
    })
  );
}

export async function POST(request: NextRequest) {
  try {
    console.log('[API /auth/logout] LOGOUT: Clearing cookies and session data');

    // Получаем сессию пользователя
    const session = await getServerSession(authConfig);
    const userEmail = session?.user?.email;
    
    if (userEmail) {
      console.log('[API /auth/logout] Cleaning Redis for user:', userEmail);

      // Очищаем все backend токены в Redis для этого пользователя
      const providerKey = `provider:${userEmail}`;
      const tokensKey = `tokens:${userEmail}`;
      const autoRiaTokensKey = `autoria:tokens:${userEmail}`;
      const backendAuthKey = `backend_auth`;
      const dummyAuthKey = `dummy_auth`;

      await deleteRedisKeys(request.nextUrl, [
        providerKey,
        tokensKey,
        autoRiaTokensKey,
        backendAuthKey,
        dummyAuthKey,
      ]);
      console.log('[API /auth/logout] ✅ Backend tokens cleared from Redis:', {
        providerKey,
        tokensKey,
        autoRiaTokensKey,
        backendAuthKey,
        dummyAuthKey,
      });
    } else {
      console.log('[API /auth/logout] No session found, clearing general tokens');
      
      // Очищаем общие токены даже без сессии
      await deleteRedisKeys(request.nextUrl, ['backend_auth', 'dummy_auth']);
    }

    // Создаем ответ с очищенными cookies
    const response = NextResponse.json({
      success: true,
      message: 'Backend tokens and cookies cleared, NextAuth session preserved',
    });

    // Очищаем HTTP-only cookies
    clearAuthCookies(response);

    return response;
  } catch (error) {
    console.error('[API /auth/logout] ❌ Logout error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

