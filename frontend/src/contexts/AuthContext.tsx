"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useSession, signOut } from "next-auth/react";
import { toast } from "@/hooks/use-toast";
import { User } from "@/common/interfaces/user.interface";
import { IAuthContext } from "@/common/interfaces/authContext.interface";

/**
 * Контекст для управления состоянием аутентификации пользователя
 * Отвечает за: user, isAuthenticated, login, logout
 */
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

    // Priority 2: Custom Backend Auth from localStorage
    try {
      const storedAuth = localStorage.getItem("backend_auth");
      if (storedAuth) {
        const authData = JSON.parse(storedAuth);
        if (authData?.user && authData?.access) {
          setUser(authData.user);
          setIsAuthenticated(true);
          return;
        }
      }
    } catch (e) {
      console.error("[AuthContext] Failed to parse backend_auth from localStorage", e);
      localStorage.removeItem("backend_auth");
    }

    // If no valid auth found
    setUser(null);
    setIsAuthenticated(false);
  }, [session]);

  useEffect(() => {
    if (!isLoading) {
      checkUserStatus();
    }
  }, [session, status, isLoading, checkUserStatus]);

  const logout = useCallback(async () => {
    setIsAuthenticated(false);
    setUser(null);
    await signOut({ redirect: false });
    localStorage.removeItem("backend_auth");
    toast({ title: "Logged out successfully." });
    window.location.href = '/api/auth/signin';
  }, []);
  
  const login = useCallback((user: User, accessToken: string, refreshToken: string) => {
    const authPayload = {
      access: accessToken,
      refresh: refreshToken,
      user: user,
    };
    localStorage.setItem('backend_auth', JSON.stringify(authPayload));
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

