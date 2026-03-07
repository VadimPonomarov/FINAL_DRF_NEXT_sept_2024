import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/shared/utils/logger';

/**
 * API /api/autoria/users
 * Прокси-эндпоинт для получения списка активных пользователей из Backend.
 * ВАЖНО: использует публичный backend endpoint, токены не требуются.
 */
export async function GET(request: NextRequest) {
  try {
    logger.info('[AutoRia Users API - proxy] Getting users...');

    const base = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000').replace(/\/+$/, '');
    const fullUrl = `${base}/api/users/public/list/`;
    
    logger.info('[AutoRia Users API - proxy] Fetching from:', fullUrl);

    const usersResponse = await fetch(fullUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    logger.info('[AutoRia Users API - proxy] Response status:', usersResponse.status);

    if (!usersResponse.ok) {
      const errorText = await usersResponse.text();
      logger.error('[AutoRia Users API - proxy] Backend error:', usersResponse.status, errorText);
      return NextResponse.json({ 
        success: false, 
        error: 'Backend error', 
        details: errorText,
        status: usersResponse.status,
        url: fullUrl
      }, { status: usersResponse.status });
    }

    const usersData = await usersResponse.json();
    logger.info('[AutoRia Users API - proxy] Received users count:', usersData.results?.length || 0);
    
    const allUsers = usersData.results || usersData || [];
    const activeUsers = allUsers.filter((u: any) => u.is_active);
    
    logger.info('[AutoRia Users API - proxy] Active users count:', activeUsers.length);

    return NextResponse.json({
      success: true,
      data: { results: activeUsers, count: activeUsers.length },
      source: 'backend',
    });
  } catch (error) {
    logger.error('[AutoRia Users API - proxy] Error:', error);
    logger.error(
      '[AutoRia Users API - proxy] Error stack:',
      error instanceof Error ? error.stack : 'N/A',
    );
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
