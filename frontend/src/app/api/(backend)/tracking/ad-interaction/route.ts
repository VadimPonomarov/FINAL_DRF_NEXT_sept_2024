import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('[Ad Interaction Tracking] 🚀 NEW ROUTE CALLED - START');
  try {
    const data = await request.json();

    console.log('[Ad Interaction Tracking] 🎯 Tracking ad interaction:', data);

    // Отправляем в Django backend (приоритет - реальные данные)
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const url = `${backendUrl}/api/ads/analytics/track/ad-interaction/`;
    console.log('[Ad Interaction Tracking] 🔗 Forwarding to Django:', url);
    console.log('[Ad Interaction Tracking] 🌐 Backend URL from env:', backendUrl);

    console.log('[Ad Interaction Tracking] 📡 Making fetch request...');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    console.log('[Ad Interaction Tracking] 📡 Django response status:', response.status);

    if (!response.ok) {
      console.error('[Ad Interaction Tracking] ❌ Django error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('[Ad Interaction Tracking] ❌ Django error body:', errorText);
      
      return NextResponse.json({
        success: false,
        error: `Django backend error: ${response.status} ${response.statusText}`,
        details: errorText
      }, { status: response.status });
    }

    const result = await response.json();
    console.log('[Ad Interaction Tracking] ✅ Django response:', result);

    return NextResponse.json({
      success: true,
      message: 'Ad interaction tracked successfully',
      data: result
    });

  } catch (error: any) {
    console.error('[Ad Interaction Tracking] ❌ Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to track ad interaction',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
