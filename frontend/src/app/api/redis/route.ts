import { NextRequest, NextResponse } from 'next/server';

/**
 * Redis API stub - returns empty responses instead of errors
 * This prevents 404/500 errors during page initialization
 * All authentication now uses HTTP-only cookies instead of Redis
 */

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  
  // Return empty response for all Redis requests
  return NextResponse.json({
    exists: false,
    value: null,
    message: 'Redis is no longer used - authentication uses cookies'
  }, { status: 200 });
}

export async function POST(request: NextRequest) {
  // Silently accept POST requests but do nothing
  return NextResponse.json({
    success: true,
    message: 'Redis is no longer used - authentication uses cookies'
  }, { status: 200 });
}

export async function DELETE(request: NextRequest) {
  // Silently accept DELETE requests but do nothing
  return NextResponse.json({
    success: true,
    message: 'Redis is no longer used - authentication uses cookies'
  }, { status: 200 });
}
