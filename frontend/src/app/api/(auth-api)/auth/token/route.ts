import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Получаем токены из Redis
    const redisResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/redis?key=backend_auth`);
    
    if (!redisResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to get tokens from Redis' },
        { status: 401 }
      );
    }

    const redisData = await redisResponse.json();
    
    if (!redisData.exists || !redisData.value) {
      return NextResponse.json(
        { error: 'No authentication tokens found' },
        { status: 401 }
      );
    }

    const tokenData = JSON.parse(redisData.value);
    
    if (!tokenData.access) {
      return NextResponse.json(
        { error: 'No access token available' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      access: tokenData.access,
      refresh: tokenData.refresh
    });

  } catch (error) {
    console.error('[Token API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
