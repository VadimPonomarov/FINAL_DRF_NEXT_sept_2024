/**
 * API route for fetching cities from Django backend
 * GET /api/reference/cities?region_id=123
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const regionId = searchParams.get('region_id');

    if (!regionId) {
      return NextResponse.json(
        { error: 'region_id parameter is required' },
        { status: 400 }
      );
    }

    // Use internal Docker URL for server-side requests
    const backendUrl = process.env.BACKEND_URL || 'http://app:8000';
    const citiesUrl = `${backendUrl}/api/autoria/cities/?region_id=${regionId}`;
    
    console.log(`[Cities API] Fetching from: ${citiesUrl}`);

    const response = await fetch(citiesUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[Cities API] Backend error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`[Cities API] Fetched ${data.length || 0} cities for region ${regionId}`);

    // Transform data to format expected by frontend
    const transformedData = Array.isArray(data) ? data.map((city: any) => ({
      value: city.id?.toString() || city.name,
      label: city.name
    })) : [];

    return NextResponse.json(transformedData);

  } catch (error) {
    console.error('[Cities API] Failed to fetch cities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cities' },
      { status: 500 }
    );
  }
}
