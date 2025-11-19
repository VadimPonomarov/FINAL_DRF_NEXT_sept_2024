import { NextRequest, NextResponse } from 'next/server';

// Proxy media files from Django backend: /api/media/<path> -> <BACKEND_URL>/media/<path>
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const relPath = Array.isArray(path) ? path.join('/') : String(path);

    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const url = `${backendUrl}/media/${relPath}`;

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return new NextResponse(text || 'Not Found', { status: res.status });
    }

    // Stream back with original headers
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const arrayBuffer = await res.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to proxy media' }, { status: 500 });
  }
}

