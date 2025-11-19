import { NextRequest, NextResponse } from 'next/server';
import { DELETE as backendCleanupDelete } from '../../../(backend)/autoria/test-ads/cleanup-real/route';

/**
 * Public cleanup endpoint used by the UI.
 * Delegates to the backend-aware cleanup-real route which uses BACKEND_URL
 * and handles authentication + deletion logic in one place.
 */
export async function DELETE(request: NextRequest) {
  console.log('🧹 [CLEANUP] Delegating to backend cleanup-real route...');
  return backendCleanupDelete(request);
}

export async function GET() {
  return NextResponse.json({
    message: 'Test ads cleanup API (delegating to cleanup-real)',
    usage: 'DELETE /api/autoria/test-ads/cleanup to delete all ads'
  });
}

