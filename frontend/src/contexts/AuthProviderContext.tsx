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
import { toast } from "@/hooks/use-toast";
import { AuthProvider as AuthProviderEnum, TOAST_DURATION } from "@/common/constants/constants";
import { User } from "@/common/interfaces/user.interface";
import { IAuthContext, IAuthProviderContext } from "@/common/interfaces/authContext.interface";
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

  const checkUserStatus = useCallback(() => {
    // Priority 1: Next-Auth Session
    if (session?.user) {
      setUser(session.user as User);
      setIsAuthenticated(true);
      return;
    }

    // Priority 2: Custom Backend Auth from Redis (NOT localStorage)
    // Токены хранятся только в Redis, не в localStorage
    // Проверка наличия токенов происходит через BackendTokenPresenceGate

    // If no valid auth found
    setUser(null);
    setIsAuthenticated(false);
  }, [session]);

  useEffect(() => {
    if (!isLoading) {
      checkUserStatus();
    }
  }, [session, status, isLoading]); // Убираем checkUserStatus из зависимостей

  const logout = useCallback(async () => {
    setIsAuthenticated(false);
    setUser(null);
    
    // Полная очистка сессии, localStorage, sessionStorage и Redis
    await cleanupAuth('/api/auth/signin');
    
    toast({ title: "Logged out successfully." });
  }, [toast]);
  
  const login = useCallback((user: User, accessToken: string, refreshToken: string) => {
      // Токены сохраняются в Redis через API route, НЕ в localStorage
      // Здесь только обновляем локальный state
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

        const response = await fetch(`/api/redis?key=auth_provider`);

        if (!response.ok) {
          console.warn(`[AuthProvider] Redis API returned ${response.status}: ${response.statusText}`);
          console.log("[AuthProvider] Using default provider:", AuthProviderEnum.MyBackendDocs);
          return;
        }

        const data = await response.json();
        console.log("[AuthProvider] Redis response:", data);

        if (data.value && Object.values(AuthProviderEnum).includes(data.value)) {
          setProviderState(data.value as AuthProviderEnum);
          console.log("[AuthProvider] Successfully loaded provider from Redis:", data.value);
        } else {
          console.log("[AuthProvider] No valid provider found in Redis, keeping default:", AuthProviderEnum.MyBackendDocs);
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

      const response = await fetch("/api/redis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "auth_provider",
          value: newProvider,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[AuthProvider] Redis API error: ${response.status} ${response.statusText}`, errorText);
        
        // Update state immediately for better UX, even if Redis fails
        setProviderState(newProvider);
        console.log("[AuthProvider] Updated provider locally despite Redis error");

        // Убираем toast для лучшего UX - пользователь не должен видеть технические ошибки
        // toast({
        //   variant: "destructive",
        //   title: "Provider Change Warning",
        //   description: "Provider changed locally, but may not persist across sessions",
        //   duration: TOAST_DURATION.ERROR,
        // });

        // Don't throw error to prevent UI from breaking
        return;
      }

      const responseData = await response.json();
      console.log("[AuthProvider] Redis save response:", responseData);

      // Update state immediately for better UX
      setProviderState(newProvider);
      console.log("[AuthProvider] Auth provider changed to:", newProvider);

      // Show appropriate success message based on storage type
      const storageType = responseData.storage || 'unknown';
      const successMessage = storageType === 'redis' 
        ? `Auth provider changed to ${newProvider}`
        : `Auth provider changed to ${newProvider} (saved locally)`;

      toast({
        title: "Success",
        description: successMessage,
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
      <AuthProviderContext.Provider value={{ provider: AuthProviderEnum.MyBackendDocs, setProvider: () => {} }}>
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
