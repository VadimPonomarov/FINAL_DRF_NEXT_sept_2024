/**
 * API route for fetching regions from Django backend
 * GET /api/reference/regions
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Use internal Docker URL for server-side requests
    const backendUrl = process.env.BACKEND_URL || 'http://app:8000';
    const regionsUrl = `${backendUrl}/api/autoria/regions/`;
    
    console.log(`[Regions API] Fetching from: ${regionsUrl}`);

    const response = await fetch(regionsUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[Regions API] Backend error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`[Regions API] Fetched ${data.length || 0} regions`);

    // Transform data to format expected by frontend
    const transformedData = Array.isArray(data) ? data.map((region: any) => ({
      value: region.id?.toString() || region.name,
      label: region.name
    })) : [];

    return NextResponse.json(transformedData);

  } catch (error) {
    console.error('[Regions API] Failed to fetch regions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch regions' },
      { status: 500 }
    );
  }
}
