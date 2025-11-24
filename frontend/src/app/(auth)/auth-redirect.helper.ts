import { redirect } from 'next/navigation';

export interface AuthRedirectSearchParams {
  callbackUrl?: string;
}

export async function handleAuthRedirect(
  searchParams: Promise<AuthRedirectSearchParams>,
  source: string,
) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl;

  console.log(`[${source}] Server-side redirect to /api/auth/signin`, {
    callbackUrl,
  });

  if (callbackUrl) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  } else {
    redirect('/api/auth/signin');
  }
}
