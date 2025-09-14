import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🔍 API: Checking existing ads...');

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    
    // Получаем список объявлений для подсчета статистики
    console.log('🔍 Fetching ads from:', `${backendUrl}/api/ads/cars/?page_size=10000`);
    const response = await fetch(`${backendUrl}/api/ads/cars/?page_size=10000`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('❌ Backend not available - no point in generation without AI service');
      // Возвращаем 0 объявлений если backend недоступен (нет AI генератора)
      return NextResponse.json({
        success: false,
        totalAds: 0,
        adsWithoutImages: 0,
        adsWithFewImages: 0,
        emptyImages: 0,
        error: 'Backend AI service unavailable'
      });
    }

    const data = await response.json();

    console.log('📊 Backend response received, total ads:', data.count);

    // Подсчитываем статистику из полученных объявлений
    const totalAds = data.count || 0;
    const ads = data.results || [];

    let adsWithoutImages = 0;
    let adsWithFewImages = 0;
    let emptyImages = 0;

    // Анализируем первые 20 объявлений для статистики (для производительности)
    const sampleAds = ads.slice(0, 20);
    sampleAds.forEach((ad: any) => {
      const imageCount = ad.images ? ad.images.length : 0;

      if (imageCount === 0) {
        adsWithoutImages++;
      } else if (imageCount < 3) {
        adsWithFewImages++;
      }

      // Подсчитываем пустые изображения
      if (ad.images) {
        ad.images.forEach((img: any) => {
          if (!img.url || img.url.trim() === '') {
            emptyImages++;
          }
        });
      }
    });

    // Экстраполируем статистику на все объявления
    const ratio = totalAds / Math.max(sampleAds.length, 1);
    adsWithoutImages = Math.round(adsWithoutImages * ratio);
    adsWithFewImages = Math.round(adsWithFewImages * ratio);
    emptyImages = Math.round(emptyImages * ratio);

    console.log('📊 Calculated stats:', { totalAds, adsWithoutImages, adsWithFewImages, emptyImages });

    return NextResponse.json({
      success: true,
      totalAds,
      adsWithoutImages,
      adsWithFewImages,
      emptyImages
    });

  } catch (error) {
    console.error('❌ Error checking existing ads:', error);
    // Возвращаем ошибку - без backend нет смысла в генерации
    return NextResponse.json({
      success: false,
      totalAds: 0,
      adsWithoutImages: 0,
      adsWithFewImages: 0,
      emptyImages: 0,
      error: 'Failed to connect to backend AI service'
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 API: Processing existing ads...');

    const body = await request.json();
    const { actions = [], imageTypes = [] } = body;

    console.log('📋 Processing actions:', actions);
    console.log('📸 Image types:', imageTypes);

    if (actions.length === 0) {
      throw new Error('No actions specified');
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    
    // Используем наш рабочий endpoint для генерации изображений
    const response = await fetch('/api/autoria/existing-ads/generate-images', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageTypes: imageTypes,
        mode: actions.includes('replace') ? 'replace' : 'add',
        replaceExisting: actions.includes('replace'),
        onlyMissing: actions.includes('onlyMissing'),
        replaceEmpty: actions.includes('replaceEmpty'),
        maxAds: null // Обрабатываем все объявления
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('✅ Processing result:', result);

    return NextResponse.json({
      success: true,
      processed: result.processed || 0,
      details: result.details || [],
      message: `Successfully processed ${result.processed || 0} ads`
    });

  } catch (error) {
    console.error('❌ Error processing existing ads:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process existing ads',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
