import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple Redis API test - no Redis connection, just env vars
 */

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: "Redis API route works",
      env: {
        REDIS_URL: process.env.REDIS_URL || 'NOT_SET',
        NEXT_PUBLIC_REDIS_URL: process.env.NEXT_PUBLIC_REDIS_URL || 'NOT_SET',
        NODE_ENV: process.env.NODE_ENV,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT_SET'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Error in simple Redis test',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
