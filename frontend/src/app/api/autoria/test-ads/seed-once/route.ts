import { NextRequest } from 'next/server';
import { POST as backendSeedOncePost } from '../../../(backend)/autoria/test-ads/seed-once/route';

export async function POST(request: NextRequest) {
  return backendSeedOncePost(request);
}
