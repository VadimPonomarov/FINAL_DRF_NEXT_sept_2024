import { NextRequest, NextResponse } from 'next/server';

import fs from 'fs/promises';
import path from 'path';
import { createTestAdsServer } from '../generate/route';

// Normalize backend base URL similarly to the generic backend proxy and generate route:
// 1) Prefer BACKEND_URL, fallback to NEXT_PUBLIC_BACKEND_URL
// 2) Trim trailing slashes
// 3) Strip a trailing /api if present
const RAW_BACKEND_BASE = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
const BACKEND_URL = RAW_BACKEND_BASE.replace(/\/+$/, '').replace(/\/(api)\/?$/i, '');

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

// Direct count fallback method
async function getDirectAdCount(backendUrl: string): Promise<number> {
  try {
    const countUrl = `${backendUrl}/api/ads/cars/`;
    const response = await fetch(countUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    
    if (response.ok) {
      const data = await response.json();
      const count = data?.count ?? data?.total ?? data?.length ?? 0;
      console.log(`[SeedOnce] Direct count result: ${count} ads`);
      return Number(count);
    }
  } catch (error) {
    console.warn('[SeedOnce] Direct count failed:', error);
  }
  return 0;
}

export async function POST(request: NextRequest) {
  const markerPath = resolveMarkerPath();
  const marker = await readSeedMarker(markerPath);
  const backendUrl = BACKEND_URL;

  try {
    const url = new URL('/api/ads/statistics/quick/', backendUrl);
    // Always force fresh statistics to avoid stale cached values during seeding
    url.searchParams.set('force_refresh', 'true');
    console.log('[SeedOnce] Fetching quick stats from', url.toString());
    
    // Get accurate statistics with multiple fallback methods
    let activeAds = 0;
    let totalAds = 0;
    
    try {
      // Method 1: Quick stats API
      const statsResponse = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });

      if (statsResponse.ok) {
        const statsJson = await statsResponse.json();
        const data = statsJson?.data ?? statsJson;
        const source = statsJson?.source;
        
        activeAds = Number(data?.active_ads ?? 0);
        totalAds = Number(data?.total_ads ?? 0);
        
        console.log('[SeedOnce] QuickStats result:', { source, totalAds, activeAds });
        
        // If fallback data, try direct count
        if (source === 'mock_fallback' || source === 'error_fallback') {
          console.warn('[SeedOnce] QuickStats returned fallback, trying direct count...');
          const directCount = await getDirectAdCount(backendUrl);
          if (directCount > 0) {
            totalAds = directCount;
            activeAds = directCount;
          }
        }
      } else {
        throw new Error(`Stats request failed: ${statsResponse.status}`);
      }
    } catch (error) {
      console.warn('[SeedOnce] Stats API failed, trying direct count:', error);
      totalAds = await getDirectAdCount(backendUrl);
      activeAds = totalAds;
    }

    const MIN_TOTAL_ADS = 10;

    const markerCount = Number(marker?.count ?? 0);

    // Use the maximum of stats and marker as our best-effort estimate of how many ads already exist.
    // This prevents repeated seeding when QuickStats falls back to mock/error data but the marker
    // already knows we have at least MIN_TOTAL_ADS records.
    const effectiveTotal = Math.max(totalAds, markerCount);

    if (effectiveTotal >= MIN_TOTAL_ADS) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: `Seed not required (total≈${effectiveTotal}, active=${activeAds})`,
        marker,
      });
    }

    const desiredCount = Math.max(0, MIN_TOTAL_ADS - effectiveTotal);

    if (desiredCount === 0) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: `Seed not required after calculation (total≈${effectiveTotal}, active=${activeAds})`,
        marker,
      });
    }

    console.log(`[SeedOnce] Active ads = ${activeAds}, total≈${effectiveTotal}. Generating ${desiredCount} test ads...`);

    const result = await createTestAdsServer(request, desiredCount, true, ['front', 'side']);

    const createdCount = Number(result.created ?? desiredCount);
    const newTotal = Math.max(effectiveTotal, Math.min(MIN_TOTAL_ADS, effectiveTotal + createdCount));

    await writeSeedMarker(markerPath, {
      firstSeedCompleted: true,
      completed_at: new Date().toISOString(),
      count: newTotal,
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

