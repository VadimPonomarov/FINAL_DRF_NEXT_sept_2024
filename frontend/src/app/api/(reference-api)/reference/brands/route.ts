/**
 * API route for fetching car brands from Django backend
 * GET /api/reference/brands
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Use internal Docker URL for server-side requests
    const backendUrl = process.env.BACKEND_URL || 'http://app:8000';
    const brandsUrl = `${backendUrl}/api/autoria/brands/`;
    
    console.log(`[Brands API] Fetching from: ${brandsUrl}`);

    const response = await fetch(brandsUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[Brands API] Backend error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`[Brands API] Fetched ${data.length || 0} brands`);

    // Transform data to format expected by frontend
    const transformedData = Array.isArray(data) ? data.map((brand: any) => ({
      value: brand.id?.toString() || brand.name,
      label: brand.name
    })) : [];

    return NextResponse.json(transformedData);

  } catch (error) {
    console.error('[Brands API] Failed to fetch brands:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brands' },
      { status: 500 }
    );
  }
}
