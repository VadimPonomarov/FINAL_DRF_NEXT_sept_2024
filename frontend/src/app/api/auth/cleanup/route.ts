import { NextRequest, NextResponse } from 'next/server';

/**
 * API для очистки недействительных токенов аутентификации
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Auth Cleanup API] Starting cleanup of invalid tokens...');

    // Очищаем backend токены из Redis
    const redisResponse = await fetch(`${request.nextUrl.origin}/api/redis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        key: 'backend_auth', 
        value: null 
      })
    });

    if (!redisResponse.ok) {
      console.warn('[Auth Cleanup API] Failed to clear Redis tokens');
    } else {
      console.log('[Auth Cleanup API] Redis tokens cleared');
    }

    // Очищаем провайдер, если он был установлен в backend
    const providerResponse = await fetch(`${request.nextUrl.origin}/api/redis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        key: 'auth_provider', 
        value: 'dummy' // Возвращаем к dummy провайдеру
      })
    });

    if (!providerResponse.ok) {
      console.warn('[Auth Cleanup API] Failed to reset auth provider');
    } else {
      console.log('[Auth Cleanup API] Auth provider reset to dummy');
    }

    return NextResponse.json({
      success: true,
      message: 'Authentication tokens cleaned up successfully',
      actions: [
        'Cleared backend_auth tokens from Redis',
        'Reset auth_provider to dummy'
      ]
    });

  } catch (error: any) {
    console.error('[Auth Cleanup API] Error during cleanup:', error);

    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to cleanup auth tokens'
    }, { status: 500 });
  }
}
