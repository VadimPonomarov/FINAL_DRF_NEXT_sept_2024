/**
 * API endpoint для полной очистки авторизации в Redis
 * Очищает провайдеры и токены текущего пользователя
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/configs/auth';
import { redis } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    console.log('[API /auth/cleanup] Received cleanup request');

    // Получаем сессию пользователя
    const session = await getServerSession(authConfig);

    if (!session?.user?.email) {
      console.log('[API /auth/cleanup] No session found');
      return NextResponse.json(
        { success: false, error: 'No active session' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;
    console.log('[API /auth/cleanup] Cleaning up for user:', userEmail);

    // Очищаем данные в Redis
    const providerKey = `provider:${userEmail}`;
    const tokensKey = `tokens:${userEmail}`;
    const autoRiaTokensKey = `autoria:tokens:${userEmail}`;

    try {
      // Удаляем ключи из Redis
      await Promise.all([
        redis.del(providerKey),
        redis.del(tokensKey),
        redis.del(autoRiaTokensKey),
      ]);

      console.log('[API /auth/cleanup] ✅ Redis data cleared for keys:', {
        providerKey,
        tokensKey,
        autoRiaTokensKey,
      });
    } catch (redisError) {
      console.error('[API /auth/cleanup] ❌ Redis cleanup error:', redisError);
      // Продолжаем, даже если Redis не доступен
    }

    return NextResponse.json({
      success: true,
      message: 'Authentication data cleared successfully',
    });
  } catch (error) {
    console.error('[API /auth/cleanup] ❌ Cleanup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
