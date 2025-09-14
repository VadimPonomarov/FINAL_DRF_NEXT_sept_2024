/**
 * API route for fetching car brands from Django backend
 * GET /api/public/reference/brands
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchData } from '@/app/api/(helpers)/common';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('page_size') || '50';
    const search = searchParams.get('search') || '';
    const vehicleTypeId = searchParams.get('vehicle_type_id');
    const vehicleTypeName = searchParams.get('vehicle_type_name');

    console.log(`[Brands API] 📤 Fetching brands - page: ${page}, pageSize: ${pageSize}, search: "${search}", vehicle_type_id: "${vehicleTypeId}", vehicle_type_name: "${vehicleTypeName}"`);

    // Подготавливаем параметры для запроса
    const params: Record<string, string> = {
      page,
      page_size: pageSize,
    };

    if (search) {
      params.search = search;
    }

    if (vehicleTypeId) {
      params.vehicle_type = vehicleTypeId;
    }

    // Используем общий хелпер fetchData с автоматической обработкой ошибок
    const data = await fetchData('api/ads/reference/marks/', {
      params,
      redirectOnError: false
    });

    if (!data) {
      console.log('[Brands API] ❌ No data received from backend');
      return NextResponse.json(
        { error: 'No brands data available' },
        { status: 404 }
      );
    }

    console.log(`[Brands API] ✅ Fetched page ${page}, total: ${data.total || 0}`);

    // Handle paginated response from Django
    let brands = data.results || [];

    console.log(`[Brands API] 📋 Raw brands data sample:`, brands.slice(0, 2));
    console.log(`[Brands API] 🔍 Filtering parameters:`, { vehicleTypeId, vehicleTypeName });

    // Фильтруем по типу транспорта на фронтенде с улучшенной логикой
    if (vehicleTypeId) {
      const originalCount = brands.length;
      brands = brands.filter((brand: any) => {
        // Проверяем разные возможные поля для типа транспорта
        const brandVehicleType = brand.vehicle_type?.toString() ||
                               brand.vehicle_type_id?.toString() ||
                               brand.type_id?.toString();
        return brandVehicleType === vehicleTypeId.toString();
      });
      console.log(`[Brands API] ✅ Filtered by vehicle_type_id: ${originalCount} → ${brands.length} brands`);
    } else if (vehicleTypeName) {
      const originalCount = brands.length;
      brands = brands.filter((brand: any) => {
        // Проверяем разные возможные поля для названия типа транспорта
        const brandVehicleTypeName = brand.vehicle_type_name ||
                                   brand.type_name ||
                                   brand.vehicle_type?.name;
        return brandVehicleTypeName === vehicleTypeName ||
               brandVehicleTypeName?.toLowerCase() === vehicleTypeName.toLowerCase();
      });
      console.log(`[Brands API] ✅ Filtered by vehicle_type_name: ${originalCount} → ${brands.length} brands`);

      if (brands.length === 0) {
        console.log(`[Brands API] ⚠️ No brands found for vehicle type "${vehicleTypeName}"`);
        console.log(`[Brands API] 📋 Available vehicle types in brands:`,
          [...new Set(data.results?.map((b: any) => b.vehicle_type_name || b.type_name || 'unknown'))]);
      }
    }

    // Transform data to format expected by frontend
    const transformedData = brands.map((brand: any) => ({
      value: brand.id?.toString() || brand.name,
      label: brand.name,
      // ✅ ИСПРАВЛЕНИЕ: Передаем vehicle_type_id для обратного каскада
      vehicle_type_id: brand.vehicle_type || brand.vehicle_type_id,
      vehicle_type_name: brand.vehicle_type_name
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
    console.error('[Brands API] ❌ Failed to fetch brands:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brands' },
      { status: 500 }
    );
  }
}
