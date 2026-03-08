import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

async function hasCookieToken(): Promise<boolean> {
  try {
    const r = await fetch('/api/auth/token', { cache: 'no-store', credentials: 'include' });
    const d = r.ok ? await r.json() : null;
    return !!(d?.access);
  } catch {
    return false;
  }
}

/**
 * Hook for lazy data loading - only after authentication and session presence
 * Prevents 401/403 errors on page initialization before user is authenticated
 */
export function useAuthenticatedFetch<T>(
  fetchFn: () => Promise<T>,
  options: {
    enabled?: boolean;
    requireAuth?: boolean;
    onError?: (error: Error) => void;
  } = {}
) {
  const { data: session, status } = useSession();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { enabled = true, requireAuth = true, onError } = options;

  useEffect(() => {
    // Don't fetch if disabled
    if (!enabled) {
      return;
    }

    // If auth is required, wait for session to be loaded
    if (requireAuth && status === 'loading') return;

    // Fetch data
    const fetchData = async () => {
      // Check auth: NextAuth session OR cookie token
      if (requireAuth) {
        const isAuthed = !!session || await hasCookieToken();
        if (!isAuthed) return;
      }
      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchFn();
        setData(result);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        
        // Only log 401/403 errors, ignore others during initialization
        if (err instanceof Response) {
          if (err.status === 401 || err.status === 403) {
            console.warn(`[useAuthenticatedFetch] Auth error ${err.status}:`, error.message);
          }
        }
        
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [session, status, enabled, requireAuth]);

  return { data, error, isLoading, refetch: fetchFn };
}
