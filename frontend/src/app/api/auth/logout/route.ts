/**
 * API endpoint для LOGOUT (выход из backend)
 * Очищает ТОЛЬКО Redis токены, оставляет NextAuth сессию
 * После logout пользователь должен пойти на /login для получения новых токенов
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/configs/auth';
import { redis } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    console.log('[API /auth/logout] LOGOUT: Clearing backend tokens (keeping NextAuth session)');

    // Получаем сессию пользователя
    const session = await getServerSession(authConfig);

    // Очищаем Redis даже если сессии нет (на случай если токены остались)
    const userEmail = session?.user?.email;
    
    if (userEmail) {
      console.log('[API /auth/logout] Cleaning Redis for user:', userEmail);

      // Очищаем все backend токены в Redis для этого пользователя
      const providerKey = `provider:${userEmail}`;
      const tokensKey = `tokens:${userEmail}`;
      const autoRiaTokensKey = `autoria:tokens:${userEmail}`;
      const backendAuthKey = `backend_auth`;
      const dummyAuthKey = `dummy_auth`;

      try {
        // Удаляем все токены из Redis
        await Promise.all([
          redis.del(providerKey),
          redis.del(tokensKey),
          redis.del(autoRiaTokensKey),
          redis.del(backendAuthKey),
          redis.del(dummyAuthKey),
        ]);

        console.log('[API /auth/logout] ✅ Backend tokens cleared from Redis:', {
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

    // Возвращаем успех БЕЗ удаления cookies NextAuth (сессия сохраняется)
    return NextResponse.json({
      success: true,
      message: 'Backend tokens cleared, NextAuth session preserved',
    });
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

