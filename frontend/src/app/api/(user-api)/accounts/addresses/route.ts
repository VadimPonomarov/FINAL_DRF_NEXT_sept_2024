import { NextRequest, NextResponse } from 'next/server';
import { ServerAuthManager } from '@/utils/auth/serverAuth';

/**
 * Unified CRUD API for AutoRia Addresses
 *
 * GET    /api/accounts/addresses          - List all addresses
 * POST   /api/accounts/addresses          - Create new address
 */

/**
 * GET /api/accounts/addresses - Fetch all addresses for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Addresses API] 📤 GET - Fetching addresses...');

    // Check authentication
    const isAuthenticated = await ServerAuthManager.isAuthenticated(request);
    if (!isAuthenticated) {
      console.log('[Addresses API] ❌ User not authenticated');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get backend URL and query params
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();

    const url = queryString
      ? `${backendUrl}/api/accounts/addresses/filtered/?${queryString}`
      : `${backendUrl}/api/accounts/addresses/filtered/`;

    // Make authenticated request
    const response = await ServerAuthManager.authenticatedFetch(request, url, { method: 'GET' });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: 'Failed to fetch addresses',
          detail: errorData.detail || `HTTP ${response.status}`,
          backend_error: errorData
        },
        { status: response.status }
      );
    }

    const addressesData = await response.json();
    console.log('[Addresses API] ✅ Addresses fetched:', { count: addressesData.results?.length || 0 });

    return NextResponse.json(addressesData);

  } catch (error) {
    console.error('[Addresses API] ❌ GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounts/addresses - Create a new address
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Addresses API] 📤 POST - Creating new address...');

    // Check authentication
    const isAuthenticated = await ServerAuthManager.isAuthenticated(request);
    if (!isAuthenticated) {
      console.log('[Addresses API] ❌ User not authenticated');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    console.log('[Addresses API] 📝 Request data:', {
      input_region: body.input_region,
      input_locality: body.input_locality
    });

    // Get backend URL
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // Make authenticated request
    const response = await ServerAuthManager.authenticatedFetch(
      request,
      `${backendUrl}/api/accounts/addresses/create/`,
      {
        method: 'POST',
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: 'Failed to create address',
          detail: errorData.detail || `HTTP ${response.status}`,
          backend_error: errorData
        },
        { status: response.status }
      );
    }

    const addressData = await response.json();
    console.log('[Addresses API] ✅ Address created:', {
      id: addressData.id,
      locality: addressData.locality,
      region: addressData.region,
      geocoded: addressData.is_geocoded
    });

    return NextResponse.json(addressData);

  } catch (error) {
    console.error('[Addresses API] ❌ POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
