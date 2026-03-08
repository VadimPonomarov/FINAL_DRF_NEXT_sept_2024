import { NextRequest, NextResponse } from 'next/server';

/**
 * Redis API stub - Redis has been removed from the project.
 * Returns empty/null responses to prevent 500 errors in components
 * that still call this endpoint.
 */
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key');
  console.debug(`[Redis Stub] GET key=${key} - Redis removed, returning empty response`);
  return NextResponse.json({ exists: false, value: null, key });
}

export async function POST(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key');
  console.debug(`[Redis Stub] POST key=${key} - Redis removed, ignoring`);
  return NextResponse.json({ success: true, key });
}

export async function DELETE(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key');
  console.debug(`[Redis Stub] DELETE key=${key} - Redis removed, ignoring`);
  return NextResponse.json({ success: true, key });
}
