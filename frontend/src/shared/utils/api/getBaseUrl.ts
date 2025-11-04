export const getBaseUrl = () => {
  // Use the backend URL from environment configuration
  if (typeof window !== 'undefined') {
    // Client-side - use the public backend URL
    return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  }
  // Server-side - use backend URL for SSR
  return process.env.BACKEND_URL || 'http://localhost:8000';
};