import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:8000').replace(/\/+$/,'');

/**
 * Очистка всех объявлений текущего пользователя
 * DELETE /api/autoria/test-ads/cleanup
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log('🧹 Starting cleanup of all user ads...');
    
    const backendUrl = BACKEND_URL;
    if (!backendUrl) {
      throw new Error('Backend URL not configured');
    }

    // Получаем токен из cookies
    const accessToken = request.cookies.get('access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    // Получаем объявления текущего пользователя
    const adsResponse = await fetch(`${backendUrl}/api/ads/cars/my?page_size=1000`, {
      headers
    });

    if (!adsResponse.ok) {
      throw new Error(`Failed to fetch ads: ${adsResponse.status}`);
    }

    const adsData = await adsResponse.json();
    const allAds = adsData.results || [];
    
    console.log(`📊 Found ${allAds.length} ads to delete`);

    if (allAds.length === 0) {
      return NextResponse.json({
        success: true,
        deleted: 0,
        message: 'No ads to delete'
      });
    }

    // Удаление объявлений батчами
    const BATCH_SIZE = 5;
    let totalDeleted = 0;
    const errors: string[] = [];

    for (let i = 0; i < allAds.length; i += BATCH_SIZE) {
      const batch = allAds.slice(i, i + BATCH_SIZE);
      console.log(`🗑️ Deleting batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(allAds.length/BATCH_SIZE)}`);

      const deletePromises = batch.map(async (ad: any) => {
        try {
          const deleteResponse = await fetch(`${backendUrl}/api/ads/cars/${ad.id}/delete`, {
            method: 'DELETE',
            headers
          });

          if (deleteResponse.ok) {
            console.log(`✅ Deleted ad ${ad.id}`);
            return { success: true, id: ad.id };
          } else {
            const errorText = await deleteResponse.text();
            console.error(`❌ Failed to delete ad ${ad.id}: ${deleteResponse.status}`);
            return { success: false, id: ad.id, error: errorText };
          }
        } catch (error) {
          console.error(`❌ Error deleting ad ${ad.id}:`, error);
          return { success: false, id: ad.id, error: String(error) };
        }
      });

      const batchResults = await Promise.allSettled(deletePromises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.success) {
          totalDeleted++;
        } else if (result.status === 'fulfilled' && !result.value.success) {
          errors.push(result.value.error || 'Unknown error');
        }
      });

      // Пауза между батчами
      if (i + BATCH_SIZE < allAds.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`🎯 Cleanup completed: ${totalDeleted} ads deleted`);

    return NextResponse.json({
      success: true,
      deleted: totalDeleted,
      total_found: allAds.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Deleted ${totalDeleted} out of ${allAds.length} ads`
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
