export const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side
    return window.location.origin;
  }
  // Server-side
  const protocol = process.env.API_SCHEMA || 'http';
  const host = process.env.API_HOST || 'localhost';
  const port = process.env.API_PORT || '3000';
  
  return `${protocol}://${host}:${port}`;
};