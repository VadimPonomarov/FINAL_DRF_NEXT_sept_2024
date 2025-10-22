/**
 * Универсальный обработчик аутентификации для всех API endpoints
 * 
 * Этот хелпер обеспечивает:
 * 1. Автоматическое обновление токенов при получении 401
 * 2. Повтор запроса с обновленными токенами
 * 3. Универсальную обработку ошибок аутентификации
 * 4. Поддержку как клиентской, так и серверной стороны
 */

import { NextRequest, NextResponse } from 'next/server';

export interface AuthHandlerOptions {
  /** Показывать ли toast уведомления (только на клиенте) */
  showToast?: boolean;
  /** Перенаправлять ли на логин при неудаче (только на клиенте) */
  redirectToLogin?: boolean;
  /** Callback URL для перенаправления */
  callbackUrl?: string;
  /** Дополнительные заголовки для запроса */
  headers?: Record<string, string>;
}

export interface AuthHandlerResult {
  success: boolean;
  response?: Response;
  error?: string;
  shouldRetry?: boolean;
}

/**
 * Универсальный обработчик аутентификации для клиентской стороны
 */
export async function handleClientAuth(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: AuthHandlerOptions = {}
): Promise<Response> {
  const {
    showToast = true,
    redirectToLogin = true,
    callbackUrl,
    headers = {}
  } = options;

  console.log('[UniversalAuth] Making authenticated request to:', input);

  // Делаем первоначальный запрос
  const response = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...(init.headers || {})
    },
    cache: 'no-store'
  });

  // Если не 401, возвращаем ответ как есть
  if (response.status !== 401) {
    console.log('[UniversalAuth] Request successful, status:', response.status);
    return response;
  }

  console.log('[UniversalAuth] ⚠️ Received 401, attempting token refresh...');

  // Пытаемся обновить токены
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const refreshResponse = await fetch(`${origin}/api/auth/refresh`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (refreshResponse.ok) {
      console.log('[UniversalAuth] ✅ Token refresh successful, retrying request...');
      
      // Повторяем оригинальный запрос с обновленными токенами
      const retryResponse = await fetch(input, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
          ...(init.headers || {})
        },
        cache: 'no-store'
      });

      if (retryResponse.status !== 401) {
        console.log('[UniversalAuth] ✅ Retry successful, status:', retryResponse.status);
        return retryResponse;
      }

      console.log('[UniversalAuth] ❌ Retry still returned 401, tokens are invalid');
    } else {
      console.log('[UniversalAuth] ❌ Token refresh failed, status:', refreshResponse.status);
    }
  } catch (error) {
    console.error('[UniversalAuth] ❌ Error during token refresh:', error);
  }

  // Если обновление токенов не помогло
  if (typeof window !== 'undefined') {
    console.log('[UniversalAuth] 🔄 Authentication failed, handling redirect...');

    // Показываем уведомление пользователю
    if (showToast) {
      try {
        const { toast } = await import('@/hooks/use-toast');
        toast({
          title: "Требуется авторизация",
          description: "Ваша сессия истекла. Пожалуйста, войдите снова для доступа к ресурсам.",
          variant: "destructive",
          duration: 5000,
        });
      } catch (err) {
        console.error('[UniversalAuth] Failed to show toast:', err);
      }
    }

    // Перенаправляем на страницу логина
    if (redirectToLogin) {
      setTimeout(() => {
        const currentUrl = callbackUrl || window.location.pathname + window.location.search;
        const encodedCallback = encodeURIComponent(currentUrl);
        window.location.href = `/login?callbackUrl=${encodedCallback}&message=${encodeURIComponent('Ваша сессия истекла. Пожалуйста, войдите снова.')}`;
      }, 500);
    }
  }

  return response;
}

/**
 * Универсальный обработчик аутентификации для серверной стороны
 */
export async function handleServerAuth(
  request: NextRequest,
  url: string,
  options: RequestInit = {},
  authOptions: AuthHandlerOptions = {}
): Promise<Response> {
  console.log('[UniversalAuth] Making server-side authenticated request to:', url);

  try {
    // Импортируем ServerAuthManager
    const { ServerAuthManager } = await import('./serverAuth');
    
    // Используем ServerAuthManager для аутентифицированного запроса
    const response = await ServerAuthManager.authenticatedFetch(request, url, options);
    
    console.log('[UniversalAuth] Server request successful, status:', response.status);
    return response;
    
  } catch (error) {
    console.error('[UniversalAuth] Server authentication failed:', error);
    
    // Возвращаем 401 ответ для серверной стороны
    return new Response(
      JSON.stringify({
        error: 'Authentication failed',
        message: 'No valid authentication tokens available',
        requiresAuth: true
      }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

/**
 * Универсальная функция для обработки 401 ошибок в API endpoints
 */
export function createAuthErrorResponse(
  message: string = 'Authentication required',
  redirectTo: string = '/login'
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'NOT_AUTHENTICATED',
      message,
      requiresAuth: true,
      redirectTo,
      callbackUrl: '/login'
    },
    { status: 401 }
  );
}

/**
 * Проверяет, является ли ответ 401 ошибкой аутентификации
 */
export function isAuthError(response: Response): boolean {
  return response.status === 401;
}

/**
 * Извлекает информацию об ошибке аутентификации из ответа
 */
export async function parseAuthError(response: Response): Promise<{
  isAuthError: boolean;
  message?: string;
  requiresAuth?: boolean;
  redirectTo?: string;
}> {
  if (!isAuthError(response)) {
    return { isAuthError: false };
  }

  try {
    const data = await response.json();
    return {
      isAuthError: true,
      message: data.message || 'Authentication required',
      requiresAuth: data.requiresAuth || false,
      redirectTo: data.redirectTo || '/login'
    };
  } catch {
    return {
      isAuthError: true,
      message: 'Authentication required'
    };
  }
}

/**
 * Универсальный хелпер для API endpoints с автоматической обработкой 401
 */
export async function withAuth<T>(
  authFunction: () => Promise<T>,
  fallback?: () => T
): Promise<T> {
  try {
    return await authFunction();
  } catch (error: any) {
    if (error.message?.includes('Authentication failed') || 
        error.message?.includes('No authentication tokens')) {
      console.log('[UniversalAuth] Authentication error caught, using fallback');
      return fallback ? fallback() : null as T;
    }
    throw error;
  }
}
