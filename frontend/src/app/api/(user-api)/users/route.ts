import { NextRequest, NextResponse } from 'next/server';
import { dummyApiHelpers } from '@/app/api/(helpers)/dummy';

export async function GET(request: NextRequest) {
  try {
    console.log('[API Users] Starting request');
    // Получаем параметры запроса
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') || '30';
    const skip = searchParams.get('skip') || '0';
    console.log(`[API Users] Params: limit=${limit}, skip=${skip}`);

    // Используем прямой запрос к DummyJSON API вместо хелпера
    const url = `https://dummyjson.com/users?limit=${limit}&skip=${skip}`;
    console.log(`[API Users] Fetching URL: ${url}`);
    const response = await fetch(url);

    console.log(`[API Users] Response status: ${response.status}`);

    if (!response.ok) {
      console.error(`[API Users] Error response: ${response.status}`);
      const errorText = await response.text();
      console.error(`[API Users] Error details: ${errorText}`);
      throw new Error(`Failed to fetch users: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[API Users] Received data with ${data.users?.length || 0} users and total ${data.total || 0}`);

    // Возвращаем данные в формате JSON
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API Users] Error in users API route:', error);

    // Детальная информация об ошибке
    if (error instanceof Error) {
      console.error('[API Users] Error message:', error.message);
      console.error('[API Users] Error stack:', error.stack);
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal Server Error',
        timestamp: new Date().toISOString(),
        path: '/api/users'
      },
      { status: 500 }
    );
  }
}
