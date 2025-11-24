/**
 * API endpoint для SIGNOUT (полный выход)
 * Очищает Redis токены И NextAuth сессию
 * После signout пользователь должен пойти на /api/auth/signin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/configs/auth';
import { deleteRedisKeys } from '../redis-cleanup.helper';

export async function POST(request: NextRequest) {
  try {
    console.log('[API /auth/signout-full] SIGNOUT: Full cleanup (Redis + NextAuth session)');

    // Получаем сессию пользователя
    const session = await getServerSession(authConfig);

    // Очищаем Redis даже если сессии нет
    const userEmail = session?.user?.email;
    
    if (userEmail) {
      console.log('[API /auth/signout-full] Cleaning up for user:', userEmail);

      // Очищаем все данные в Redis для этого пользователя через API
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

      console.log('[API /auth/signout-full] ✅ Redis data cleared for keys:', {
        providerKey,
        tokensKey,
        autoRiaTokensKey,
        backendAuthKey,
        dummyAuthKey,
      });
    } else {
      console.log('[API /auth/signout-full] No session found, clearing general tokens');
      
      // Очищаем общие токены даже без сессии через API
      await deleteRedisKeys(request.nextUrl, ['backend_auth', 'dummy_auth']);
    }

    // Удаляем cookies сессии NextAuth
    const response = NextResponse.json({
      success: true,
      message: 'Signed out successfully (Redis + NextAuth session cleared)',
    });

    // Очищаем все cookies NextAuth
    response.cookies.delete('next-auth.session-token');
    response.cookies.delete('__Secure-next-auth.session-token');
    response.cookies.delete('next-auth.csrf-token');
    response.cookies.delete('__Secure-next-auth.csrf-token');
    response.cookies.delete('next-auth.callback-url');
    response.cookies.delete('__Secure-next-auth.callback-url');

    console.log('[API /auth/signout-full] ✅ SIGNOUT completed');
    
    return response;
  } catch (error) {
    console.error('[API /auth/signout-full] ❌ Signout error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
