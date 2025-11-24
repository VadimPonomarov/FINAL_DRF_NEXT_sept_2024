import type { NextRequest } from 'next/server';

export async function deleteRedisKeys(nextUrl: NextRequest['nextUrl'], keys: string[]): Promise<void> {
  await Promise.all(
    keys.map(async (key) => {
      try {
        const url = new URL(`${nextUrl.origin}/api/redis`);
        url.searchParams.set('key', key);

        const response = await fetch(url.toString(), {
          method: 'DELETE',
          cache: 'no-store',
        });

        if (!response.ok) {
          console.warn('[Auth Redis Cleanup] ⚠️ Failed to delete Redis key via /api/redis:', key, response.status);
        }
      } catch (error) {
        console.error('[Auth Redis Cleanup] ❌ Error deleting Redis key via /api/redis:', key, error);
      }
    })
  );
}
