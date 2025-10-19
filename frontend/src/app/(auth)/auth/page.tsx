import { redirect } from 'next/navigation';

/**
 * Server-side redirect page for /auth -> /api/auth/signin
 * This page ensures proper redirection to the NextAuth signin page
 */
export default async function AuthRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  // Await searchParams (Next.js 15 requirement)
  const params = await searchParams;
  const callbackUrl = params.callbackUrl;

  console.log('[AuthRedirect] Server-side redirect from /auth to /api/auth/signin', {
    callbackUrl
  });

  // Server-side redirect to NextAuth signin
  if (callbackUrl) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  } else {
    redirect('/api/auth/signin');
  }
}
