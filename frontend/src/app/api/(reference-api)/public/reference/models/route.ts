/**
 * API route for fetching car models from Django backend
 * GET /api/public/reference/models?brand_id=123
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // Поддерживаем оба параметра: brand_id и mark_id для совместимости
    const brandId = searchParams.get('brand_id') || searchParams.get('mark_id');
    const brandName = searchParams.get('brand_name') || searchParams.get('mark_name');
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('page_size') || '50';
    const search = searchParams.get('search') || '';

    // ✅ ИСПРАВЛЕНИЕ: Убираем обязательную проверку brand_id для поддержки получения всех моделей
    // if (!brandId && !brandName) {
    //   return NextResponse.json(
    //     { error: 'brand_id (or mark_id) or brand_name (or mark_name) parameter is required' },
    //     { status: 400 }
    //   );
    // }

    console.log(`[Models API] 📤 Fetching models - brand_id: "${brandId}", brand_name: "${brandName}", search: "${search}"`);

    // Если передано название марки, нужно сначала найти все марки и получить ID
    let actualBrandId = brandId;

    console.log(`[Models API] 📤 Fetching models for brand: "${brandId}" (type: ${typeof brandId})`);

    // Проверяем, является ли brandId числом или названием
    const isNumericId = brandId && /^\d+$/.test(brandId.toString());
    console.log(`[Models API] Brand ID is numeric: ${isNumericId}`);

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';

    // Если передано название марки или brandId не является числом, найдем ID
    if ((brandName && !isNumericId) || (!isNumericId && brandId)) {
      try {
        const searchName = brandName || brandId;
        console.log(`[Models API] 🔍 Looking up brand ID for name: "${searchName}"`);

        // Запрашиваем все марки для поиска ID по названию
        const brandsResponse = await fetch(`${backendUrl}/api/ads/reference/marks/?page_size=2000`);
        const brandsData = await brandsResponse.json();

        const brand = brandsData.results?.find((b: any) =>
          b.name.toLowerCase() === searchName.toLowerCase() ||
          b.name.toLowerCase().includes(searchName.toLowerCase())
        );

        if (brand) {
          actualBrandId = brand.id.toString();
          console.log(`[Models API] ✅ Found brand ID: ${actualBrandId} for name: "${searchName}"`);
        } else {
          console.log(`[Models API] ❌ Brand not found: "${searchName}"`);
          console.log(`[Models API] 📋 Available brands:`, brandsData.results?.slice(0, 5).map((b: any) => b.name));
          return NextResponse.json({
            options: [],
            total: 0,
            hasMore: false,
            debug: {
              searchName,
              availableBrands: brandsData.results?.slice(0, 10).map((b: any) => ({ id: b.id, name: b.name }))
            }
          });
        }
      } catch (error) {
        console.error(`[Models API] ❌ Error looking up brand:`, error);
        return NextResponse.json({
          options: [],
          total: 0,
          hasMore: false,
          error: 'Failed to lookup brand'
        });
      }
    }

    // ✅ ИСПРАВЛЕНИЕ: Если brand_id не указан, получаем все модели
    if (!actualBrandId) {
      console.log(`[Models API] No brand_id specified, fetching all models`);

      // Получаем все модели без фильтрации по марке
      const params = new URLSearchParams({
        page,
        page_size: pageSize,
      });

      if (search) {
        params.append('search', search);
      }

      const modelsUrl = `${backendUrl}/api/ads/reference/models/?${params.toString()}`;
      console.log(`[Models API] Fetching all models from: ${modelsUrl}`);

      const response = await fetch(modelsUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`[Models API] Backend error: ${response.status} ${response.statusText}`);
        return NextResponse.json(
          { error: `Backend error: ${response.status}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      console.log(`[Models API] Fetched all models - page ${page}, total: ${data.total || 0}`);

      // Handle paginated response from Django
      const models = data.results || [];

      // Transform data to format expected by frontend
      const transformedData = models.map((model: any) => ({
        value: model.id?.toString() || model.name,
        label: model.name,
        // ✅ ИСПРАВЛЕНИЕ: Передаем brand_id для обратного каскада
        brand_id: model.mark || model.mark_id || model.brand_id
      }));

      // Return paginated response
      return NextResponse.json({
        options: transformedData,
        hasMore: !!data.next,
        total: data.total || 0,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      });
    }

    // Build URL with pagination and search
    const params = new URLSearchParams({
      mark_id: actualBrandId,
      page,
      page_size: pageSize,
    });

    if (search) {
      params.append('search', search);
    }

    const modelsUrl = `${backendUrl}/api/ads/reference/models/by_mark/?${params.toString()}`;

    console.log(`[Models API] Fetching from: ${modelsUrl}`);

    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[Models API] Backend error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`[Models API] Fetched page ${page}, total: ${data.total || 0} for brand ${actualBrandId}`);
    console.log(`[Models API] Raw models data:`, data);

    // Handle paginated response from Django
    const models = data.results || [];
    console.log(`[Models API] Models count: ${models.length}`);
    console.log(`[Models API] First model sample:`, models[0]);

    // Transform data to format expected by frontend
    const transformedData = models.map((model: any) => ({
      value: model.id?.toString() || model.name,
      label: model.name,
      // ✅ ИСПРАВЛЕНИЕ: Передаем brand_id для обратного каскада
      brand_id: model.mark || model.mark_id || model.brand_id
    }));

    console.log(`[Models API] Transformed data count: ${transformedData.length}`);
    console.log(`[Models API] First transformed model:`, transformedData[0]);

    // Return paginated response
    return NextResponse.json({
      options: transformedData,
      hasMore: !!data.next,
      total: data.total || 0,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });

  } catch (error) {
    console.error('[Models API] Failed to fetch models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}
