import { NextRequest, NextResponse } from 'next/server';
import '@/lib/env-loader'; // Загружаем переменные окружения во время выполнения
import { ServerAuthManager } from '@/shared/utils/auth/serverAuth';

/**
 * API route for user addresses
 * Proxies requests to Django backend /api/accounts/addresses/
 */

export async function GET(request: NextRequest) {
  try {
    console.log('[User Addresses API] 📤 GET user addresses...');

    // Check if user is authenticated
    const isAuthenticated = await ServerAuthManager.isAuthenticated(request);
    if (!isAuthenticated) {
      console.log('[User Addresses API] ❌ User not authenticated');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Normalize backend base URL (remove trailing slashes and trailing /api)
    const rawBase = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const baseNoSlash = rawBase.replace(/\/+$/, '');
    const backendBase = baseNoSlash.replace(/\/(api)\/?$/i, '');

    // Make authenticated request to backend
    // Backend expects /api/accounts/addresses/raw/ for raw addresses
    const response = await ServerAuthManager.authenticatedFetch(
      request,
      `${backendBase}/api/accounts/addresses/raw/`,
      {
        method: 'GET'
      }
    );

    console.log('[User Addresses API] 📥 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[User Addresses API] ❌ Backend error:', errorText);
      return NextResponse.json(
        { error: `Backend request failed: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[User Addresses API] ✅ Addresses data received successfully');

    // Backend returns paginated response with results array
    const addresses = data.results || data;

    return NextResponse.json(addresses);

  } catch (error) {
    console.error('[User Addresses API] ❌ Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch addresses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[User Addresses API] 📤 POST create address...');

    // Check if user is authenticated
    const isAuthenticated = await ServerAuthManager.isAuthenticated(request);
    if (!isAuthenticated) {
      console.log('[User Addresses API] ❌ User not authenticated');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get backend URL from environment
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // Get request body
    const body = await request.json();
    console.log('[User Addresses API] 📝 Create data:', body);

    // Make authenticated request to backend
    const response = await ServerAuthManager.authenticatedFetch(
      request,
      `${backendBase}/api/accounts/addresses/raw/`,
      {
        method: 'POST',
        body: JSON.stringify(body)
      }
    );

    console.log('[User Addresses API] 📥 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[User Addresses API] ❌ Backend error:', errorText);
      return NextResponse.json(
        { error: `Backend request failed: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[User Addresses API] ✅ Address created successfully');

    return NextResponse.json(data);

  } catch (error) {
    console.error('[User Addresses API] ❌ Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create address' },
      { status: 500 }
    );
  }
}

