"use client";

import { useState, useCallback, useEffect } from "react";
import { joiResolver } from "@hookform/resolvers/joi";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signIn as nextAuthSignIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { fetchAuth } from "@/app/api/helpers";
import { AuthProvider } from "@/shared/constants/constants";
import { toast } from "@/modules/autoria/shared/hooks/use-toast";
import { IDummyAuth } from "@/shared/types/dummy.interfaces";
import { IBackendAuthCredentials } from "@/shared/types/auth.interfaces";
import { ISession } from "@/shared/types/session.interfaces";
import { User } from "@/shared/types/user.interface";
import { useAuthProvider, useAuth } from "@/contexts/AuthProviderContext";
import { useTranslation } from "@/contexts/I18nContext";
import { redirectManager } from "@/shared/utils/auth/redirectManager";

import { backendSchema, dummySchema } from "./index.joi";

// Redis removed - now using cookies and sessions only

export const useLoginForm = () => {
  const t = useTranslation();
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
  // Получаем callback URL из параметров запроса
  const rawCallbackUrl = searchParams.get("callbackUrl") || searchParams.get("returnUrl");

  // Используем redirectManager для определения URL перенаправления
  const callbackUrl = redirectManager.getRedirectUrl({
    callbackUrl: rawCallbackUrl,
    provider: provider,
    fallbackUrl: '/'
  });

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
      password: "12345678"
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
        password: "12345678"
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
        password: "12345678"
      });
    }

    // Clear any error or message
    setError("");
    setMessage("");

    // Force re-render by updating the key
    setFormKey(prevKey => prevKey + 1);
  }, [dummyForm, backendForm, sessionData?.email, provider]);

  const onSubmit = async (data: IDummyAuth | IBackendAuthCredentials) => {
    console.log('[useLoginForm] onSubmit called with data:', {
      provider,
      hasUsername: 'username' in data,
      hasEmail: 'email' in data,
      passwordLength: data.password?.length || 0,
      isLoading
    });

    // Защита от повторных вызовов
    if (isLoading) {
      console.log('[Auth] Authentication already in progress, ignoring duplicate request');
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      setMessage("");

      console.log('[useLoginForm] Starting authentication process...');

      // Initial notification - убираем, чтобы избежать спама
      // toast({
      //   title: "Authentication",
      //   description: "Starting authentication process...",
      //   duration: 3000,
      // });

      // Используем универсальную функцию fetchAuth из helpers.ts
      const authResponse = await fetchAuth(data as IDummyAuth | IBackendAuthCredentials);

      console.log('[LoginForm] fetchAuth returned:', authResponse);

      // fetchAuth возвращает AuthResponse напрямую: {access, refresh, user} или {error}
      // Не нужно дополнительное обертывание
      if (authResponse.error) {
        throw new Error(authResponse.error.message || 'Authentication failed');
      }

      // Проверяем что получили необходимые данные
      if (!authResponse.access || !authResponse.user) {
        console.error('[LoginForm] Invalid response structure:', authResponse);
        throw new Error('Invalid response from server - missing tokens or user data');
      }


      // Успешная аутентификация
      console.log('[Auth] ✅ Authentication successful');

      // Update authentication state immediately with response data
      console.log('[LoginForm] Checking response data:', {
        hasUser: !!authResponse.user,
        hasAccess: !!authResponse.access,
        hasRefresh: !!authResponse.refresh,
        userType: typeof authResponse.user,
        accessType: typeof authResponse.access,
        refreshType: typeof authResponse.refresh,
        userKeys: authResponse.user ? Object.keys(authResponse.user) : [],
        accessLength: authResponse.access ? authResponse.access.length : 0,
        refreshLength: authResponse.refresh ? authResponse.refresh.length : 0
      });

      if (authResponse.user && authResponse.access && authResponse.refresh) {
        console.log('[LoginForm] ✅ All required data present, calling login()');

        // Ensure user object matches the expected User interface with all backend fields
        const userForLogin: User = {
          id: authResponse.user.id,
          email: authResponse.user.email,
          first_name: authResponse.user.first_name || '',
          last_name: authResponse.user.last_name || '',
          role: authResponse.user.role || 'user',
          is_superuser: authResponse.user.is_superuser || false
        };

        console.log('[LoginForm] User data for login:', {
          email: userForLogin.email,
          isSuperuser: userForLogin.is_superuser
        });

        login(userForLogin, authResponse.access, authResponse.refresh);

        // Create NextAuth session so middleware can verify auth (Level 1)
        // CredentialsProvider requires only email - no password validation needed
        nextAuthSignIn('credentials', { email: userForLogin.email, redirect: false })
          .then(() => console.log('[LoginForm] NextAuth session created'))
          .catch((e) => console.warn('[LoginForm] NextAuth session creation failed (non-critical):', e));

        console.log('[LoginForm] Tokens saved in httpOnly cookies');

        toast({
          title: t('auth.loginSuccessTitle', 'Authentication Successful'),
          description: t('auth.loginSuccess', 'You have successfully signed in'),
          duration: 2000,
          variant: "default",
        });

        setMessage("Authentication successful!");

        const redirectUrl = rawCallbackUrl || callbackUrl || '/';
        console.log('[Auth] Redirecting to: ' + redirectUrl);

        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 1500);
      } else {
        console.error('[Auth] ❌ Missing required authentication data in response');
        console.error('[Auth] Response data details:', {
          responseData: authResponse,
          user: authResponse?.user,
          access: authResponse?.access,
          refresh: authResponse?.refresh
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
      let errorMessage = err instanceof Error ? err.message : t('auth.loginFailed', 'Authentication failed');
      let errorTitle = t('auth.errorTitle', 'Authentication Error');

      // Check for specific error types
      if (errorMessage.includes('timed out') || errorMessage.includes('Failed to fetch')) {
        errorMessage = t('auth.connectionError', 'Could not connect to the backend server. Please make sure the server is running and try again.');
        errorTitle = t('auth.connectionErrorTitle', 'Connection Error');
      } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
        errorMessage = t('auth.invalidCredentials', 'Invalid email or password. Please check your credentials and try again.');
        errorTitle = t('auth.loginFailedTitle', 'Authentication Failed');
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