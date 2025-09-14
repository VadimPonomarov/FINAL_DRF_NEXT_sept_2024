import { NextRequest, NextResponse } from 'next/server';
import { ServerAuthManager } from '@/utils/auth/serverAuth';

interface RouteParams {
  params: { id: string };
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const isAuthenticated = await ServerAuthManager.isAuthenticated(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const resp = await ServerAuthManager.authenticatedFetch(
      request,
      `${backendUrl}/api/accounts/contacts/${params.id}`,
      { method: 'DELETE' }
    );

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      return NextResponse.json({ error: 'Failed to delete contact', details: text }, { status: resp.status });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const isAuthenticated = await ServerAuthManager.isAuthenticated(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const resp = await ServerAuthManager.authenticatedFetch(
      request,
      `${backendUrl}/api/accounts/contacts/${params.id}`,
      { method: 'PUT', body: JSON.stringify(body) }
    );

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      return NextResponse.json({ error: 'Failed to update contact', details: text }, { status: resp.status });
    }

    const data = await resp.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

