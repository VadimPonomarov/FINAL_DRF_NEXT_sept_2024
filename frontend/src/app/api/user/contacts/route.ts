import { NextRequest, NextResponse } from 'next/server';
import { ServerAuthManager } from '@/utils/auth/serverAuth';

/**
 * API route для получения контактов пользователя
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[User Contacts API] 📞 GET user contacts...');

    // Check if user is authenticated
    const isAuthenticated = await ServerAuthManager.isAuthenticated(request);
    if (!isAuthenticated) {
      console.log('[User Contacts API] ❌ User not authenticated');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get backend URL from environment
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // Make authenticated request to backend
    const response = await ServerAuthManager.authenticatedFetch(
      request,
      `${backendUrl}/api/accounts/contacts/`,
      {
        method: 'GET'
      }
    );

    if (!response.ok) {
      console.error('[User Contacts API] ❌ Backend returned error:', response.status);
      const errorText = await response.text();
      console.error('[User Contacts API] Error details:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch contacts from backend' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[User Contacts API] ✅ Successfully fetched contacts');

    return NextResponse.json(data);

  } catch (error) {
    console.error('[User Contacts API] ❌ Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

/**
 * API route для обновления контактов пользователя
 */
export async function PUT(request: NextRequest) {
  try {
    console.log('[User Contacts API] 📝 PUT user contacts...');

    // Check if user is authenticated
    const isAuthenticated = await ServerAuthManager.isAuthenticated(request);
    if (!isAuthenticated) {
      console.log('[User Contacts API] ❌ User not authenticated');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('[User Contacts API] Request body:', body);

    // Get backend URL from environment
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // Make authenticated request to backend
    const response = await ServerAuthManager.authenticatedFetch(
      request,
      `${backendUrl}/api/accounts/contacts/`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      console.error('[User Contacts API] ❌ Backend returned error:', response.status);
      const errorText = await response.text();
      console.error('[User Contacts API] Error details:', errorText);
      return NextResponse.json(
        { error: 'Failed to update contacts' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[User Contacts API] ✅ Successfully updated contacts');

    return NextResponse.json(data);

  } catch (error) {
    console.error('[User Contacts API] ❌ Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update contacts' },
      { status: 500 }
    );
  }
}

