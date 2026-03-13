import { NextRequest, NextResponse } from 'next/server';
import '@/lib/env-loader';

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

export async function POST(request: NextRequest) {
  const markerPath = resolveMarkerPath();
  const marker = await readSeedMarker(markerPath);

  // If already seeded, return skip with marker info
  if (marker?.firstSeedCompleted) {
    return NextResponse.json({
      success: true,
      skipped: true,
      alreadySeeded: true,
      message: 'Test ads have already been seeded once. Use manual generation for additional ads.',
      marker,
    });
  }

  // Perform one-time seed
  try {
    console.log('[SeedOnce] Performing one-time seed...');
    const seedResult = await createTestAdsServer(
      request,        // Use the current request for authentication
      5,              // Create 5 test ads for one-time seed
      true,           // Include images
      ['front', 'side', 'rear'] // Standard image angles
    );
    const newMarker: SeedMarker = {
      firstSeedCompleted: true,
      completed_at: new Date().toISOString(),
      count: seedResult?.created || 1,
    };
    await writeSeedMarker(markerPath, newMarker);
    console.log('[SeedOnce] One-time seed completed. Marker written.');
    return NextResponse.json({
      success: true,
      skipped: false,
      seeded: true,
      message: 'One-time seed completed successfully.',
      marker: newMarker,
      result: seedResult,
    });
  } catch (error) {
    console.error('[SeedOnce] Seed failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Seed failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
