/**
 * Single source of truth for the backend API base URL.
 *
 * Priority (highest → lowest):
 *  1. NEXT_PUBLIC_BACKEND_URL  (client + server, baked at build time)
 *  2. BACKEND_URL              (server-side only, runtime)
 *  3. http://localhost:8000    (local dev fallback)
 *
 * Never import this module in server-only code that runs before
 * Next.js has finished env loading — use BACKEND_URL directly there.
 */

export const BACKEND_URL: string =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    'http://localhost:8000';

/**
 * Build a full backend API URL from a path.
 * @example backendUrl('/api/users/public/list/')
 */
export function backendUrl(path: string): string {
    const base = BACKEND_URL.replace(/\/+$/, '');
    const normalised = path.startsWith('/') ? path : `/${path}`;
    return `${base}${normalised}`;
}
