import { NextRequest, NextResponse } from 'next/server';
import { fetchData } from '@/app/api/(helpers)/common';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    console.log(`[Vehicle Types API] 📤 Fetching vehicle types...`);

    // Подготавливаем параметры для запроса
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    // Используем общий хелпер fetchData с автоматической обработкой ошибок
    const data = await fetchData('api/ads/reference/vehicle-types/', {
      params,
      redirectOnError: false
    });

    if (!data) {
      console.log('[Vehicle Types API] ❌ No data received from backend');
      return NextResponse.json(
        { error: 'No vehicle types data available' },
        { status: 404 }
      );
    }

    console.log(`[Vehicle Types API] ✅ Raw data received:`, data);

    // Обрабатываем данные в зависимости от формата ответа backend
    let vehicleTypes = [];
    if (Array.isArray(data)) {
      vehicleTypes = data;
    } else if (data.results && Array.isArray(data.results)) {
      vehicleTypes = data.results;
    } else if (data.options && Array.isArray(data.options)) {
      vehicleTypes = data.options;
    }

    console.log(`[Vehicle Types API] ✅ Processed ${vehicleTypes.length} vehicle types`);
    console.log(`[Vehicle Types API] 📋 First vehicle type sample:`, vehicleTypes[0]);

    // Преобразуем в единый формат для фронтенда
    const transformedData = vehicleTypes.map((item: any) => ({
      value: item.id?.toString() || item.value || '',
      label: item.name || item.label || ''
    }));

    console.log(`[Vehicle Types API] 🔄 Transformed data:`, transformedData.slice(0, 3));

    // Возвращаем в стандартном формате
    return NextResponse.json({
      options: transformedData,
      total: vehicleTypes.length,
      hasMore: false
    });

  } catch (error) {
    console.error('[Vehicle Types API] ❌ Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
