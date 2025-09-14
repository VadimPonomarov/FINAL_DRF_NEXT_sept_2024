/**
 * API route for fetching car colors from Django backend
 * GET /api/reference/colors
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Use internal Docker URL for server-side requests
    const backendUrl = process.env.BACKEND_URL || 'http://app:8000';
    const colorsUrl = `${backendUrl}/api/autoria/colors/`;
    
    console.log(`[Colors API] Fetching from: ${colorsUrl}`);

    const response = await fetch(colorsUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[Colors API] Backend error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`[Colors API] Fetched ${data.length || 0} colors`);

    // Transform data to format expected by frontend
    const transformedData = Array.isArray(data) ? data.map((color: any) => ({
      value: color.id?.toString() || color.name,
      label: color.name
    })) : [];

    return NextResponse.json(transformedData);

  } catch (error) {
    console.error('[Colors API] Failed to fetch colors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch colors' },
      { status: 500 }
    );
  }
}
