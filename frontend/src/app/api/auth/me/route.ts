import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '@/configs/auth';

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

    console.log('[API /auth/me] Session found:', { 
      user: { 
        id: session.user.id,
        email: session.user.email,
        name: session.user.name
      } 
    });

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
