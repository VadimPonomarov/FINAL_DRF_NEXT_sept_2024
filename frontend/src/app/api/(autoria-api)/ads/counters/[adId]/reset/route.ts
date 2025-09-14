import { NextRequest, NextResponse } from 'next/server';
import { ServerAuthManager } from '@/utils/auth/serverAuth';

export async function POST(request: NextRequest, { params }: { params: { adId: string } }) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const url = `${backendUrl}/api/ads/counters/ad/${params.adId}/reset/`;

    // Выполняем аутентифицированный запрос (требуется для проверки владельца)
    const response = await ServerAuthManager.authenticatedFetch(request, url, { method: 'POST' });

    const text = await response.text();
    if (!response.ok) {
      return NextResponse.json({ success: false, error: text || 'Backend error' }, { status: response.status });
    }

    // У backend может быть JSON
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data);
    } catch (_) {
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('[Counters Reset API] ❌ Error:', error);
    return NextResponse.json({ success: false, error: 'Client error' }, { status: 500 });
  }
}

