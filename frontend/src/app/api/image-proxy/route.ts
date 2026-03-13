import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/image-proxy?url=<encoded_url>
 * Server-side image proxy to avoid ERR_BLOCKED_BY_ORB for external images (e.g. pollinations.ai).
 * Fetches the image server-side (no CORS/ORB restrictions) and returns it with proper headers.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  const PLACEHOLDER = new URL('/api/placeholder/400/300', request.url);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    const response = await fetch(url, {
      headers: {
        Accept: 'image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'Mozilla/5.0 (compatible; NextJS image proxy)',
      },
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.redirect(PLACEHOLDER);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // If the upstream returned non-image (e.g. HTML error page), show placeholder
    if (!contentType.startsWith('image/')) {
      return NextResponse.redirect(PLACEHOLDER);
    }

    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return NextResponse.redirect(PLACEHOLDER);
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
