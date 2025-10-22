/**
 * Универсальный обработчик для API endpoints с автоматической обработкой 401 ошибок
 * 
 * Этот хелпер обеспечивает:
 * 1. Автоматическое обновление токенов при получении 401
 * 2. Повтор запроса с обновленными токенами
 * 3. Универсальную обработку ошибок аутентификации
 * 4. Поддержку как клиентской, так и серверной стороны
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleClientAuth, handleServerAuth, createAuthErrorResponse } from '../auth/universalAuthHandler';

export interface ApiHandlerOptions {
  /** Показывать ли toast уведомления (только на клиенте) */
  showToast?: boolean;
  /** Перенаправлять ли на логин при неудаче (только на клиенте) */
  redirectToLogin?: boolean;
  /** Callback URL для перенаправления */
  callbackUrl?: string;
  /** Дополнительные заголовки для запроса */
  headers?: Record<string, string>;
  /** Таймаут для запроса в миллисекундах */
  timeout?: number;
}

/**
 * Универсальный API хелпер для клиентской стороны
 */
export async function apiRequest<T = any>(
  url: string,
  options: RequestInit = {},
  apiOptions: ApiHandlerOptions = {}
): Promise<T> {
  const {
    showToast = true,
    redirectToLogin = true,
    callbackUrl,
    headers = {},
    timeout = 30000
  } = apiOptions;

  console.log('[UniversalAPI] Making API request to:', url);

  // Создаем AbortController для таймаута
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await handleClientAuth(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...(options.headers || {})
      }
    }, {
      showToast,
      redirectToLogin,
      callbackUrl
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[UniversalAPI] Request successful:', data);
    return data;

  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    
    console.error('[UniversalAPI] Request failed:', error);
    throw error;
  }
}

/**
 * Универсальный API хелпер для серверной стороны
 */
export async function serverApiRequest<T = any>(
  request: NextRequest,
  url: string,
  options: RequestInit = {},
  apiOptions: ApiHandlerOptions = {}
): Promise<T> {
  console.log('[UniversalAPI] Making server-side API request to:', url);

  try {
    const response = await handleServerAuth(request, url, options, apiOptions);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[UniversalAPI] Server request successful:', data);
    return data;

  } catch (error: any) {
    console.error('[UniversalAPI] Server request failed:', error);
    throw error;
  }
}

/**
 * Универсальный обработчик для API endpoints с автоматической обработкой 401
 */
export function withAuthHandler<T>(
  handler: (request: NextRequest) => Promise<NextResponse<T>>,
  options: {
    showToast?: boolean;
    redirectToLogin?: boolean;
    fallbackResponse?: NextResponse<T>;
  } = {}
) {
  return async (request: NextRequest): Promise<NextResponse<T>> => {
    try {
      return await handler(request);
    } catch (error: any) {
      console.error('[UniversalAPI] Handler error:', error);
      
      // Если это ошибка аутентификации, возвращаем соответствующий ответ
      if (error.message?.includes('Authentication failed') || 
          error.message?.includes('No authentication tokens') ||
          error.message?.includes('backend_auth tokens missing')) {
        
        return createAuthErrorResponse(
          'Требуется аутентификация. Пожалуйста, войдите в систему.',
          '/login'
        );
      }
      
      // Для других ошибок возвращаем fallback или перебрасываем ошибку
      if (options.fallbackResponse) {
        return options.fallbackResponse;
      }
      
      throw error;
    }
  };
}

/**
 * Создает универсальный API endpoint с автоматической обработкой 401
 */
export function createAuthEndpoint<T>(
  handler: (request: NextRequest) => Promise<NextResponse<T>>,
  options: {
    showToast?: boolean;
    redirectToLogin?: boolean;
    fallbackResponse?: NextResponse<T>;
  } = {}
) {
  return withAuthHandler(handler, options);
}

/**
 * Универсальный хелпер для обработки ошибок в API responses
 */
export function handleApiError(error: any, context: string = 'API request'): NextResponse {
  console.error(`[UniversalAPI] ${context} error:`, error);
  
  // Если это ошибка аутентификации
  if (error.message?.includes('Authentication failed') || 
      error.message?.includes('No authentication tokens') ||
      error.message?.includes('backend_auth tokens missing')) {
    
    return createAuthErrorResponse(
      'Требуется аутентификация. Пожалуйста, войдите в систему.',
      '/login'
    );
  }
  
  // Для других ошибок возвращаем общий ответ
  return NextResponse.json(
    {
      success: false,
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred'
    },
    { status: 500 }
  );
}

/**
 * Проверяет, является ли ошибка связанной с аутентификацией
 */
export function isAuthError(error: any): boolean {
  return error.message?.includes('Authentication failed') || 
         error.message?.includes('No authentication tokens') ||
         error.message?.includes('backend_auth tokens missing') ||
         error.message?.includes('NOT_AUTHENTICATED');
}

/**
 * Универсальный хелпер для создания успешного API ответа
 */
export function createSuccessResponse<T>(data: T, message?: string): NextResponse<T> {
  return NextResponse.json({
    success: true,
    data,
    message: message || 'Operation completed successfully'
  } as any);
}

/**
 * Универсальный хелпер для создания ошибки API ответа
 */
export function createErrorResponse(message: string, status: number = 400, details?: any): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      details
    },
    { status }
  );
}
