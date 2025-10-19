import { NextResponse, NextRequest } from 'next/server';
import { getAuthorizationHeaders } from '@/common/constants/headers';

export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  try {
    console.log('🧹 [CLEANUP] Starting cleanup using Django bulk endpoint...');

    // Получаем авторизационные заголовки
    const authHeaders = await getAuthorizationHeaders();
    console.log('🔐 [CLEANUP] Auth headers obtained:', Object.keys(authHeaders));

    // Используем специальный Django endpoint для массового удаления
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const cleanupUrl = `${backendUrl}/api/ads/cars/cleanup-all`;
    console.log(`🚀 [CLEANUP] Calling Django bulk cleanup: ${cleanupUrl}`);

    const cleanupResponse = await fetch(cleanupUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      }
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`📡 [CLEANUP] Response status: ${cleanupResponse.status} (${duration}s)`);

    if (!cleanupResponse.ok) {
      const errorText = await cleanupResponse.text();
      console.error(`❌ [CLEANUP] Cleanup failed: ${cleanupResponse.status} - ${errorText}`);
      return NextResponse.json(
        {
          success: false,
          error: `Cleanup failed: ${cleanupResponse.status}`,
          details: errorText,
          duration: `${duration}s`
        },
        { status: cleanupResponse.status }
      );
    }

    const result = await cleanupResponse.json();
    console.log(`✅ [CLEANUP] Cleanup completed in ${duration}s:`, result);

    return NextResponse.json({
      success: true,
      deleted: result.deleted || 0,
      message: result.message || 'Cleanup completed',
      output: result.output,
      duration: `${duration}s`
    });

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`❌ [CLEANUP] Fatal error after ${duration}s:`, error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cleanup test ads',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}s`
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test ads cleanup API',
    usage: 'DELETE /api/autoria/test-ads/cleanup to delete all ads'
  });
}

