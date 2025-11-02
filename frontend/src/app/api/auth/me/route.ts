import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '@/configs/auth';
import { Redis } from '@upstash/redis';

export async function GET() {
  try {
    const session = await getServerSession(authConfig);
    
    if (!session?.user) {
      console.log('[API /auth/me] No session found');
      return new NextResponse(
        JSON.stringify({ 
          authenticated: false,
          error: 'Not authenticated' 
        }), 
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }

    console.log('[API /auth/me] Session found, checking backend tokens...');

    // Проверяем наличие backend токенов в Redis
    let backendTokensValid = false;
    try {
      const redis = Redis.fromEnv();
      const backendAuth = await redis.get('backend_auth');
      backendTokensValid = !!backendAuth;
      console.log('[API /auth/me] Backend tokens in Redis:', backendTokensValid);
    } catch (redisError) {
      console.error('[API /auth/me] Redis check failed:', redisError);
      backendTokensValid = false;
    }

    // Если нет backend токенов, считаем что не полностью аутентифицирован
    if (!backendTokensValid) {
      console.log('[API /auth/me] No backend tokens found - partial auth');
      return NextResponse.json({
        authenticated: false,
        error: 'Backend tokens required',
        needsBackendAuth: true,
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image
        }
      }, {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }

    console.log('[API /auth/me] Full authentication valid');

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        accessToken: session.accessToken
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return new NextResponse(
      JSON.stringify({ 
        authenticated: false,
        error: 'Internal server error' 
      }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}
