/**
 * Session API functions - isolated to avoid circular dependencies
 */

// Use Redis only via API to avoid bundling Node 'net' in client
const __isServer = typeof window === 'undefined';
const __frontendBaseUrl = __isServer 
  ? (process.env.NEXT_PUBLIC_IS_DOCKER === 'true' 
      ? 'http://frontend:3000' 
      : process.env.NEXTAUTH_URL || 'http://localhost:3000')
  : '';

export async function apiGetSession(key: string): Promise<string | null> {
    try {
        const res = await fetch(`${__frontendBaseUrl}/api/session?key=${encodeURIComponent(key)}`, { cache: 'no-store' });
        if (!res.ok) return null;
        const data = await res.json();
        return data?.exists ? (data.value as string) : null;
    } catch {
        return null;
    }
}

export async function apiSetSession(key: string, value: string): Promise<boolean> {
    try {
        const res = await fetch(`${__frontendBaseUrl}/api/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value })
        });
        return res.ok;
    } catch {
        return false;
    }
}
