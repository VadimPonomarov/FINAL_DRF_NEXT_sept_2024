import { handleAuthRedirect } from '../auth-redirect.helper';

/**
 * Server-side redirect page for /signin -> /api/auth/signin
 * Delegates redirect logic to shared auth-redirect helper
 */
export default async function SignInRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  await handleAuthRedirect(searchParams, '/signin');
}

