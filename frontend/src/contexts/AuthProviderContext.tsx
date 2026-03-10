"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { toast } from "@/modules/autoria/shared/hooks/use-toast";
import { AuthProvider as AuthProviderEnum, TOAST_DURATION } from "@/shared/constants/constants";
import { User } from "@/shared/types/user.interface";
import { IAuthContext, IAuthProviderContext } from "@/shared/types/authContext.interface";
import { cleanupAuth } from '@/lib/auth/cleanupAuth';

// ============================================================================
// 1. КОНТЕКСТ ДЛЯ СОСТОЯНИЯ АУТЕНТИФИКАЦИИ (КТО ПОЛЬЗОВАТЕЛЬ)
// ============================================================================

const AuthContext = createContext<IAuthContext | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const isLoading = status === "loading";

  const checkUserStatus = useCallback(async () => {
    // Priority 1: NextAuth Session
    if (session?.user) {
      setUser(session.user as User);
      setIsAuthenticated(true);
      return;
    }

    // Priority 2: access_token cookie (form login without NextAuth session)
    if (typeof window !== 'undefined') {
      try {
        const resp = await fetch('/api/auth/token', { cache: 'no-store', credentials: 'include' });
        const tokenData = resp.ok ? await resp.json() : null;
        if (tokenData?.access) {
          setIsAuthenticated(true);
          // keep existing user state if already set, else null
          return;
        }
      } catch {
        // ignore fetch errors
      }
    }

    setUser(null);
    setIsAuthenticated(false);
  }, [session]);

  useEffect(() => {
    if (!isLoading) {
      checkUserStatus();
    }
  }, [session, status, isLoading]);

  const logout = useCallback(async () => {
    setIsAuthenticated(false);
    setUser(null);
    
    // Полная очистка сессии, localStorage, sessionStorage и Redis
    await cleanupAuth('/api/auth/signin');
    
    toast({ title: "Logged out successfully." });
  }, [toast]);
  
  const login = useCallback(async (user: User, accessToken: string, refreshToken: string) => {
      // Save tokens to httpOnly cookies via API route
      try {
        const response = await fetch('/api/auth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access: accessToken,
            refresh: refreshToken
          }),
        });

        if (!response.ok) {
          console.error('[AuthProvider] Failed to save tokens to cookies:', response.status);
          return;
        }

        console.log('[AuthProvider] ✅ Tokens saved to httpOnly cookies');
      } catch (error) {
        console.error('[AuthProvider] Error saving tokens to cookies:', error);
        return;
      }

      // Update local state
      setUser(user);
      setIsAuthenticated(true);
  }, []);


  return (
    <AuthContext.Provider value={{ isAuthenticated, user, isLoading, logout, login }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// ============================================================================
// 2. КОНТЕКСТ ДЛЯ ВЫБОРА ПРОВАЙДЕРА АУТЕНТИФИКАЦИИ (КАК ВХОДИТЬ)
// ============================================================================

const AuthProviderContext = createContext<IAuthProviderContext | undefined>(
  undefined,
);

export const AuthProviderProvider = ({ children }: { children: ReactNode }) => {
  const [provider, setProviderState] = useState<AuthProviderEnum>(
    AuthProviderEnum.Select,
  );
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize initial value from Redis (only once)
  useEffect(() => {
    if (isInitialized) return; // Предотвращаем повторную инициализацию

    const initProvider = async () => {
      try {
        console.log("[AuthProvider] Initializing auth provider from Redis...");

        // Set default provider immediately to prevent hydration issues
        setProviderState(AuthProviderEnum.MyBackendDocs);

        // Only try to fetch from Redis if we're in the browser
        if (typeof window === 'undefined') {
          console.log("[AuthProvider] Server-side rendering, using default provider");
          return;
        }

        // Check if we're in Docker environment
        const isDocker = process.env.NEXT_PUBLIC_IS_DOCKER === 'true';
        console.log(`[AuthProvider] Environment: ${isDocker ? 'Docker' : 'Local'}`);

        // Get provider from localStorage instead of Redis
        const savedProvider = localStorage.getItem('auth_provider');
        
        if (savedProvider && (Object.values(AuthProviderEnum) as string[]).includes(savedProvider)) {
          setProviderState(savedProvider as any);
          console.log("[AuthProvider] Successfully loaded provider from localStorage:", savedProvider);
        } else {
          console.log("[AuthProvider] No valid provider found in localStorage, using default:", AuthProviderEnum.MyBackendDocs);
        }
      } catch (error) {
        console.error("[AuthProvider] Error fetching initial auth provider:", error);
        console.log("[AuthProvider] Falling back to default provider:", AuthProviderEnum.MyBackendDocs);

        // Ensure we always have a valid provider
        setProviderState(AuthProviderEnum.MyBackendDocs);
      } finally {
        setIsInitialized(true); // Помечаем как инициализированный
      }
    };

    initProvider();
  }, []); // Убираем provider из зависимостей, чтобы избежать цикла

  const setProvider = useCallback(async (newProvider: AuthProviderEnum) => {
    try {
      console.log(`[AuthProvider] Changing provider to: ${newProvider}`);

      toast({
        title: "Provider Change",
        description: `Changing auth provider to ${newProvider}...`,
        duration: TOAST_DURATION.MEDIUM,
      });

      // Save provider to localStorage instead of Redis
      localStorage.setItem('auth_provider', newProvider);
      
      // Update state immediately
      setProviderState(newProvider);
      console.log("[AuthProvider] Auth provider changed to:", newProvider);

      toast({
        title: "Success",
        description: `Auth provider changed to ${newProvider}`,
        duration: TOAST_DURATION.MEDIUM,
      });

      // Trigger event to update components
      window.dispatchEvent(
        new CustomEvent("authProviderChanged", {
          detail: { provider: newProvider },
        }),
      );
    } catch (error) {
      console.error("[AuthProvider] Error saving auth provider to Redis:", error);

      // Still update the state locally even if Redis fails
      setProviderState(newProvider);
      console.log("[AuthProvider] Updated provider locally despite Redis error");

      toast({
        variant: "destructive",
        title: "Provider Change Warning",
        description: "Provider changed locally, but may not persist across sessions",
        duration: TOAST_DURATION.ERROR,
      });

      // Don't throw error to prevent UI from breaking
      // throw error;
    }
  }, []);

  // Show loading state during initialization to prevent hydration mismatches
  if (!isInitialized) {
    return (
      <AuthProviderContext.Provider value={{ provider: AuthProviderEnum.MyBackendDocs, setProvider: (() => {}) as any }}>
        {children}
      </AuthProviderContext.Provider>
    );
  }

  return (
    <AuthProviderContext.Provider value={{ provider, setProvider }}>
      {children}
    </AuthProviderContext.Provider>
  );
};

export const useAuthProvider = () => {
  const context = useContext(AuthProviderContext);
  if (context === undefined) {
    throw new Error(
      "useAuthProvider must be used within an AuthProviderProvider",
    );
  }
  return context;
};

// Проверяем наличие объекта window перед использованием
if (typeof window !== 'undefined') {
  window.location.pathname.split("/");
}
