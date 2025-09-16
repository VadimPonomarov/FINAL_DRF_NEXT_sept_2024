import { NextResponse } from 'next/server';

export async function DELETE() {
  try {
    console.log('🧹 Starting cleanup of all test ads...');

    // Перенаправляем на новый рабочий endpoint
    const cleanupResponse = await fetch('http://localhost:3000/api/autoria/test-ads/cleanup-real', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!cleanupResponse.ok) {
      const errorText = await cleanupResponse.text();
      throw new Error(`Real cleanup failed: ${cleanupResponse.status} - ${errorText}`);
    }

    const result = await cleanupResponse.json();

    console.log(`✅ Successfully cleaned up ${result.deleted} ads via real endpoint`);

    return NextResponse.json({
      success: result.success,
      deleted: result.deleted,
      total_found: result.total_found,
      errors: result.errors || [],
      message: result.message || `Successfully deleted ${result.deleted} ads`
    });

  } catch (error) {
    console.error('❌ Error cleaning up test ads:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cleanup test ads',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test ads cleanup API',
    usage: 'DELETE /api/autoria/test-ads/cleanup to delete all ads'
  });
}
