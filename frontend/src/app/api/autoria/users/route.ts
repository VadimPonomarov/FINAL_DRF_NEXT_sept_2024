import { NextRequest, NextResponse } from 'next/server';

/**
 * API /api/autoria/users
 * Прокси-эндпоинт для получения списка активных пользователей из Backend.
 * ВАЖНО: использует публичный backend endpoint, токены не требуются.
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[AutoRia Users API - proxy] Getting users...');

    // ВАЖНО: В Server-side API routes используем BACKEND_URL (без NEXT_PUBLIC_)
    // NEXT_PUBLIC_ переменные доступны только в клиенте
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    console.log('[AutoRia Users API - proxy] Backend URL:', backendUrl);

    // Аккуратно собираем URL, чтобы избежать двойного "/api"
    const base = backendUrl.replace(/\/$/, '');
    const hasApi = /\/api\/?$/.test(base);
    const apiBase = hasApi ? base : `${base}/api`;
    const fullUrl = `${apiBase}/users/public/list/`;
    
    console.log('[AutoRia Users API - proxy] Fetching from:', fullUrl);

    const usersResponse = await fetch(fullUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    console.log('[AutoRia Users API - proxy] Response status:', usersResponse.status);

    if (!usersResponse.ok) {
      const errorText = await usersResponse.text();
      console.error('[AutoRia Users API - proxy] Backend error:', usersResponse.status, errorText);
      return NextResponse.json({ 
        success: false, 
        error: 'Backend error', 
        details: errorText,
        status: usersResponse.status,
        url: fullUrl
      }, { status: usersResponse.status });
    }

    const usersData = await usersResponse.json();
    console.log('[AutoRia Users API - proxy] Received users count:', usersData.results?.length || 0);
    
    const allUsers = usersData.results || usersData || [];
    const activeUsers = allUsers.filter((u: any) => u.is_active);
    
    console.log('[AutoRia Users API - proxy] Active users count:', activeUsers.length);

    return NextResponse.json({
      success: true,
      data: { results: activeUsers, count: activeUsers.length },
      source: 'backend',
    });
  } catch (error) {
    console.error('[AutoRia Users API - proxy] Error:', error);
    console.error('[AutoRia Users API - proxy] Error stack:', error instanceof Error ? error.stack : 'N/A');
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
