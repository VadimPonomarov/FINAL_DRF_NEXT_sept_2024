import { NextRequest, NextResponse } from 'next/server';
import '@/lib/env-loader';

import fs from 'fs/promises';
import path from 'path';
import { createTestAdsServer } from '../generate/route';

interface SeedMarker {
  firstSeedCompleted: boolean;
  completed_at?: string;
  count?: number;
}

async function readSeedMarker(markerPath: string): Promise<SeedMarker | null> {
  try {
    const data = await fs.readFile(markerPath, 'utf-8');
    return JSON.parse(data) as SeedMarker;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null;
    }
    console.error('[SeedOnce] Failed to read marker file:', error);
    return null;
  }
}

async function writeSeedMarker(markerPath: string, payload: SeedMarker): Promise<void> {
  try {
    const dir = path.dirname(markerPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(markerPath, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (error) {
    console.error('[SeedOnce] Failed to write marker file:', error);
  }
}

function resolveMarkerPath(): string {
  const base = process.env.NEXT_PUBLIC_SEED_MARKER_PATH || process.env.SEED_MARKER_PATH;
  if (base) {
    return path.resolve(base);
  }
  const defaultPath = path.join(process.cwd(), '.next', 'cache', 'autoria-seed-marker.json');
  return defaultPath;
}

export async function POST(request: NextRequest) {
  const markerPath = resolveMarkerPath();
  const marker = await readSeedMarker(markerPath);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  try {
    const url = new URL('/api/ads/statistics/quick/', backendUrl);
    console.log('[SeedOnce] Fetching quick stats from', url.toString());
    const statsResponse = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!statsResponse.ok) {
      const body = await statsResponse.text().catch(() => '');
      throw new Error(`Stats request failed: ${statsResponse.status} ${body}`);
    }

    const statsJson = await statsResponse.json();
    const activeAds = Number(statsJson?.data?.active_ads ?? statsJson?.active_ads ?? 0);
    const totalAds = Number(statsJson?.data?.total_ads ?? statsJson?.total_ads ?? 0);
    const MIN_TOTAL_ADS = 10;

    const markerCount = Number(marker?.count ?? 0);
    const needsInitialSeed = !marker?.firstSeedCompleted;
    const needsRefreshByMarker = marker?.firstSeedCompleted && markerCount < MIN_TOTAL_ADS;
    const needsRefreshByStats = totalAds < MIN_TOTAL_ADS || activeAds < Math.max(1, Math.floor(MIN_TOTAL_ADS / 2));

    if (!needsInitialSeed && !needsRefreshByMarker && !needsRefreshByStats) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: `Seed already completed previously (total=${totalAds}, active=${activeAds})`,
        marker,
      });
    }

    const seedCount = Math.max(0, MIN_TOTAL_ADS - totalAds);
    const desiredCount = seedCount > 0 ? seedCount : MIN_TOTAL_ADS;

    console.log(`[SeedOnce] Active ads = ${activeAds}. Generating ${desiredCount} test ads...`);

    const result = await createTestAdsServer(request, desiredCount, true, ['front', 'side', 'rear']);

    await writeSeedMarker(markerPath, {
      firstSeedCompleted: true,
      completed_at: new Date().toISOString(),
      count: totalAds + (result.created ?? desiredCount),
    });

    return NextResponse.json({
      success: true,
      created: result.created,
      totalImages: result.totalImages,
      details: result.details,
      message: `Generated ${result.created} test ads with ${result.totalImages} images`,
    });
  } catch (error: any) {
    console.error('[SeedOnce] Seeding failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
