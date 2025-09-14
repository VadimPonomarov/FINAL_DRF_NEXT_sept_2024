/**
 * API route for fetching cities from Django backend
 * GET /api/public/reference/cities?region_id=123
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const regionId = searchParams.get('region_id');
    const search = searchParams.get('search');
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('page_size') || '500';

    if (!regionId) {
      return NextResponse.json(
        { error: 'region_id parameter is required' },
        { status: 400 }
      );
    }

    console.log(`[Cities API] Fetching cities for region: ${regionId}, search: "${search || 'none'}"`);

    // Get backend URL from environment
    const backendUrl = 'http://localhost:8000';

    // Build backend URL with parameters
    const params = new URLSearchParams({
      region_id: regionId,
      page,
      page_size: pageSize,
    });

    if (search) {
      params.append('search', search);
    }

    const backendApiUrl = `${backendUrl}/api/ads/reference/cities/?${params.toString()}`;
    console.log(`[Cities API] Fetching from: ${backendApiUrl}`);

    // Fetch from Django backend
    const response = await fetch(backendApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[Cities API] Backend error: ${response.status} ${response.statusText}`);
      throw new Error(`Backend request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[Cities API] Backend response:`, data);

    // Handle both paginated and non-paginated responses
    const cities = Array.isArray(data) ? data : (data.results || data || []);

    // Transform data to format expected by frontend
    const transformedData = cities.map((city: any) => ({
      value: city.id?.toString(),
      label: city.name
    }));

    console.log(`[Cities API] Returning ${transformedData.length} cities for region ${regionId} (search: "${search}")`);

    return NextResponse.json({
      options: transformedData,
      hasMore: false,
      total: transformedData.length,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });


  } catch (error) {
    console.error('[Cities API] Failed to fetch cities:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch cities',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
