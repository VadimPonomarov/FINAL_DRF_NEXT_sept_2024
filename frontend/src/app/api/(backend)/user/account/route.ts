import { NextRequest, NextResponse } from 'next/server';
import '@/lib/env-loader'; // Загружаем переменные окружения во время выполнения
import { ServerAuthManager } from '@/utils/auth/serverAuth';

/**
 * API route for user account
 * Proxies requests to Django backend /api/accounts/
 */

export async function GET(request: NextRequest) {
  try {
    console.log('[User Account API] 📤 GET user account...');

    // Check if user is authenticated
    const isAuthenticated = await ServerAuthManager.isAuthenticated(request);
    if (!isAuthenticated) {
      console.log('[User Account API] ❌ User not authenticated');
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
    // Backend expects /api/accounts/ which returns the current user's account
    const response = await ServerAuthManager.authenticatedFetch(
      request,
      `${backendBase}/api/accounts/`,
      {
        method: 'GET'
      }
    );

    console.log('[User Account API] 📥 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[User Account API] ❌ Backend error:', errorText);
      return NextResponse.json(
        { error: `Backend request failed: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[User Account API] ✅ Account data received successfully');

    // Backend returns array of accounts, we need to return the first one (current user's account)
    const account = Array.isArray(data.results) ? data.results[0] : data;

    return NextResponse.json(account);

  } catch (error) {
    console.error('[User Account API] ❌ Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch account' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[User Account API] 📤 POST/UPDATE user account...');

    // Check if user is authenticated
    const isAuthenticated = await ServerAuthManager.isAuthenticated(request);
    if (!isAuthenticated) {
      console.log('[User Account API] ❌ User not authenticated');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Normalize backend base URL (remove trailing slashes and trailing /api)
    const rawBasePost = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const baseNoSlashPost = rawBasePost.replace(/\/+$/, '');
    const backendBase = baseNoSlashPost.replace(/\/(api)\/?$/i, '');

    // Get request body
    const body = await request.json();
    console.log('[User Account API] 📝 Update data:', body);

    // Make authenticated request to backend
    const response = await ServerAuthManager.authenticatedFetch(
      request,
      `${backendBase}/api/accounts/`,
      {
        method: 'POST',
        body: JSON.stringify(body)
      }
    );

    console.log('[User Account API] 📥 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[User Account API] ❌ Backend error:', errorText);
      return NextResponse.json(
        { error: `Backend request failed: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[User Account API] ✅ Account updated successfully');

    return NextResponse.json(data);

  } catch (error) {
    console.error('[User Account API] ❌ Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update account' },
      { status: 500 }
    );
  }
}

