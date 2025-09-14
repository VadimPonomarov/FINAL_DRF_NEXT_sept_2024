import { NextRequest, NextResponse } from 'next/server';
import { ServerAuthManager } from '@/utils/auth/serverAuth';

export async function GET(request: NextRequest) {
  try {
    console.log('[Accounts Contacts API] 📤 Fetching account contacts...');

    // Check if user is authenticated
    const isAuthenticated = await ServerAuthManager.isAuthenticated(request);
    if (!isAuthenticated) {
      console.log('[Accounts Contacts API] ❌ User not authenticated');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get backend URL from environment
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // Use ServerAuthManager to make authenticated request
    console.log('[Accounts Contacts API] 🔄 Fetching contacts from backend...');
    const response = await ServerAuthManager.authenticatedFetch(
      request,
      `${backendUrl}/api/accounts/contacts/`,
      { method: 'GET' }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Accounts Contacts API] ❌ Backend error:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      return NextResponse.json(
        { error: 'Failed to fetch contacts', details: errorData },
        { status: response.status }
      );
    }

    const contactsData = await response.json();
    console.log('[Accounts Contacts API] ✅ Contacts fetched successfully:', contactsData?.length || 0);
    return NextResponse.json(contactsData);

  } catch (error) {
    console.error('[Accounts Contacts API] ❌ Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('[Accounts Contacts API] 🚀 POST method called');

  try {
    console.log('[Accounts Contacts API] 📤 Creating contact...');

    // Check if user is authenticated
    console.log('[Accounts Contacts API] 🔐 Checking authentication...');
    const isAuthenticated = await ServerAuthManager.isAuthenticated(request);
    console.log('[Accounts Contacts API] 🔐 Authentication result:', isAuthenticated);

    if (!isAuthenticated) {
      console.log('[Accounts Contacts API] ❌ User not authenticated');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    let requestData;
    try {
      requestData = await request.json();
      console.log('[Accounts Contacts API] 📝 Contact data:', requestData);
    } catch (parseError) {
      console.error('[Accounts Contacts API] ❌ Failed to parse request JSON:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    try {
      // Get backend URL from environment
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

      // Use ServerAuthManager to make authenticated request
      const response = await ServerAuthManager.authenticatedFetch(
        request,
        `${backendUrl}/api/accounts/contacts/`,
        { 
          method: 'POST',
          body: JSON.stringify(requestData)
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Accounts Contacts API] ❌ Backend error:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          url: `${backendUrl}/api/accounts/contacts/`,
          requestData
        });
        return NextResponse.json(
          { error: 'Failed to create contact', details: errorData },
          { status: response.status }
        );
      }

      const contactData = await response.json();
      console.log('[Accounts Contacts API] ✅ Contact created successfully');
      return NextResponse.json(contactData);

    } catch (error) {
      console.error('[Accounts Contacts API] ❌ Backend request failed:', error);
      return NextResponse.json(
        { error: 'Failed to create contact' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[Accounts Contacts API] ❌ TOP-LEVEL CATCH - Unexpected error:', error);
    console.error('[Accounts Contacts API] ❌ Error type:', typeof error);
    console.error('[Accounts Contacts API] ❌ Error constructor:', error?.constructor?.name);
    console.error('[Accounts Contacts API] ❌ Error message:', error instanceof Error ? error.message : String(error));
    console.error('[Accounts Contacts API] ❌ Error stack:', error instanceof Error ? error.stack : 'No stack');

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        errorType: typeof error,
        errorConstructor: error?.constructor?.name
      },
      { status: 500 }
    );
  }
}
