import { NextRequest, NextResponse } from 'next/server';

/**
 * API /api/autoria/users
 * Прокси-эндпоинт для получения списка активных пользователей из Backend.
 * ВАЖНО: использует публичный backend endpoint, токены не требуются.
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[AutoRia Users API - proxy] Getting users...');

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // Аккуратно собираем URL, чтобы избежать двойного "/api"
    const base = backendUrl.replace(/\/$/, '');
    const hasApi = /\/api\/?$/.test(base);
    const apiBase = hasApi ? base : `${base}/api`;

    const usersResponse = await fetch(`${apiBase}/users/public/list/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!usersResponse.ok) {
      const errorText = await usersResponse.text();
      console.error('[AutoRia Users API - proxy] Backend error:', usersResponse.status, errorText);
      return NextResponse.json({ success: false, error: 'Backend error', details: errorText }, { status: usersResponse.status });
    }

    const usersData = await usersResponse.json();
    const allUsers = usersData.results || usersData || [];
    const activeUsers = allUsers.filter((u: any) => u.is_active);

    return NextResponse.json({
      success: true,
      data: { results: activeUsers, count: activeUsers.length },
      source: 'backend',
    });
  } catch (error) {
    console.error('[AutoRia Users API - proxy] Error:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
