/**
 * API endpoint для LOGOUT (выход из backend)
 * Очищает ТОЛЬКО Redis токены, оставляет NextAuth сессию
 * После logout пользователь должен пойти на /login для получения новых токенов
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/configs/auth';
import { deleteRedisKeys } from '../redis-cleanup.helper';

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

