import { NextRequest, NextResponse } from 'next/server';
import { getAuthProviderFromRequest } from '@/lib/cookie-utils';

/**
 * Get current auth provider from cookies
 */
export async function GET(request: NextRequest) {
  try {
    const authProvider = getAuthProviderFromRequest(request) || 'backend';
    
    return NextResponse.json({
      provider: authProvider,
      source: 'cookies'
    });
    
  } catch (error) {
    console.error('[Provider API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get provider' },
      { status: 500 }
    );
  }
}
