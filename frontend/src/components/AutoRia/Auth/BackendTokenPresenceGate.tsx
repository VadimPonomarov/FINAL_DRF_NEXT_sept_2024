'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

/**
 * Level 2 auth gate for AutoRia area.
 * Checks only the PRESENCE of backend tokens in Redis (no validation).
 * If absent → redirect to /login with callback to return after obtaining tokens.
 */
export default function BackendTokenPresenceGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [allowed, setAllowed] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let active = true;
    const checkPresence = async () => {
      console.log('[BackendTokenPresenceGate] Checking backend tokens...');
      try {
        const resp = await fetch('/api/redis?key=backend_auth', { cache: 'no-store' });
        if (!resp.ok) {
          console.log('[BackendTokenPresenceGate] Redis endpoint failed');
          throw new Error('redis endpoint failed');
        }
        const data = await resp.json();
        const exists: boolean = Boolean(data?.exists && data?.value);

        console.log('[BackendTokenPresenceGate] Token exists:', exists);

        if (!exists) {
          console.log('[BackendTokenPresenceGate] No tokens found, redirecting to /login');
          const callback = encodeURIComponent(`${pathname}${search?.toString() ? `?${search.toString()}` : ''}`);
          router.replace(`/login?callbackUrl=${callback}`);
          return;
        }

        if (active) {
          console.log('[BackendTokenPresenceGate] ✅ Tokens found, allowing access');
          setAllowed(true);
          setIsChecking(false);
        }
      } catch (err) {
        console.error('[BackendTokenPresenceGate] Error checking tokens:', err);
        const callback = encodeURIComponent(`${pathname}${search?.toString() ? `?${search.toString()}` : ''}`);
        router.replace(`/login?callbackUrl=${callback}`);
      }
    };

    checkPresence();
    return () => { active = false; };
  }, [router, pathname, search]);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Проверка авторизации...</p>
        </div>
      </div>
    );
  }

  if (!allowed) return null;
  return <>{children}</>;
}


