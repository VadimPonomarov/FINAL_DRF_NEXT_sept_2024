import { NextRequest } from 'next/server';
import { POST as backendGeneratePost } from '../../../(backend)/autoria/test-ads/generate/route';

export async function POST(request: NextRequest) {
  return backendGeneratePost(request);
}
