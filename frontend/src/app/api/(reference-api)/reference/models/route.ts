/**
 * API route for fetching car models from Django backend
 * GET /api/reference/models?brand_id=123
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brand_id');

    if (!brandId) {
      return NextResponse.json(
        { error: 'brand_id parameter is required' },
        { status: 400 }
      );
    }

    // Use internal Docker URL for server-side requests
    const backendUrl = process.env.BACKEND_URL || 'http://app:8000';
    const modelsUrl = `${backendUrl}/api/autoria/models/?brand_id=${brandId}`;
    
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
    console.log(`[Models API] Fetched ${data.length || 0} models for brand ${brandId}`);

    // Transform data to format expected by frontend
    const transformedData = Array.isArray(data) ? data.map((model: any) => ({
      value: model.id?.toString() || model.name,
      label: model.name
    })) : [];

    return NextResponse.json(transformedData);

  } catch (error) {
    console.error('[Models API] Failed to fetch models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}
