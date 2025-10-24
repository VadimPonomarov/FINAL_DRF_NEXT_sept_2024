"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";
import { toast } from "@/hooks/use-toast";
import { AuthProvider as AuthProviderEnum, TOAST_DURATION } from "@/common/constants/constants";
import { IAuthProviderContext } from "@/common/interfaces/authContext.interface";

/**
 * Контекст для управления выбором провайдера аутентификации
 * Отвечает за: provider, setProvider
 * Сохраняет выбор провайдера в Redis
 */
const AuthProviderContext = createContext<IAuthProviderContext | undefined>(undefined);

export const AuthProviderProvider = ({ children }: { children: ReactNode }) => {
  const [provider, setProviderState] = useState<AuthProviderEnum>(
    AuthProviderEnum.Select,
  );
  const [isInitialized, setIsInitialized] = useState(false);

  // Инициализация провайдера из Redis (только один раз)
  useEffect(() => {
    if (isInitialized) return;

    const initProvider = async () => {
      try {
        console.log("[AuthProviderContext] Initializing auth provider from Redis...");

        // Устанавливаем провайдер по умолчанию для предотвращения проблем с гидратацией
        setProviderState(AuthProviderEnum.MyBackendDocs);

        // Только в браузере пытаемся загрузить из Redis
        if (typeof window === 'undefined') {
          console.log("[AuthProviderContext] Server-side rendering, using default provider");
          return;
        }

        // Проверяем Docker окружение
        const isDocker = process.env.NEXT_PUBLIC_IS_DOCKER === 'true';
        console.log(`[AuthProviderContext] Environment: ${isDocker ? 'Docker' : 'Local'}`);

        const response = await fetch(`/api/redis?key=auth_provider`);

        if (!response.ok) {
          console.warn(`[AuthProviderContext] Redis API returned ${response.status}: ${response.statusText}`);
          console.log("[AuthProviderContext] Using default provider:", AuthProviderEnum.MyBackendDocs);
          return;
        }

        const data = await response.json();
        console.log("[AuthProviderContext] Redis response:", data);

        if (data.value && Object.values(AuthProviderEnum).includes(data.value)) {
          setProviderState(data.value as AuthProviderEnum);
          console.log("[AuthProviderContext] Successfully loaded provider from Redis:", data.value);
        } else {
          console.log("[AuthProviderContext] No valid provider found in Redis, keeping default:", AuthProviderEnum.MyBackendDocs);
        }
      } catch (error) {
        console.error("[AuthProviderContext] Error fetching initial auth provider:", error);
        console.log("[AuthProviderContext] Falling back to default provider:", AuthProviderEnum.MyBackendDocs);
        setProviderState(AuthProviderEnum.MyBackendDocs);
      } finally {
        setIsInitialized(true);
      }
    };

    initProvider();
  }, [isInitialized]);

  const setProvider = useCallback(async (newProvider: AuthProviderEnum) => {
    try {
      console.log(`[AuthProviderContext] Changing provider from ${provider} to: ${newProvider}`);
      
      // При смене провайдера очищаем Redis от токенов старого провайдера
      if (provider !== AuthProviderEnum.Select && provider !== newProvider) {
        const oldRedisKey = provider === AuthProviderEnum.Dummy ? 'dummy_auth' : 'backend_auth';
        console.log(`[AuthProviderContext] Clearing old provider data from Redis: ${oldRedisKey}`);
        
        try {
          const deleteResponse = await fetch(`/api/redis?key=${encodeURIComponent(oldRedisKey)}`, {
            method: 'DELETE'
          });
          
          if (deleteResponse.ok) {
            console.log(`[AuthProviderContext] ✅ Successfully deleted ${oldRedisKey} from Redis`);
          } else {
            console.warn(`[AuthProviderContext] ⚠️ Failed to delete ${oldRedisKey}:`, deleteResponse.status);
          }
        } catch (error) {
          console.error(`[AuthProviderContext] ⚠️ Error deleting ${oldRedisKey}:`, error);
        }
      }
      
      console.log(`[AuthProviderContext] Setting new provider: ${newProvider}`);

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
        console.error(`[AuthProviderContext] Redis API error: ${response.status} ${response.statusText}`, errorText);
        
        // Обновляем состояние локально даже при ошибке Redis
        setProviderState(newProvider);
        console.log("[AuthProviderContext] Updated provider locally despite Redis error");
        return;
      }

      const responseData = await response.json();
      console.log("[AuthProviderContext] Redis save response:", responseData);

      // Обновляем состояние
      setProviderState(newProvider);
      console.log("[AuthProviderContext] Auth provider changed to:", newProvider);

      // Показываем сообщение об успехе
      const storageType = responseData.storage || 'unknown';
      const successMessage = storageType === 'redis' 
        ? `Auth provider changed to ${newProvider}`
        : `Auth provider changed to ${newProvider} (saved locally)`;

      toast({
        title: "Success",
        description: successMessage,
        duration: TOAST_DURATION.MEDIUM,
      });

      // Отправляем события для обновления компонентов
      window.dispatchEvent(new CustomEvent("authDataChanged")); // Обновляем RedisUserBadge
      window.dispatchEvent(
        new CustomEvent("authProviderChanged", {
          detail: { provider: newProvider },
        }),
      );
    } catch (error) {
      console.error("[AuthProviderContext] Error saving auth provider to Redis:", error);

      // Обновляем состояние локально даже при ошибке
      setProviderState(newProvider);
      console.log("[AuthProviderContext] Updated provider locally despite Redis error");

      toast({
        variant: "destructive",
        title: "Provider Change Warning",
        description: "Provider changed locally, but may not persist across sessions",
        duration: TOAST_DURATION.ERROR,
      });
    }
  }, [provider]);

  // Мемоизируем context value
  const contextValue = useMemo(() => ({
    provider,
    setProvider
  }), [provider, setProvider]);

  // Мемоизируем loading context value
  const loadingContextValue = useMemo(() => ({
    provider: AuthProviderEnum.MyBackendDocs,
    setProvider: () => {}
  }), []);

  // Показываем loading состояние во время инициализации
  if (!isInitialized) {
    return (
      <AuthProviderContext.Provider value={loadingContextValue}>
        {children}
      </AuthProviderContext.Provider>
    );
  }

  return (
    <AuthProviderContext.Provider value={contextValue}>
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
