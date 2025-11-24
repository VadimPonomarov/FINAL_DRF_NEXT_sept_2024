import { handleAuthRedirect } from '../auth-redirect.helper';

/**
 * Server-side redirect page for /auth -> /api/auth/signin
 * This page delegates redirect logic to shared auth-redirect helper
 */
export default async function AuthRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  await handleAuthRedirect(searchParams, '/auth');
}
