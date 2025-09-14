import { NextRequest, NextResponse } from "next/server";
import { API_URLS, AuthProvider } from "@/common/constants/constants";

export async function POST(request: NextRequest) {
  try {
    console.log('[API] Dummy token refresh started');
    
    // Получаем refresh токен из тела запроса
    const body = await request.json();
    const { refresh } = body;
    
    if (!refresh) {
      console.error('[API] No refresh token provided');
      return NextResponse.json(
        { success: false, error: "Refresh token is required" },
        { status: 400 }
      );
    }
    
    // Отправляем запрос на DummyJSON для обновления токена
    const dummyUrl = API_URLS[AuthProvider.Dummy];
    const refreshUrl = `${dummyUrl}/auth/refresh`;
    
    console.log('[API] Sending refresh request to Dummy API:', refreshUrl);
    
    const response = await fetch(refreshUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken: refresh,
        expiresInMins: 30
      }),
      cache: 'no-store'
    });
    
    if (!response.ok) {
      console.error('[API] Dummy refresh failed with status:', response.status);
      return NextResponse.json(
        { success: false, error: `Dummy refresh failed with status: ${response.status}` },
        { status: response.status }
      );
    }
    
    // Получаем новые токены
    const data = await response.json();
    
    if (!data.accessToken || !data.refreshToken) {
      console.error('[API] Invalid response from Dummy refresh');
      return NextResponse.json(
        { success: false, error: "Invalid response from Dummy API" },
        { status: 500 }
      );
    }
    
    // Сохраняем новые токены в Redis
    const redisResponse = await fetch(`${request.nextUrl.origin}/api/redis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: "dummy_auth",
        value: JSON.stringify({
          access: data.accessToken,
          refresh: data.refreshToken,
          refreshAttempts: 0 // Сбрасываем счетчик попыток
        })
      }),
    });
    
    if (!redisResponse.ok) {
      console.error('[API] Failed to save new tokens to Redis');
      return NextResponse.json(
        { success: false, error: "Failed to save new tokens" },
        { status: 500 }
      );
    }
    
    console.log('[API] Dummy token refresh successful');
    
    return NextResponse.json({
      success: true,
      message: "Token refreshed successfully"
    });
  } catch (error) {
    console.error('[API] Error during Dummy token refresh:', error);
    return NextResponse.json(
      { success: false, error: "Failed to refresh token", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}