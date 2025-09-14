import { NextRequest, NextResponse } from 'next/server';
import { ServerAuthManager } from '@/utils/auth/serverAuth';

export async function GET(request: NextRequest) {
  try {
    console.log('[User Account API] 📤 Fetching user account...');

    // Check if user is authenticated
    const isAuthenticated = await ServerAuthManager.isAuthenticated(request);
    if (!isAuthenticated) {
      console.log('[User Account API] ❌ User not authenticated');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    try {
      // Get backend URL from environment
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

      // Use ServerAuthManager to make authenticated request with automatic token refresh
      console.log('[User Account API] 🔄 Fetching real account data from backend...');
      const response = await ServerAuthManager.authenticatedFetch(
        request,
        `${backendUrl}/api/accounts/`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error(`Backend request failed: ${response.status}`);
      }

      const raw = await response.json();
      // Normalize: backend may return paginated list {count, results: [...]} — return first account object
      const accountData = (raw && typeof raw === 'object' && Array.isArray(raw.results))
        ? (raw.results[0] ?? null)
        : raw;
      console.log('[User Account API] ✅ Real account data fetched successfully. Normalized:', !!accountData);
      return NextResponse.json(accountData ?? null);

    } catch (error) {
      console.error('[User Account API] ❌ Backend request failed:', error);

      // If backend fails, return empty account data to show placeholders
      console.log('[User Account API] 🔄 Returning empty account data to show placeholders...');
      const emptyAccountData = {
        id: null,
        user: null,
        account_type: "",
        moderation_level: "",
        role: "",
        organization_name: "",
        organization_id: null,
        stats_enabled: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      return NextResponse.json(emptyAccountData);
    }

  } catch (error) {
    console.error('[User Account API] ❌ Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch user account' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[User Account API] 📤 Updating user account (proxy to backend)...');

    const isAuthenticated = await ServerAuthManager.isAuthenticated(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const requestData = await request.json();
    console.log('[User Account API] 📝 Update data:', requestData);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const resp = await ServerAuthManager.authenticatedFetch(
      request,
      `${backendUrl}/api/accounts/`,
      { method: 'POST', body: JSON.stringify(requestData) }
    );

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      console.error('[User Account API] ❌ Backend error:', resp.status, text);
      return NextResponse.json({ error: 'Failed to update account', details: text }, { status: resp.status });
    }

    const data = await resp.json();
    console.log('[User Account API] ✅ Account updated successfully');
    return NextResponse.json(data);

  } catch (error) {
    console.error('[User Account API] ❌ Error updating account:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update account' },
      { status: 500 }
    );
  }
}
