/**
 * Client-only session management utilities
 * Prevents hydration mismatch by ensuring server/client consistency
 */

// Client-only session ID cache
let cachedSessionId: string | null = null;

/**
 * Get or create visitor session ID (client-only)
 * Returns undefined on server, consistent ID on client
 */
export function getVisitorSessionId(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined; // Server side
  }

  // Return cached ID if already generated
  if (cachedSessionId) {
    return cachedSessionId;
  }

  // Get from sessionStorage or create new
  let sessionId = sessionStorage.getItem('visitor_session_id');
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem('visitor_session_id', sessionId);
  }
  
  cachedSessionId = sessionId;
  return sessionId;
}

/**
 * Generate a consistent session ID
 */
function generateSessionId(): string {
  // Use timestamp + random for uniqueness but deterministic within same render
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Reset cached session ID (for testing or forced refresh)
 */
export function resetSessionIdCache(): void {
  cachedSessionId = null;
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('visitor_session_id');
  }
}
