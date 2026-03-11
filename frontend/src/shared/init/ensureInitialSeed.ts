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
  // ОТКЛЮЧЕНО: Предотвращаем автогенерацию объявлений
  console.log('[AutoSeed] 🚫 Auto-seeding DISABLED - preventing unwanted ad generation');
  return;
}

export function resetInitialTestAdsSeedFlag() {
  const globalRef = getGlobal();
  delete globalRef[AUTO_SEED_FLAG];
  delete globalRef[AUTO_SEED_PROMISE];
  console.log('[AutoSeed] 🔄 Seed flags reset');
}
