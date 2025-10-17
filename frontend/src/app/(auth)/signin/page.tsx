import { redirect } from 'next/navigation';

/**
 * Server-side redirect page for /signin -> /api/auth/signin
 * NextAuth sometimes redirects to /signin instead of /api/auth/signin
 * This page ensures proper redirection to the correct NextAuth signin page
 */
export default async function SignInRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  // Await searchParams (Next.js 15 requirement)
  const params = await searchParams;
  const callbackUrl = params.callbackUrl;

  console.log('[SignInRedirect] Server-side redirect from /signin to /api/auth/signin', {
    callbackUrl
  });

  // Server-side redirect to NextAuth signin
  if (callbackUrl) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  } else {
    redirect('/api/auth/signin');
  }
}

