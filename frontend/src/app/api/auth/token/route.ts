import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import '@/lib/env-loader';

/**
 * API route для получения токенов из cookies/session
 * Больше не использует Redis - только httpOnly cookies + session
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Token API] Getting tokens from cookies/session...');

    // Получаем provider из localStorage (client-side) или default
    const provider = 'backend'; // Default provider

    // Проверяем токены в cookies
    const cookies = request.cookies;
    const accessToken = cookies.get('access_token')?.value;
    const refreshToken = cookies.get('refresh_token')?.value;
    
    // Получаем session из NextAuth
    const session = await getServerSession();
    
    if (!accessToken && !refreshToken) {
      console.debug('[Token API] No tokens found in cookies');
      return NextResponse.json({
        access: null,
        refresh: null,
        user: session?.user || null,
        provider
      });
    }

    console.log('[Token API] Successfully retrieved tokens from cookies', {
      hasAccess: !!accessToken,
      hasRefresh: !!refreshToken,
      hasUser: !!session?.user,
      userEmail: session?.user?.email
    });

    return NextResponse.json({
      access: accessToken || null,
      refresh: refreshToken || null,
      user: session?.user || null,
      provider,
      refreshAttempts: 0
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
 * Save tokens to httpOnly cookies
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { access, refresh } = body;

    if (!access) {
      return NextResponse.json({ error: 'Missing access token' }, { status: 400 });
    }

    const response = NextResponse.json({ success: true, message: 'Tokens saved' });
    response.cookies.set('access_token', access, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 });
    if (refresh) {
      response.cookies.set('refresh_token', refresh, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
    }
    return response;
  } catch (error) {
    console.error('[Token API] Error:', error);
    return NextResponse.json({ error: 'Failed to save tokens' }, { status: 500 });
  }
}

/**
 * Clear tokens from cookies
 */
export async function DELETE(_request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true, message: 'Tokens cleared' });
    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');
    return response;
  } catch (error) {
    console.error('[Token API] Error:', error);
    return NextResponse.json({ error: 'Failed to clear tokens' }, { status: 500 });
  }
}

