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

  useEffect(() => {
    let active = true;
    const checkPresence = async () => {
      try {
        const resp = await fetch('/api/redis?key=backend_auth', { cache: 'no-store' });
        if (!resp.ok) throw new Error('redis endpoint failed');
        const data = await resp.json();
        const exists: boolean = Boolean(data?.exists && data?.value);

        if (!exists) {
          const callback = encodeURIComponent(`${pathname}${search?.toString() ? `?${search.toString()}` : ''}`);
          router.replace(`/login?callbackUrl=${callback}`);
          return;
        }

        if (active) setAllowed(true);
      } catch (_err) {
        const callback = encodeURIComponent(`${pathname}${search?.toString() ? `?${search.toString()}` : ''}`);
        router.replace(`/login?callbackUrl=${callback}`);
      }
    };

    checkPresence();
    return () => { active = false; };
  }, [router, pathname, search]);

  if (!allowed) return null;
  return <>{children}</>;
}


