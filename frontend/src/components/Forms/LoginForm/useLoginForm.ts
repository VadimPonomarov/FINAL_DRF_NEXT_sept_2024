"use client";

import { useState, useCallback, useEffect } from "react";
import { joiResolver } from "@hookform/resolvers/joi";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { fetchAuth } from "@/app/api/helpers";
import { AuthProvider } from "@/common/constants/constants";
import { toast } from "@/hooks/use-toast";
import { IDummyAuth } from "@/common/interfaces/dummy.interfaces";
import { IBackendAuthCredentials } from "@/common/interfaces/auth.interfaces";
import { ISession } from "@/common/interfaces/session.interfaces";
import { User } from "@/common/interfaces/user.interface";
import { useAuthProvider, useAuth } from "@/contexts/AuthProviderContext";

import { backendSchema, dummySchema } from "./index.joi";

// Import debug functions for development
if (process.env.NODE_ENV === 'development') {
  // Token verification utility was removed as unused
}

// Function to verify tokens are saved in Redis
const verifyTokensInRedis = async (provider: AuthProvider): Promise<boolean> => {
  try {
    const redisKey = provider === AuthProvider.Dummy ? 'dummy_auth' : 'backend_auth';
    console.log(`[TokenVerification] Checking tokens in Redis with key: ${redisKey}`);

    const response = await fetch(`/api/redis?key=${encodeURIComponent(redisKey)}`);

    if (!response.ok) {
      console.error(`[TokenVerification] Redis API error: ${response.status}`);
      return false;
    }

    const data = await response.json();

    if (!data.exists || !data.value) {
      console.error('[TokenVerification] No tokens found in Redis');
      return false;
    }

    const tokenData = JSON.parse(data.value);
    console.log('[TokenVerification] Token data structure:', {
      hasAccess: !!tokenData.access,
      hasRefresh: !!tokenData.refresh,
      provider: tokenData.provider,
      keys: Object.keys(tokenData)
    });

    // Check for required tokens based on provider
    // Both providers now use 'access' and 'refresh' keys in Redis
    return !!(tokenData.access && tokenData.refresh);
  } catch (error) {
    console.error('[TokenVerification] Error verifying tokens:', error);
    return false;
  }
};

export const useLoginForm = () => {
  const { data: session } = useSession();
  const sessionData = session as unknown as ISession;
  const { provider } = useAuthProvider();
  const { login } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [formKey, setFormKey] = useState<number>(0); // Add a key for forcing re-render
  const router = useRouter();
  const searchParams = useSearchParams();
  // Функция для правильного декодирования URL
  const decodeCallbackUrl = (url: string | null): string => {
    if (!url) return "/autoria";

    try {
      // Попробуем декодировать URL (может быть закодирован дважды)
      let decoded = decodeURIComponent(url);

      // Если URL все еще содержит закодированные символы, декодируем еще раз
      if (decoded.includes('%')) {
        decoded = decodeURIComponent(decoded);
      }

      console.log('[useLoginForm] URL decoding:', {
        original: url,
        decoded: decoded
      });

      return decoded;
    } catch (error) {
      console.error('[useLoginForm] Error decoding URL:', error);
      return url; // Возвращаем оригинальный URL если декодирование не удалось
    }
  };

  const rawCallbackUrl = searchParams.get("callbackUrl") || searchParams.get("returnUrl");
  const callbackUrl = decodeCallbackUrl(rawCallbackUrl);

  // Логируем callbackUrl для отладки
  console.log('[useLoginForm] CallbackUrl from searchParams:', {
    rawCallbackUrl,
    callbackUrl: searchParams.get("callbackUrl"),
    returnUrl: searchParams.get("returnUrl"),
    finalCallbackUrl: callbackUrl,
    allSearchParams: Object.fromEntries(searchParams.entries())
  });

  // Initialize forms with default values
  const dummyForm = useForm<IDummyAuth>({
    resolver: joiResolver(dummySchema),
    defaultValues: {
      username: "",
      password: "",
      expiresInMins: 30
    },
    mode: "onChange" // Change mode to onChange for instant validation
  });

  const backendForm = useForm<IBackendAuthCredentials>({
    resolver: joiResolver(backendSchema),
    defaultValues: {
      email: sessionData?.email || "",
      password: ""
    },
    mode: "onChange" // Change mode to onChange for instant validation
  });

  // Effect to update email value in backendForm when session changes
  useEffect(() => {
    if (sessionData?.email) {
      backendForm.setValue('email', sessionData.email, { shouldValidate: true });
    }
  }, [sessionData?.email, backendForm]);

  // Effect to handle provider changes
  useEffect(() => {
    // When provider changes, reset forms and update with appropriate values
    if (provider === AuthProvider.MyBackendDocs) {
      backendForm.reset({
        email: sessionData?.email || "",
        password: ""
      });
    } else if (provider === AuthProvider.Dummy) {
      dummyForm.reset({
        username: "",
        password: "",
        expiresInMins: 30
      });
    }

    // Force re-render by updating the key
    setFormKey(prevKey => prevKey + 1);

    // Clear any error or message
    setError("");
    setMessage("");
  }, [provider, sessionData?.email, backendForm, dummyForm]);

  // Add effect to clear errors when form fields change
  useEffect(() => {
    const backendSubscription = backendForm.watch(() => {
      if (error) setError("");
    });

    const dummySubscription = dummyForm.watch(() => {
      if (error) setError("");
    });

    return () => {
      backendSubscription.unsubscribe();
      dummySubscription.unsubscribe();
    };
  }, [backendForm, dummyForm, error]);

  const resetForms = useCallback(() => {
    if (provider === AuthProvider.Dummy) {
      dummyForm.reset({
        username: "",
        password: "",
        expiresInMins: 30
      });
    } else if (provider === AuthProvider.MyBackendDocs) {
      backendForm.reset({
        email: sessionData?.email || "",
        password: ""
      });
    }

    // Clear any error or message
    setError("");
    setMessage("");

    // Force re-render by updating the key
    setFormKey(prevKey => prevKey + 1);
  }, [dummyForm, backendForm, sessionData?.email, provider]);

  const onSubmit = async (data: IDummyAuth | IBackendAuthCredentials) => {
    // Защита от повторных вызовов
    if (isLoading) {
      console.log('[Auth] Authentication already in progress, ignoring duplicate request');
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      setMessage("");

      // Initial notification - убираем, чтобы избежать спама
      // toast({
      //   title: "Authentication",
      //   description: "Starting authentication process...",
      //   duration: 3000,
      // });

      // Используем универсальную функцию fetchAuth из helpers.ts
      const authResponse = await fetchAuth(data as IDummyAuth | IBackendAuthCredentials);

      // Преобразуем ответ в ожидаемый формат
      const response = {
        data: authResponse.error ? undefined : authResponse,
        error: authResponse.error?.message || (authResponse.error ? 'Authentication failed' : undefined),
        status: authResponse.error ? 500 : 200,
        message: authResponse.error ? 'Authentication failed' : 'Authentication successful'
      };

      console.log('[LoginForm] Raw response from fetchAuth:', {
        hasError: !!response.error,
        hasData: !!response.data,
        status: response.status,
        message: response.message,
        errorType: typeof response.error,
        dataKeys: response.data ? Object.keys(response.data) : [],
        authResponseKeys: authResponse ? Object.keys(authResponse) : [],
        redisSaveSuccess: authResponse?.redisSaveSuccess
      });

      if (response.error) {
        throw new Error(typeof response.error === 'string'
          ? response.error
          : 'Authentication failed');
      }

      if (!response.data) {
        throw new Error('No data received from authentication');
      }

      // Успешная аутентификация
      console.log('[Auth] ✅ Authentication successful');

      // Update authentication state immediately with response data
      console.log('[LoginForm] Checking response data:', {
        hasUser: !!response.data.user,
        hasAccess: !!response.data.access,
        hasRefresh: !!response.data.refresh,
        userType: typeof response.data.user,
        accessType: typeof response.data.access,
        refreshType: typeof response.data.refresh,
        userKeys: response.data.user ? Object.keys(response.data.user) : [],
        accessLength: response.data.access ? response.data.access.length : 0,
        refreshLength: response.data.refresh ? response.data.refresh.length : 0
      });

      if (response.data.user && response.data.access && response.data.refresh) {
        console.log('[LoginForm] ✅ All required data present, calling login()');

        // Ensure user object matches the expected User interface
        const userForLogin: User = {
          id: response.data.user.id,
          email: response.data.user.email,
          first_name: '',
          last_name: '',
          role: 'user'
        };

        login(userForLogin, response.data.access, response.data.refresh);

        // Check if tokens were actually saved to Redis during fetchAuth
        const redisSaveSuccess = authResponse?.redisSaveSuccess;
        console.log(`[LoginForm] Redis save success from fetchAuth: ${redisSaveSuccess}`);

        if (redisSaveSuccess) {
          console.log('[LoginForm] ✅ Tokens confirmed saved to Redis by fetchAuth');

          // Показываем только один toast с коротким временем отображения
          toast({
            title: "Authentication",
            description: "Authentication successful!",
            duration: 2000, // Сокращаем время отображения
            variant: "default",
          });

          setMessage("Authentication successful!");

          // Redirect after successful authentication using callback URL
          console.log(`[Auth] Preparing redirect to: ${callbackUrl}`);
          console.log(`[Auth] Current URL: ${window.location.href}`);

          setTimeout(() => {
            console.log(`[Auth] Executing redirect to: ${callbackUrl}`);

            // Проверяем, что callbackUrl валидный
            try {
              const url = new URL(callbackUrl, window.location.origin);
              console.log(`[Auth] Parsed URL:`, {
                href: url.href,
                pathname: url.pathname,
                search: url.search
              });

              // Используем window.location для более надежного редиректа
              window.location.href = url.href;
            } catch (error) {
              console.error(`[Auth] Invalid callbackUrl, using router.push:`, error);
              router.push(callbackUrl);
            }
          }, 1500); // Увеличиваем задержку для надежности
        } else {
          console.error('[LoginForm] ❌ Tokens were NOT saved to Redis');

          toast({
            title: "Authentication Failed",
            description: "Tokens were not saved properly",
            duration: 4000, // Сокращаем время отображения
            variant: "destructive",
          });

          setError("Authentication failed: tokens not saved to Redis");

          // Попробуем редирект даже при проблемах с Redis, но с задержкой
          console.log('[Auth] Attempting redirect despite Redis issues...');
          setTimeout(() => {
            console.log(`[Auth] Fallback redirect to: ${callbackUrl}`);
            try {
              const url = new URL(callbackUrl, window.location.origin);
              window.location.href = url.href;
            } catch (error) {
              console.error(`[Auth] Fallback redirect failed:`, error);
              router.push('/autoria'); // Последний резерв
            }
          }, 3000); // Больше времени для отображения ошибки
        }
      } else {
        console.error('[Auth] ❌ Missing required authentication data in response');
        console.error('[Auth] Response data details:', {
          responseData: response.data,
          user: response.data?.user,
          access: response.data?.access,
          refresh: response.data?.refresh
        });
        setError("Authentication failed: Invalid response from server");

        toast({
          title: "Authentication Error",
          description: "Invalid response from authentication server",
          variant: "destructive",
          duration: 5000,
        });
      }

    } catch (err) {
      console.error('[Auth] Error:', err);

      // Create a more user-friendly error message
      let errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      let errorTitle = "Authentication Error";

      // Check for specific error types
      if (errorMessage.includes('timed out') || errorMessage.includes('Failed to fetch')) {
        errorMessage = 'Could not connect to the backend server. Please make sure the server is running and try again.';
        errorTitle = "Connection Error";
      } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        errorTitle = "Authentication Failed";
      }

      setError(errorMessage);

      // Error notification
      toast({
        variant: "destructive",
        title: errorTitle,
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    dummyForm,
    backendForm,
    error,
    message,
    isLoading,
    resetForms,
    onSubmit,
    formKey // Export the key for re-rendering
  };
};