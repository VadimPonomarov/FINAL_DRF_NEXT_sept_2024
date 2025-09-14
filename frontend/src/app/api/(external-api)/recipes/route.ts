import { NextRequest, NextResponse } from 'next/server';
import { dummyApiHelpers } from '@/app/api/(helpers)/dummy';

export async function GET(request: NextRequest) {
  try {
    console.log('[API Recipes] Starting request');
    // Получаем параметры запроса
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') || '30';
    const skip = searchParams.get('skip') || '0';
    console.log(`[API Recipes] Params: limit=${limit}, skip=${skip}`);

    // Используем прямой запрос к DummyJSON API вместо хелпера
    const url = `https://dummyjson.com/products?limit=${limit}&skip=${skip}`;
    console.log(`[API Recipes] Fetching URL: ${url}`);
    const response = await fetch(url);

    console.log(`[API Recipes] Response status: ${response.status}`);

    if (!response.ok) {
      console.error(`[API Recipes] Error response: ${response.status}`);
      const errorText = await response.text();
      console.error(`[API Recipes] Error details: ${errorText}`);
      throw new Error(`Failed to fetch recipes: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[API Recipes] Received data with ${data.products?.length || 0} products and total ${data.total || 0}`);

    // Возвращаем данные в формате JSON
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API Recipes] Error in recipes API route:', error);

    // Детальная информация об ошибке
    if (error instanceof Error) {
      console.error('[API Recipes] Error message:', error.message);
      console.error('[API Recipes] Error stack:', error.stack);
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal Server Error',
        timestamp: new Date().toISOString(),
        path: '/api/recipes'
      },
      { status: 500 }
    );
  }
}
