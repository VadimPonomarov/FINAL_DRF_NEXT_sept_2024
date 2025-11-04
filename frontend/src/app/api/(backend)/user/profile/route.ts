import { NextRequest, NextResponse } from 'next/server';
import '@/lib/env-loader'; // Загружаем переменные окружения во время выполнения
import { ServerAuthManager } from '@/shared/utils/auth/serverAuth';

/**
 * API route for user profile
 * Proxies requests to Django backend /api/users/profile/
 */

export async function GET(request: NextRequest) {
  try {
    console.log('[User Profile API] 📤 GET user profile...');

    // Check if user is authenticated
    const isAuthenticated = await ServerAuthManager.isAuthenticated(request);
    if (!isAuthenticated) {
      console.log('[User Profile API] ❌ User not authenticated');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get backend base URL from environment and normalize (remove trailing slashes and trailing /api)
    const rawBase = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const baseNoSlash = rawBase.replace(/\/+$/, '');
    const backendBase = baseNoSlash.replace(/\/(api)\/?$/i, '');

    // Make authenticated request to backend
    const response = await ServerAuthManager.authenticatedFetch(
      request,
      `${backendBase}/api/users/profile/`,
      {
        method: 'GET'
      }
    );

    console.log('[User Profile API] 📥 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[User Profile API] ❌ Backend error:', errorText);
      return NextResponse.json(
        { error: `Backend request failed: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[User Profile API] ✅ Profile data received successfully');

    return NextResponse.json(data);

  } catch (error) {
    console.error('[User Profile API] ❌ Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    console.log('[User Profile API] 📤 PATCH user profile...');

    // Check if user is authenticated
    const isAuthenticated = await ServerAuthManager.isAuthenticated(request);
    if (!isAuthenticated) {
      console.log('[User Profile API] ❌ User not authenticated');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get backend base URL from environment and normalize (remove trailing slashes and trailing /api)
    const rawBase = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const baseNoSlash = rawBase.replace(/\/+$/, '');
    const backendBase = baseNoSlash.replace(/\/(api)\/?$/i, '');

    // Get request body
    const body = await request.json();
    console.log('[User Profile API] 📝 Update data:', body);

    // Make authenticated request to backend
    const response = await ServerAuthManager.authenticatedFetch(
      request,
      `${backendBase}/api/users/profile/`,
      {
        method: 'PATCH',
        body: JSON.stringify(body)
      }
    );

    console.log('[User Profile API] 📥 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[User Profile API] ❌ Backend error:', errorText);
      return NextResponse.json(
        { error: `Backend request failed: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[User Profile API] ✅ Profile updated successfully');

    return NextResponse.json(data);

  } catch (error) {
    console.error('[User Profile API] ❌ Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update profile' },
      { status: 500 }
    );
  }
}

