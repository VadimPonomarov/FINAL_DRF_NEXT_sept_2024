import { NextRequest, NextResponse } from 'next/server';
import { CarAdsService } from '@/services/autoria/carAds.service';

export async function DELETE(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('🗑️ API ENDPOINT: Starting test ads cleanup...');

    // Получаем все объявления пользователя
    console.log('📋 Fetching user ads...');
    const userAds = await CarAdsService.getMyCarAds({
      page: 1,
      limit: 1000, // Получаем все объявления
      status: 'all'
    });

    console.log(`📊 Found ${userAds.results?.length || 0} user ads`);

    if (!userAds.results || userAds.results.length === 0) {
      return NextResponse.json({
        success: true,
        deleted: 0,
        message: 'No ads found to delete',
        duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`
      });
    }

    // Фильтруем тестовые объявления (по определенным критериям)
    const testAds = userAds.results.filter(ad => {
      // Определяем тестовые объявления по характерным признакам:
      // 1. Заголовок содержит типичные тестовые фразы
      // 2. Описание содержит стандартные фразы
      // 3. Цены в типичных диапазонах
      const testTitlePatterns = [
        'BMW X5 2020',
        'Mercedes-Benz E-Class 2019',
        'Toyota Camry 2021',
        'Volkswagen Golf 2018',
        'Ford Transit 2020',
        'Honda CBR600RR 2019',
        'Audi A4 2017'
      ];

      const testDescriptionPatterns = [
        'премиум кроссовер в отличном состоянии',
        'бизнес седан с полным пакетом опций',
        'надежный семейный седан',
        'компактный хэтчбек в хорошем состоянии',
        'коммерческий фургон для бизнеса',
        'спортивный мотоцикл в отличном состоянии',
        'элегантный седан бизнес-класса'
      ];

      // Проверяем заголовок
      const hasTestTitle = testTitlePatterns.some(pattern => 
        ad.title?.includes(pattern)
      );

      // Проверяем описание
      const hasTestDescription = testDescriptionPatterns.some(pattern => 
        ad.description?.toLowerCase().includes(pattern.toLowerCase())
      );

      return hasTestTitle || hasTestDescription;
    });

    console.log(`🎯 Identified ${testAds.length} test ads for deletion`);

    if (testAds.length === 0) {
      return NextResponse.json({
        success: true,
        deleted: 0,
        message: 'No test ads found to delete',
        duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`
      });
    }

    // Удаляем тестовые объявления
    const deletionResults = [];
    let successCount = 0;
    let errorCount = 0;

    for (const ad of testAds) {
      try {
        console.log(`🗑️ Deleting test ad: ${ad.title} (ID: ${ad.id})`);
        
        await CarAdsService.deleteCarAd(ad.id);
        
        deletionResults.push({
          id: ad.id,
          title: ad.title,
          success: true
        });
        
        successCount++;
        console.log(`✅ Successfully deleted: ${ad.title}`);
        
        // Небольшая пауза между удалениями
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Failed to delete ad ${ad.id}:`, error);
        
        deletionResults.push({
          id: ad.id,
          title: ad.title,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        errorCount++;
      }
    }

    const duration = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
    
    console.log(`📊 Cleanup completed: ${successCount} deleted, ${errorCount} errors in ${duration}`);

    return NextResponse.json({
      success: true,
      deleted: successCount,
      errors: errorCount,
      total: testAds.length,
      duration: duration,
      message: `Successfully deleted ${successCount} test ads${errorCount > 0 ? ` (${errorCount} errors)` : ''}`,
      details: deletionResults
    });

  } catch (error) {
    console.error('❌ API ENDPOINT: Cleanup error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Test ads cleanup failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`
      },
      { status: 500 }
    );
  }
}

// GET метод для получения информации о тестовых объявлениях
export async function GET(request: NextRequest) {
  try {
    console.log('📊 API ENDPOINT: Getting test ads info...');

    // Получаем все объявления пользователя
    const userAds = await CarAdsService.getMyCarAds({
      page: 1,
      limit: 1000,
      status: 'all'
    });

    if (!userAds.results) {
      return NextResponse.json({
        success: true,
        total: 0,
        testAds: 0,
        message: 'No ads found'
      });
    }

    // Подсчитываем тестовые объявления
    const testTitlePatterns = [
      'BMW X5 2020',
      'Mercedes-Benz E-Class 2019',
      'Toyota Camry 2021',
      'Volkswagen Golf 2018',
      'Ford Transit 2020',
      'Honda CBR600RR 2019',
      'Audi A4 2017'
    ];

    const testAdsCount = userAds.results.filter(ad => 
      testTitlePatterns.some(pattern => ad.title?.includes(pattern))
    ).length;

    return NextResponse.json({
      success: true,
      total: userAds.results.length,
      testAds: testAdsCount,
      regularAds: userAds.results.length - testAdsCount,
      message: `Found ${testAdsCount} test ads out of ${userAds.results.length} total ads`
    });

  } catch (error) {
    console.error('❌ API ENDPOINT: Info error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get test ads info',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
