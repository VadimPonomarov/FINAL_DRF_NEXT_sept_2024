import { NextResponse, NextRequest } from 'next/server';
import { getAuthorizationHeaders } from '@/common/constants/headers';

export async function DELETE(request: NextRequest) {
  try {
    console.log('🧹 Starting cleanup of all test ads...');

    // Получаем авторизационные заголовки
    const authHeaders = await getAuthorizationHeaders();

    // Обращаемся напрямую к Django backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const cleanupResponse = await fetch(`${backendUrl}/api/ads/cars/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      }
    });

    if (!cleanupResponse.ok) {
      const errorText = await cleanupResponse.text();
      throw new Error(`Failed to fetch ads: ${cleanupResponse.status} - ${errorText}`);
    }

    const adsData = await cleanupResponse.json();
    const allAds = adsData.results || [];

    console.log(`📊 Found ${allAds.length} ads to delete`);

    if (allAds.length === 0) {
      return NextResponse.json({
        success: true,
        deleted: 0,
        total_found: 0,
        message: 'No ads found to delete'
      });
    }

    // Удаляем все объявления
    let deleted = 0;
    const errors: string[] = [];

    for (const ad of allAds) {
      try {
        const deleteResponse = await fetch(`${backendUrl}/api/ads/cars/${ad.id}/`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          }
        });

        if (deleteResponse.ok) {
          deleted++;
          console.log(`✅ Deleted ad ${ad.id}`);
        } else {
          const errorText = await deleteResponse.text();
          errors.push(`Failed to delete ad ${ad.id}: ${deleteResponse.status} - ${errorText}`);
          console.error(`❌ Failed to delete ad ${ad.id}:`, errorText);
        }
      } catch (error) {
        const errorMsg = `Error deleting ad ${ad.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    console.log(`✅ Successfully cleaned up ${deleted}/${allAds.length} ads`);

    return NextResponse.json({
      success: true,
      deleted,
      total_found: allAds.length,
      errors,
      message: `Successfully deleted ${deleted} out of ${allAds.length} ads`
    });

  } catch (error) {
    console.error('❌ Error cleaning up test ads:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cleanup test ads',
        message: error instanceof Error ? error.message : 'Unknown error'
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
