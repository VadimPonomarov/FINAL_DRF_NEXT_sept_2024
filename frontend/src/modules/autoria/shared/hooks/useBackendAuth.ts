import React from 'react';
export function useBackendAuth(): { user: null; isAuthenticated: boolean; loading: boolean } {
  return { user: null, isAuthenticated: false, loading: false };
}
export const BackendAuthGuard: React.FC<any> = ({ children }: any) => children;
export default useBackendAuth;
