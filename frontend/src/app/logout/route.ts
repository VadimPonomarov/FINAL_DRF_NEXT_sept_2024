import { NextRequest } from 'next/server';
import { handleLogout } from './logout.service';

/**
 * GET /logout
 * Тонкий route handler: делегирует всю бизнес-логику в logout.service
 */
export async function GET(req: NextRequest) {
  return handleLogout(req);
}
