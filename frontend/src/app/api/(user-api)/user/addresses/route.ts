import { NextRequest, NextResponse } from 'next/server';
import { ServerAuthManager } from '@/utils/auth/serverAuth';

export async function GET(request: NextRequest) {
  try {
    console.log('[User Addresses API] 📤 Fetching user addresses...');

    // Check if user is authenticated
    const isAuthenticated = await ServerAuthManager.isAuthenticated(request);
    if (!isAuthenticated) {
      console.log('[User Addresses API] ❌ User not authenticated');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    try {
      // Get backend URL from environment
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

      // Use ServerAuthManager to make authenticated request with automatic token refresh
      console.log('[User Addresses API] 🔄 Fetching real addresses data from backend...');
      const response = await ServerAuthManager.authenticatedFetch(
        request,
        `${backendUrl}/api/accounts/addresses/filtered/`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error(`Backend request failed: ${response.status}`);
      }

      const addressesData = await response.json();
      console.log('[User Addresses API] ✅ Real addresses data fetched successfully:', addressesData);

      // Обрабатываем разные форматы ответа от бэкенда
      let addresses = [];
      if (Array.isArray(addressesData)) {
        addresses = addressesData;
      } else if (addressesData && addressesData.results) {
        addresses = addressesData.results;
      } else if (addressesData && typeof addressesData === 'object') {
        // Если это единственный объект адреса, оборачиваем в массив
        addresses = [addressesData];
      }

      console.log('[User Addresses API] 📋 Processed addresses:', addresses);
      return NextResponse.json(addresses);

    } catch (error) {
      console.error('[User Addresses API] ❌ Backend request failed:', error);

      // If backend fails, return empty addresses array to show placeholders
      console.log('[User Addresses API] 🔄 Returning empty addresses array...');
      return NextResponse.json([]);
    }

  } catch (error) {
    console.error('[User Addresses API] ❌ Error:', error);
    return NextResponse.json([]);
  }
}
