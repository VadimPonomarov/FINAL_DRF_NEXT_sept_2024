export interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export interface TokenPresenceResult {
  hasTokens: boolean;
  provider?: string;
  error?: string;
}
