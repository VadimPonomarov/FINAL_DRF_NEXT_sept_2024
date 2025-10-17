import { NextResponse } from 'next/server';
import { CarAdsService } from '@/services/autoria/carAds.service';

export async function POST() {
  try {
    console.log('🔧 DEBUG: Starting CarAdsService test...');

    // Тест импорта CarAdsService
    console.log('📋 Testing CarAdsService import...');
    console.log('CarAdsService:', typeof CarAdsService);
    console.log('CarAdsService methods:', Object.getOwnPropertyNames(CarAdsService));

    const testResult = {
      message: 'CarAdsService import test completed!',
      timestamp: new Date().toISOString(),
      status: 'success',
      serviceType: typeof CarAdsService,
      methods: Object.getOwnPropertyNames(CarAdsService)
    };

    console.log('✅ Test completed successfully:', testResult);
    
    return NextResponse.json({
      success: true,
      message: 'Debug test completed successfully',
      data: testResult
    });
    
  } catch (error) {
    console.error('❌ DEBUG: Error in test endpoint:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Debug test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Debug test ad creation API',
    usage: 'POST /api/autoria/test-ads/debug to create a single test ad'
  });
}
