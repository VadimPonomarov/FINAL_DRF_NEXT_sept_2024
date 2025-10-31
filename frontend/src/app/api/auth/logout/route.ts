/**
 * API endpoint для полного выхода из системы (SIGNOUT)
 * Очищает Redis токены и сессию NextAuth
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/configs/auth';
import { redis } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    console.log('[API /auth/logout] Received logout request');

    // Получаем сессию пользователя
    const session = await getServerSession(authConfig);

    // Очищаем Redis даже если сессии нет (на случай если токены остались)
    const userEmail = session?.user?.email;
    
    if (userEmail) {
      console.log('[API /auth/logout] Cleaning up for user:', userEmail);

      // Очищаем все данные в Redis для этого пользователя
      const providerKey = `provider:${userEmail}`;
      const tokensKey = `tokens:${userEmail}`;
      const autoRiaTokensKey = `autoria:tokens:${userEmail}`;
      const backendAuthKey = `backend_auth`;
      const dummyAuthKey = `dummy_auth`;

      try {
        // Удаляем все ключи из Redis
        await Promise.all([
          redis.del(providerKey),
          redis.del(tokensKey),
          redis.del(autoRiaTokensKey),
          redis.del(backendAuthKey),
          redis.del(dummyAuthKey),
        ]);

        console.log('[API /auth/logout] ✅ Redis data cleared for keys:', {
          providerKey,
          tokensKey,
          autoRiaTokensKey,
          backendAuthKey,
          dummyAuthKey,
        });
      } catch (redisError) {
        console.error('[API /auth/logout] ❌ Redis cleanup error:', redisError);
        // Продолжаем, даже если Redis не доступен
      }
    } else {
      console.log('[API /auth/logout] No session found, clearing general tokens');
      
      // Очищаем общие токены даже без сессии
      try {
        await Promise.all([
          redis.del('backend_auth'),
          redis.del('dummy_auth'),
        ]);
      } catch (redisError) {
        console.error('[API /auth/logout] ❌ Redis cleanup error:', redisError);
      }
    }

    // Удаляем cookies сессии
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // Очищаем cookies сессии NextAuth
    response.cookies.delete('next-auth.session-token');
    response.cookies.delete('__Secure-next-auth.session-token');
    response.cookies.delete('next-auth.csrf-token');
    response.cookies.delete('__Secure-next-auth.csrf-token');
    response.cookies.delete('next-auth.callback-url');
    response.cookies.delete('__Secure-next-auth.callback-url');

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

