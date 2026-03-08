import { IDummyAuth } from "@/shared/types/dummy.interfaces";
import {
  IBackendAuthCredentials,
  AuthResponse
} from "@/shared/types/auth.interfaces";
import { API_URLS, AuthProvider } from "@/shared/constants/constants";

// Normalize backend base URL to ensure no trailing "/" and no trailing "/api"
function normalizeBackendBase(url: string): string {
  try {
    if (!url) return 'http://localhost:8000';
    // Remove trailing slashes
    let u = url.trim().replace(/\/+$/, '');
    // If ends with /api (optionally with trailing slash), strip it
    u = u.replace(/\/(api)\/?$/i, '');
    return u;
  } catch {
    return 'http://localhost:8000';
  }
}

// Function for authentication
export const fetchAuth = async (
  credentials: IDummyAuth | IBackendAuthCredentials
): Promise<AuthResponse> => {
  console.log('[fetchAuth] Function called with credentials:', credentials);
  try {
    const isDummyAuth = (
      cred: IDummyAuth | IBackendAuthCredentials
    ): cred is IDummyAuth => {
      return "username" in cred;
    };

    // Определяем тип аутентификации один раз
    const isUsingDummyAuth = isDummyAuth(credentials);
    console.log(`[fetchAuth] Auth type: ${isUsingDummyAuth ? 'Dummy' : 'Backend'}, credentials:`, credentials);

    // Формируем endpoint с использованием Service Registry для backend
    let endpoint: string;
    if (isUsingDummyAuth) {
      endpoint = `/api/auth/login/dummy`;
    } else {
      // Для клиента всегда используем прокси Next.js, чтобы избежать проблем домена/порта
      if (typeof window !== 'undefined') {
        endpoint = `/api/auth/login`;
      } else {
        // На сервере используем BACKEND_URL
        const rawBackendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || API_URLS[AuthProvider.MyBackendDocs];
        const backendUrl = normalizeBackendBase(rawBackendUrl);
        endpoint = `${backendUrl}/api/auth/login`;
      }
      console.log(`[fetchAuth] Using endpoint: ${endpoint}`);
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
      cache: "no-store",
    });

    if (!response.ok) {
      let bodyText = '';
      try { bodyText = await response.text(); } catch {}
      console.error(`[fetchAuth] Backend auth error ${response.status}: ${response.statusText}. Body:`, bodyText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // В новой схеме токены сохраняются на сервере в login route
    // Клиент получает только access token и user data
    console.log('[fetchAuth] Login successful, tokens handled by server');

    // Возвращаем объект, соответствующий типу AuthResponse
    return {
      access: isUsingDummyAuth ? data.accessToken : data.access,
      refresh: isUsingDummyAuth ? data.refreshToken : data.refresh,
      user: isUsingDummyAuth
        ? {
            id: data.id,
            email: data.email || `${data.username}@dummy.com`
          }
        : data.user,
      redisSaveSuccess: data.sessionSaveSuccess || data.redisSaveSuccess // Используем флаг из ответа API
    };
  } catch (error) {
    console.error('[fetchAuth] Error occurred:', error);
    return {
      error: {
        message: error instanceof Error ? error.message : "Authentication failed"
      }
    };
  }
};
