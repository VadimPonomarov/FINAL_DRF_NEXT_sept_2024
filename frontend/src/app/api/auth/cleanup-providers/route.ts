/**
 * API endpoint для очистки только провайдеров в Redis
 * Используется при переключении провайдеров
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/configs/auth';
import { redis } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    console.log('[API /auth/cleanup-providers] Received cleanup providers request');

    // Получаем сессию пользователя
    const session = await getServerSession(authConfig);

    if (!session?.user?.email) {
      console.log('[API /auth/cleanup-providers] No session found');
      return NextResponse.json(
        { success: false, error: 'No active session' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;
    console.log('[API /auth/cleanup-providers] Cleaning providers for user:', userEmail);

    // Очищаем только провайдеры
    const providerKey = `provider:${userEmail}`;

    try {
      await redis.del(providerKey);
      console.log('[API /auth/cleanup-providers] ✅ Provider cleared:', providerKey);
    } catch (redisError) {
      console.error('[API /auth/cleanup-providers] ❌ Redis error:', redisError);
      // Продолжаем, даже если Redis не доступен
    }

    return NextResponse.json({
      success: true,
      message: 'Providers cleared successfully',
    });
  } catch (error) {
    console.error('[API /auth/cleanup-providers] ❌ Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

