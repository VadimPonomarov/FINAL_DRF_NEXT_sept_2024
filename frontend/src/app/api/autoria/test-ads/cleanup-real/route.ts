import { NextRequest, NextResponse } from 'next/server';

/**
 * РЕАЛЬНАЯ очистка всех объявлений через прямое удаление
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log('🧹 Starting REAL cleanup of all ads...');
    
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      throw new Error('Backend URL not configured');
    }

    // Авторизация
    const loginResponse = await fetch(`${backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'pvs.versia@gmail.com',
        password: '12345678'
      })
    });

    if (!loginResponse.ok) {
      throw new Error('Failed to authenticate');
    }

    const loginData = await loginResponse.json();
    const headers = {
      'Authorization': `Bearer ${loginData.access}`,
      'Content-Type': 'application/json'
    };

    // Получаем ВСЕ объявления с большим page_size
    const adsResponse = await fetch(`${backendUrl}/api/ads/cars/?page_size=10000`, {
      headers: { 'Authorization': `Bearer ${loginData.access}` }
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

    // 🚀 АСИНХРОННОЕ удаление всех объявлений
    const BATCH_SIZE = 5; // Удаляем по 5 объявлений параллельно
    let totalDeleted = 0;
    const errors: string[] = [];

    for (let i = 0; i < allAds.length; i += BATCH_SIZE) {
      const batch = allAds.slice(i, i + BATCH_SIZE);
      console.log(`🗑️ Deleting batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(allAds.length/BATCH_SIZE)} (${batch.length} ads)`);

      // Создаем промисы для удаления текущего батча
      const deletePromises = batch.map(async (ad) => {
        try {
          const deleteResponse = await fetch(`${backendUrl}/api/ads/cars/${ad.id}/delete`, {
            method: 'DELETE',
            headers: headers
          });

          if (deleteResponse.ok) {
            console.log(`✅ Deleted ad ${ad.id}: ${ad.title}`);
            return { success: true, id: ad.id, title: ad.title };
          } else {
            const errorText = await deleteResponse.text();
            const errorMsg = `Failed to delete ad ${ad.id}: ${deleteResponse.status} - ${errorText}`;
            console.error(`❌ ${errorMsg}`);
            return { success: false, id: ad.id, error: errorMsg };
          }
        } catch (error) {
          const errorMsg = `Error deleting ad ${ad.id}: ${error}`;
          console.error(`❌ ${errorMsg}`);
          return { success: false, id: ad.id, error: errorMsg };
        }
      });

      // Ждем завершения всех удалений в батче
      const batchResults = await Promise.allSettled(deletePromises);
      
      // Подсчитываем результаты
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.success) {
          totalDeleted++;
        } else if (result.status === 'fulfilled' && !result.value.success) {
          errors.push(result.value.error);
        } else {
          errors.push(`Promise rejected: ${result.reason}`);
        }
      });

      // Небольшая пауза между батчами
      if (i + BATCH_SIZE < allAds.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`🎯 REAL cleanup completed: ${totalDeleted} ads deleted, ${errors.length} errors`);

    return NextResponse.json({
      success: true,
      deleted: totalDeleted,
      total_found: allAds.length,
      errors: errors,
      message: `Successfully deleted ${totalDeleted} out of ${allAds.length} advertisements`
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
