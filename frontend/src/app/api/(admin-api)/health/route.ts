import { NextResponse } from 'next/server';

/**
 * Health check endpoint для E2E тестів
 * GET /api/health
 */
export async function GET() {
  try {
    return NextResponse.json({
      status: 'healthy',
      service: 'frontend',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        service: 'frontend',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
