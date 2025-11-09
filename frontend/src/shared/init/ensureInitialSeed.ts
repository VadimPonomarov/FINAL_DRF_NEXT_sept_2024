"use client";

import { fetchWithAuth } from '@/modules/autoria/shared/utils/fetchWithAuth';

const AUTO_SEED_FLAG = Symbol.for('autoria.autoSeedCompleted');
const AUTO_SEED_PROMISE = Symbol.for('autoria.autoSeedPromise');

type GlobalWithAutoSeed = typeof globalThis & {
  [AUTO_SEED_FLAG]?: boolean;
  [AUTO_SEED_PROMISE]?: Promise<void> | null;
};

function getGlobal(): GlobalWithAutoSeed {
  return globalThis as GlobalWithAutoSeed;
}

interface SeedOptions {
  signal?: AbortSignal;
}

export async function ensureInitialTestAdsSeed(options?: SeedOptions): Promise<void> {
  const globalRef = getGlobal();

  if (globalRef[AUTO_SEED_FLAG]) {
    return;
  }

  if (!globalRef[AUTO_SEED_PROMISE]) {
    globalRef[AUTO_SEED_PROMISE] = (async () => {
      try {
        console.log('[AutoSeed] 🔄 Triggering one-time seed check...');
        const requestInit: RequestInit = {
          method: 'POST',
        };

        if (options?.signal) {
          requestInit.signal = options.signal;
        }

        const response = await fetchWithAuth('/api/autoria/test-ads/seed-once', requestInit);

        const contentType = response.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');
        let payload: Record<string, unknown> | null = null;

        if (isJson) {
          try {
            payload = (await response.json()) as Record<string, unknown>;
          } catch (parseError) {
            console.warn('[AutoSeed] ⚠️ Failed to parse seed-once response JSON:', parseError);
          }
        }

        if (response.ok) {
          globalRef[AUTO_SEED_FLAG] = true;
          console.log('[AutoSeed] ✅ Seed-once completed:', payload ?? {});
        } else {
          console.warn('[AutoSeed] ⚠️ Seed-once request returned non-OK status:', response.status, payload ?? {});
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          console.debug('[AutoSeed] ⏹️ Seed request aborted');
        } else {
          console.error('[AutoSeed] ❌ Seed request failed:', error);
        }
      } finally {
        globalRef[AUTO_SEED_PROMISE] = null;
      }
    })();
  }

  try {
    await globalRef[AUTO_SEED_PROMISE];
  } catch {
    // Ignored: failures should allow future retries
  }
}

export function resetInitialTestAdsSeedFlag() {
  const globalRef = getGlobal();
  delete globalRef[AUTO_SEED_FLAG];
  delete globalRef[AUTO_SEED_PROMISE];
}
