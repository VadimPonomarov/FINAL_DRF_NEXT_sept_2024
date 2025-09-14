/**
 * API route for fetching car colors from Django backend
 * GET /api/public/reference/colors
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchData } from '@/app/api/(helpers)/common';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('page_size') || '30';
    const search = searchParams.get('search') || '';

    console.log(`[Colors API] 📤 Fetching colors - page: ${page}, pageSize: ${pageSize}, search: "${search}"`);

    // Подготавливаем параметры для запроса
    const params: Record<string, string> = {
      page,
      page_size: pageSize,
    };

    if (search) {
      params.search = search;
    }

    // Используем общий хелпер fetchData с автоматической обработкой ошибок
    const data = await fetchData('api/ads/reference/colors/', {
      params,
      redirectOnError: false
    });

    if (!data) {
      console.log('[Colors API] ❌ No data received from backend');
      return NextResponse.json(
        { error: 'No colors data available' },
        { status: 404 }
      );
    }

    console.log(`[Colors API] ✅ Fetched page ${page}, total: ${data.total || 0}`);

    // Handle paginated response from Django
    const colors = data.results || [];

    // Transform data to format expected by frontend
    const transformedData = colors.map((color: any) => ({
      value: color.id?.toString() || color.name,
      label: color.name
    }));

    // Return paginated response
    return NextResponse.json({
      options: transformedData,
      hasMore: !!data.next,
      total: data.total || 0,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });

  } catch (error) {
    console.error('[Colors API] ❌ Failed to fetch colors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch colors' },
      { status: 500 }
    );
  }
}
