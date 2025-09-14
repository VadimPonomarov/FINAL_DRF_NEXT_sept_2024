/**
 * API route for fetching regions from Django backend
 * GET /api/public/reference/regions
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log(`[Regions API] Fetching regions from backend...`);

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('page_size') || '500';
    const search = searchParams.get('search') || '';

    console.log(`[Regions API] Parameters: page=${page}, pageSize=${pageSize}, search="${search}"`);

    // Get backend URL from environment
    const backendUrl = 'http://localhost:8000';

    // Build backend URL with parameters
    const params = new URLSearchParams({
      page,
      page_size: pageSize,
    });

    if (search) {
      params.append('search', search);
    }

    const backendApiUrl = `${backendUrl}/api/ads/reference/regions/?${params.toString()}`;
    console.log(`[Regions API] Fetching from: ${backendApiUrl}`);

    // Fetch from Django backend
    const response = await fetch(backendApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[Regions API] Backend error: ${response.status} ${response.statusText}`);
      throw new Error(`Backend request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[Regions API] Backend response:`, data);

    // Handle both paginated and non-paginated responses
    const regions = Array.isArray(data) ? data : (data.results || data || []);

    // Transform data to format expected by frontend
    const transformedData = regions.map((region: any) => ({
      value: region.id?.toString(),
      label: region.name
    }));

    console.log(`[Regions API] Returning ${transformedData.length} regions (search: "${search}")`);

    return NextResponse.json({
      options: transformedData,
      hasMore: false,
      total: transformedData.length,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });

  } catch (error) {
    console.error('[Regions API] Failed to fetch regions:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch regions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
