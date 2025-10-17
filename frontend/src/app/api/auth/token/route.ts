import { NextRequest, NextResponse } from 'next/server';

/**
 * API route для получения токенов из Redis
 * Поддерживает оба провайдера: Backend и Dummy
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Token API] Getting tokens from Redis...');

    // Определяем текущий провайдер
    const providerResponse = await fetch(`${request.nextUrl.origin}/api/redis?key=auth_provider`);
    let authKey = 'backend_auth'; // default
    let provider = 'backend';

    if (providerResponse.ok) {
      const providerData = await providerResponse.json();
      if (providerData.exists && providerData.value === 'dummy') {
        authKey = 'dummy_auth';
        provider = 'dummy';
        console.log('[Token API] Using Dummy provider');
      } else {
        console.log('[Token API] Using Backend provider');
      }
    }

    // Получаем токены из Redis
    const redisResponse = await fetch(`${request.nextUrl.origin}/api/redis?key=${authKey}`);
    
    if (!redisResponse.ok) {
      console.error(`[Token API] Failed to get tokens from Redis for key: ${authKey}`);
      return NextResponse.json(
        { error: 'No tokens found in Redis', provider },
        { status: 404 }
      );
    }

    const redisData = await redisResponse.json();
    
    if (!redisData.exists || !redisData.value) {
      console.error(`[Token API] No tokens found in Redis for key: ${authKey}`);
      return NextResponse.json(
        { error: 'No tokens found in Redis', provider },
        { status: 404 }
      );
    }

    // Парсим токены
    const tokenData = typeof redisData.value === 'string' 
      ? JSON.parse(redisData.value) 
      : redisData.value;

    console.log(`[Token API] Successfully retrieved tokens for provider: ${provider}`);

    return NextResponse.json({
      access: tokenData.access,
      refresh: tokenData.refresh,
      provider,
      refreshAttempts: tokenData.refreshAttempts || 0
    });

  } catch (error) {
    console.error('[Token API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get tokens' },
      { status: 500 }
    );
  }
}

/**
 * API route для сохранения токенов в Redis
 * Поддерживает оба провайдера: Backend и Dummy
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { access, refresh, provider } = body;

    if (!access || !refresh) {
      return NextResponse.json(
        { error: 'Missing access or refresh token' },
        { status: 400 }
      );
    }

    console.log(`[Token API] Saving tokens for provider: ${provider || 'backend'}`);

    // Определяем ключ для сохранения
    const authKey = provider === 'dummy' ? 'dummy_auth' : 'backend_auth';

    // Сохраняем токены в Redis
    const tokenData = {
      access,
      refresh,
      refreshAttempts: 0
    };

    const redisResponse = await fetch(`${request.nextUrl.origin}/api/redis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: authKey,
        value: JSON.stringify(tokenData)
      })
    });

    if (!redisResponse.ok) {
      console.error(`[Token API] Failed to save tokens to Redis for key: ${authKey}`);
      return NextResponse.json(
        { error: 'Failed to save tokens to Redis' },
        { status: 500 }
      );
    }

    // Сохраняем провайдер в Redis
    const providerResponse = await fetch(`${request.nextUrl.origin}/api/redis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'auth_provider',
        value: provider || 'backend'
      })
    });

    if (!providerResponse.ok) {
      console.warn('[Token API] Failed to save provider to Redis');
    }

    console.log(`[Token API] Successfully saved tokens for provider: ${provider || 'backend'}`);

    return NextResponse.json({
      success: true,
      provider: provider || 'backend',
      message: 'Tokens saved successfully'
    });

  } catch (error) {
    console.error('[Token API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save tokens' },
      { status: 500 }
    );
  }
}

/**
 * API route для удаления токенов из Redis
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log('[Token API] Deleting tokens from Redis...');

    // Определяем текущий провайдер
    const providerResponse = await fetch(`${request.nextUrl.origin}/api/redis?key=auth_provider`);
    let authKey = 'backend_auth'; // default

    if (providerResponse.ok) {
      const providerData = await providerResponse.json();
      if (providerData.exists && providerData.value === 'dummy') {
        authKey = 'dummy_auth';
      }
    }

    // Удаляем токены из Redis
    const redisResponse = await fetch(`${request.nextUrl.origin}/api/redis`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: authKey })
    });

    if (!redisResponse.ok) {
      console.error(`[Token API] Failed to delete tokens from Redis for key: ${authKey}`);
      return NextResponse.json(
        { error: 'Failed to delete tokens from Redis' },
        { status: 500 }
      );
    }

    console.log(`[Token API] Successfully deleted tokens for key: ${authKey}`);

    return NextResponse.json({
      success: true,
      message: 'Tokens deleted successfully'
    });

  } catch (error) {
    console.error('[Token API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete tokens' },
      { status: 500 }
    );
  }
}

