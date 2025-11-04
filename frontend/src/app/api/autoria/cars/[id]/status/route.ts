import { NextResponse, NextRequest } from 'next/server';
import { ServerAuthManager } from '@/shared/utils/auth/serverAuth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the status from the request body
    const { status } = await request.json();
    const { id } = params;

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // Forward the request to the backend with normalized URL
    const rawBackend = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const normalizedBackend = rawBackend.replace(/\/+$/, '').replace(/\/api$/i, '');
    const backendUrl = `${normalizedBackend}/api/ads/cars/${id}/status`;
    
    console.log('[Owner Status Update] Updating car status:', { id, status, backendUrl });
    
    const response = await ServerAuthManager.authenticatedFetch(request, backendUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || 'Failed to update status' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Owner Status Update] Error:', error?.message || error);
    // Return 401 if authentication failed, 500 for other errors
    const status = error?.message?.includes('authentication') || error?.message?.includes('tokens') ? 401 : 500;
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status }
    );
  }
}
