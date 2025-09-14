import { NextRequest, NextResponse } from 'next/server';
import { ServerAuthManager } from '@/utils/auth/serverAuth';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * Unified CRUD API for specific AutoRia Address by ID
 * 
 * GET    /api/accounts/addresses/[id] - Get specific address
 * PUT    /api/accounts/addresses/[id] - Update address (full)
 * PATCH  /api/accounts/addresses/[id] - Update address (partial)
 * DELETE /api/accounts/addresses/[id] - Delete address
 */

/**
 * GET /api/accounts/addresses/[id] - Get specific address
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  return handleAddressRequest(request, params.id, 'GET');
}

/**
 * PUT /api/accounts/addresses/[id] - Update address (full replacement)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  return handleAddressRequest(request, params.id, 'PUT');
}

/**
 * PATCH /api/accounts/addresses/[id] - Update address (partial)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return handleAddressRequest(request, params.id, 'PATCH');
}

/**
 * DELETE /api/accounts/addresses/[id] - Delete address
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return handleAddressRequest(request, params.id, 'DELETE');
}

/**
 * Unified handler for all address operations by ID
 */
async function handleAddressRequest(request: NextRequest, id: string, method: string) {
  try {
    console.log(`[Address ${id} API] 📤 ${method} request...`);

    // Check authentication
    const isAuthenticated = await ServerAuthManager.isAuthenticated(request);
    if (!isAuthenticated) {
      console.log(`[Address ${id} API] ❌ User not authenticated`);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get request body for POST/PUT/PATCH requests
    let body = null;
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        body = await request.json();
        console.log(`[Address ${id} API] 📝 Request data:`, {
          input_region: body.input_region,
          input_locality: body.input_locality
        });
      } catch (e) {
        // Body might be empty for some requests
      }
    }

    // Get backend URL
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // Make authenticated request
    const response = await ServerAuthManager.authenticatedFetch(
      request,
      `${backendUrl}/api/accounts/addresses/${id}/detail/`,
      { 
        method,
        ...(body && { body: JSON.stringify(body) })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[Address ${id} API] ❌ Backend request failed:`, response.status, errorData);
      
      return NextResponse.json(
        { 
          error: `Failed to ${method.toLowerCase()} address`,
          detail: errorData.detail || `HTTP ${response.status}`,
          backend_error: errorData
        },
        { status: response.status }
      );
    }

    // For DELETE requests, return success without body
    if (method === 'DELETE') {
      console.log(`[Address ${id} API] ✅ Address deleted successfully`);
      return NextResponse.json({ success: true, message: 'Address deleted successfully' });
    }

    const addressData = await response.json();
    console.log(`[Address ${id} API] ✅ ${method} successful:`, {
      id: addressData.id,
      locality: addressData.locality,
      region: addressData.region,
      geocoded: addressData.is_geocoded
    });
    
    return NextResponse.json(addressData);

  } catch (error) {
    console.error(`[Address ${id} API] ❌ ${method} error:`, error);
    
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json(
        { 
          error: 'Authentication failed',
          detail: 'Please log in with backend authentication to access addresses',
          redirect_to_login: true
        },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        detail: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
