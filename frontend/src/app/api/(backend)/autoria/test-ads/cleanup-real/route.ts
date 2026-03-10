import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000').replace(/\/+$/,'');

/**
 * РЕАЛЬНАЯ очистка ВСЕХ объявлений в БД через бэкенд management command
 * Использует endpoint /api/ads/cars/cleanup-all который вызывает Django management command
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log('🧹 Starting REAL cleanup of ALL ads in database...');
    
    const backendUrl = BACKEND_URL;
    if (!backendUrl) {
      throw new Error('Backend URL not configured');
    }

    // Сначала получим количество объявлений для отчета
    console.log(`📊 Fetching current ads count from ${backendUrl}/api/ads/cars/?page_size=1`);
    const countResponse = await fetch(`${backendUrl}/api/ads/cars/?page_size=1`);
    let totalBefore = 0;
    if (countResponse.ok) {
      const countData = await countResponse.json();
      totalBefore = countData.count || countData.total || 0;
      console.log(`📊 Found ${totalBefore} ads in database before cleanup`);
    }

    // Вызываем бэкенд endpoint cleanup-all который использует management command
    console.log(`🗑️ Calling ${backendUrl}/api/ads/cars/cleanup-all ...`);
    const cleanupResponse = await fetch(`${backendUrl}/api/ads/cars/cleanup-all`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!cleanupResponse.ok) {
      const errorText = await cleanupResponse.text();
      console.error(`❌ Cleanup failed: ${cleanupResponse.status} - ${errorText}`);
      throw new Error(`Cleanup failed: ${cleanupResponse.status} - ${errorText}`);
    }

    const result = await cleanupResponse.json();
    console.log(`🎯 Cleanup result:`, result);

    // Проверим сколько осталось после удаления
    const afterResponse = await fetch(`${backendUrl}/api/ads/cars/?page_size=1`);
    let totalAfter = 0;
    if (afterResponse.ok) {
      const afterData = await afterResponse.json();
      totalAfter = afterData.count || afterData.total || 0;
    }

    const actualDeleted = totalBefore - totalAfter;
    console.log(`✅ Cleanup completed: ${actualDeleted} ads deleted (was ${totalBefore}, now ${totalAfter})`);

    return NextResponse.json({
      success: result.success !== false,
      deleted: result.deleted || actualDeleted,
      total_found: totalBefore,
      remaining: totalAfter,
      backend_output: result.output,
      message: `Видалено ${result.deleted || actualDeleted} з ${totalBefore} оголошень`
    });

  } catch (error) {
    console.error('❌ Cleanup error:', error);
    return NextResponse.json({
      success: false,
      deleted: 0,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
