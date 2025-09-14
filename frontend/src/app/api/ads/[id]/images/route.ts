import { NextRequest, NextResponse } from 'next/server';
import { ServerAuthManager } from '@/utils/auth/serverAuth';

// POST multipart upload to backend: /api/ads/[id]/images
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // If body is multipart/form-data, we must pass it through as-is, without setting Content-Type
    const contentType = request.headers.get('content-type') || '';
    const isMultipart = contentType.toLowerCase().includes('multipart/form-data');

    let init: RequestInit = { method: 'POST' };

    if (isMultipart) {
      // Rebuild FormData to avoid streaming issues and keep filename/boundary
      const inForm = await request.formData();
      const outForm = new FormData();
      for (const [key, value] of inForm.entries()) {
        outForm.append(key, value as any);
      }
      init.body = outForm as any;
      // Important: do NOT set Content-Type manually for FormData
    } else {
      // Forward JSON as-is
      const body = await request.text();
      init.body = body;
      init.headers = { 'Content-Type': 'application/json' };
    }

    const response = await ServerAuthManager.authenticatedFetch(
      request,
      `${backendUrl}/api/ads/${id}/images`,
      init as any
    );

    if (!response.ok) {
      const text = await response.text();
      console.error('[Ad Images API] ❌ Upload failed:', response.status, text);
      return NextResponse.json({ error: text || 'Failed to upload image' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    console.error('[Ad Images API] ❌ Unexpected error:', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

