"use client";

import { toast } from "@/hooks/use-toast";
import { unifiedAuthErrorHandler } from "@/utils/auth/unifiedAuthErrorHandler";

/**
 * 🔧 Централизованный универсальный обработчик всех ошибок
 * 
 * Обрабатывает:
 * - HTTP ошибки (400, 401, 403, 404, 500, 502, 503, etc.)
 * - WebSocket ошибки (1000-4999)
 * - Network ошибки (timeout, offline, etc.)
 * 
 * Логика:
 * - 401/4001 → специальная обработка через unifiedAuthErrorHandler
 * - 403 → показать toast с ошибкой доступа
 * - 404 → показать toast "Не найдено"
 * - 500/502/503 → показать toast "Ошибка сервера"
 * - Network errors → показать toast "Проблемы с сетью"
 */

export enum ErrorType {
  UNAUTHORIZED = 'UNAUTHORIZED',           // 401, 4001
  FORBIDDEN = 'FORBIDDEN',                 // 403
  NOT_FOUND = 'NOT_FOUND',                // 404
  BAD_REQUEST = 'BAD_REQUEST',            // 400
  SERVER_ERROR = 'SERVER_ERROR',          // 500, 502, 503
  NETWORK_ERROR = 'NETWORK_ERROR',        // Connection issues
  VALIDATION_ERROR = 'VALIDATION_ERROR',  // 422
  TIMEOUT = 'TIMEOUT',                    // Request timeout
  UNKNOWN = 'UNKNOWN'
}

interface ErrorDetails {
  type: ErrorType;
  code: number;
  message: string;
  details?: any;
  retryable: boolean;
}

interface ErrorHandlerOptions {
  /** Показать ли toast уведомление */
  showToast?: boolean;
  /** Пользовательское сообщение для toast */
  customMessage?: string;
  /** Callback для retry запроса */
  retryCallback?: () => Promise<any>;
  /** Источник ошибки для логирования */
  source?: string;
  /** Текущий путь для redirect */
  currentPath?: string;
  /** Максимальное количество попыток retry */
  maxRetries?: number;
}

interface ErrorHandlerResult {
  /** Успешно ли обработана ошибка */
  handled: boolean;
  /** Результат retry (если был) */
  retryResult?: any;
  /** Нужно ли прервать выполнение */
  shouldAbort: boolean;
}

class UnifiedErrorHandler {
  /**
   * Анализирует HTTP код ошибки и возвращает детали
   */
  private analyzeHttpError(statusCode: number, response?: Response): ErrorDetails {
    switch (true) {
      case statusCode === 401:
        return {
          type: ErrorType.UNAUTHORIZED,
          code: statusCode,
          message: 'Требуется авторизация',
          retryable: true
        };

      case statusCode === 403:
        return {
          type: ErrorType.FORBIDDEN,
          code: statusCode,
          message: 'Доступ запрещен',
          retryable: false
        };

      case statusCode === 404:
        return {
          type: ErrorType.NOT_FOUND,
          code: statusCode,
          message: 'Ресурс не найден',
          retryable: false
        };

      case statusCode === 400:
        return {
          type: ErrorType.BAD_REQUEST,
          code: statusCode,
          message: 'Некорректный запрос',
          retryable: false
        };

      case statusCode === 422:
        return {
          type: ErrorType.VALIDATION_ERROR,
          code: statusCode,
          message: 'Ошибка валидации данных',
          retryable: false
        };

      case statusCode === 408:
        return {
          type: ErrorType.TIMEOUT,
          code: statusCode,
          message: 'Превышено время ожидания',
          retryable: true
        };

      case statusCode >= 500 && statusCode < 600:
        return {
          type: ErrorType.SERVER_ERROR,
          code: statusCode,
          message: this.getServerErrorMessage(statusCode),
          retryable: true
        };

      default:
        return {
          type: ErrorType.UNKNOWN,
          code: statusCode,
          message: `Неизвестная ошибка (${statusCode})`,
          retryable: false
        };
    }
  }

  /**
   * Анализирует WebSocket код закрытия
   */
  private analyzeWebSocketError(closeCode: number, reason?: string): ErrorDetails {
    switch (true) {
      case closeCode === 4001 || closeCode === 1008:
        return {
          type: ErrorType.UNAUTHORIZED,
          code: closeCode,
          message: 'Требуется авторизация WebSocket',
          details: reason,
          retryable: true
        };

      case closeCode === 4003:
        return {
          type: ErrorType.FORBIDDEN,
          code: closeCode,
          message: 'Доступ к WebSocket запрещен',
          details: reason,
          retryable: false
        };

      case closeCode === 1006:
        return {
          type: ErrorType.NETWORK_ERROR,
          code: closeCode,
          message: 'Соединение WebSocket разорвано',
          details: reason,
          retryable: true
        };

      case closeCode >= 1000 && closeCode < 1016:
        return {
          type: ErrorType.UNKNOWN,
          code: closeCode,
          message: `WebSocket закрыт (${closeCode})`,
          details: reason,
          retryable: false
        };

      default:
        return {
          type: ErrorType.UNKNOWN,
          code: closeCode,
          message: `Неизвестная ошибка WebSocket (${closeCode})`,
          details: reason,
          retryable: false
        };
    }
  }

  /**
   * Получает сообщение для ошибки сервера
   */
  private getServerErrorMessage(code: number): string {
    switch (code) {
      case 500:
        return 'Внутренняя ошибка сервера';
      case 502:
        return 'Сервер временно недоступен (Bad Gateway)';
      case 503:
        return 'Сервис временно недоступен';
      case 504:
        return 'Превышено время ожидания сервера';
      default:
        return 'Ошибка сервера';
    }
  }

  /**
   * Показывает toast уведомление об ошибке
   */
  private showErrorToast(error: ErrorDetails, customMessage?: string) {
    const message = customMessage || error.message;
    const variant = error.type === ErrorType.UNAUTHORIZED ? 'destructive' : 
                    error.type === ErrorType.SERVER_ERROR ? 'destructive' :
                    'default';

    const icon = {
      [ErrorType.UNAUTHORIZED]: '🔒',
      [ErrorType.FORBIDDEN]: '⛔',
      [ErrorType.NOT_FOUND]: '🔍',
      [ErrorType.BAD_REQUEST]: '❌',
      [ErrorType.VALIDATION_ERROR]: '⚠️',
      [ErrorType.SERVER_ERROR]: '🔥',
      [ErrorType.NETWORK_ERROR]: '📡',
      [ErrorType.TIMEOUT]: '⏱️',
      [ErrorType.UNKNOWN]: '❓'
    }[error.type] || '⚠️';

    toast({
      title: `${icon} ${this.getErrorTitle(error.type)}`,
      description: message,
      variant,
      duration: error.retryable ? 4000 : 5000,
    });
  }

  /**
   * Получает заголовок для типа ошибки
   */
  private getErrorTitle(type: ErrorType): string {
    switch (type) {
      case ErrorType.UNAUTHORIZED:
        return 'Требуется авторизация';
      case ErrorType.FORBIDDEN:
        return 'Доступ запрещен';
      case ErrorType.NOT_FOUND:
        return 'Не найдено';
      case ErrorType.BAD_REQUEST:
        return 'Некорректный запрос';
      case ErrorType.VALIDATION_ERROR:
        return 'Ошибка валидации';
      case ErrorType.SERVER_ERROR:
        return 'Ошибка сервера';
      case ErrorType.NETWORK_ERROR:
        return 'Проблемы с сетью';
      case ErrorType.TIMEOUT:
        return 'Превышено время ожидания';
      default:
        return 'Ошибка';
    }
  }

  /**
   * Обрабатывает HTTP ошибку
   */
  async handleHttpError(
    response: Response,
    options: ErrorHandlerOptions = {}
  ): Promise<ErrorHandlerResult> {
    const {
      showToast = true,
      customMessage,
      retryCallback,
      source = 'HTTP',
      currentPath,
      maxRetries = 1
    } = options;

    console.log(`[UnifiedErrorHandler] 🔴 Handling HTTP error ${response.status} from: ${source}`);

    const errorDetails = this.analyzeHttpError(response.status, response);

    // Специальная обработка для 401 - используем unifiedAuthErrorHandler
    if (errorDetails.type === ErrorType.UNAUTHORIZED) {
      console.log('[UnifiedErrorHandler] Delegating 401 to unifiedAuthErrorHandler...');
      
      const result = await unifiedAuthErrorHandler.handleAuthError({
        retryRequest: retryCallback,
        source,
        currentPath,
        showToast
      });

      return {
        handled: true,
        retryResult: result.retryResponse,
        shouldAbort: result.shouldRedirect
      };
    }

    // Показываем toast для остальных ошибок
    if (showToast) {
      this.showErrorToast(errorDetails, customMessage);
    }

    // Для retryable ошибок пытаемся повторить запрос
    if (errorDetails.retryable && retryCallback && maxRetries > 0) {
      console.log(`[UnifiedErrorHandler] Error is retryable, attempting retry (${maxRetries} attempts left)...`);
      
      try {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Задержка перед retry
        const retryResult = await retryCallback();
        
        console.log('[UnifiedErrorHandler] Retry successful');
        return {
          handled: true,
          retryResult,
          shouldAbort: false
        };
      } catch (error) {
        console.error('[UnifiedErrorHandler] Retry failed:', error);
        
        if (maxRetries > 1) {
          // Рекурсивно пытаемся еще раз
          return this.handleHttpError(response, {
            ...options,
            maxRetries: maxRetries - 1
          });
        }
      }
    }

    return {
      handled: true,
      shouldAbort: !errorDetails.retryable
    };
  }

  /**
   * Обрабатывает WebSocket ошибку
   */
  async handleWebSocketError(
    closeEvent: CloseEvent,
    options: ErrorHandlerOptions = {}
  ): Promise<ErrorHandlerResult> {
    const {
      showToast = true,
      customMessage,
      source = 'WebSocket',
      currentPath
    } = options;

    console.log(`[UnifiedErrorHandler] 🔴 Handling WebSocket close ${closeEvent.code} from: ${source}`);

    const errorDetails = this.analyzeWebSocketError(closeEvent.code, closeEvent.reason);

    // Специальная обработка для 4001/1008 - используем unifiedAuthErrorHandler
    if (errorDetails.type === ErrorType.UNAUTHORIZED) {
      console.log('[UnifiedErrorHandler] Delegating WebSocket auth error to unifiedAuthErrorHandler...');
      
      const canReconnect = await unifiedAuthErrorHandler.handleWebSocketAuthError({
        source,
        currentPath,
        showToast
      });

      return {
        handled: true,
        shouldAbort: !canReconnect
      };
    }

    // Показываем toast для остальных ошибок
    if (showToast) {
      this.showErrorToast(errorDetails, customMessage);
    }

    return {
      handled: true,
      shouldAbort: !errorDetails.retryable
    };
  }

  /**
   * Обрабатывает сетевую ошибку (timeout, offline, etc.)
   */
  async handleNetworkError(
    error: Error,
    options: ErrorHandlerOptions = {}
  ): Promise<ErrorHandlerResult> {
    const {
      showToast = true,
      customMessage,
      source = 'Network'
    } = options;

    console.log(`[UnifiedErrorHandler] 🔴 Handling network error from: ${source}`, error);

    const errorDetails: ErrorDetails = {
      type: ErrorType.NETWORK_ERROR,
      code: 0,
      message: customMessage || 'Проблемы с подключением к серверу',
      details: error.message,
      retryable: true
    };

    if (showToast) {
      this.showErrorToast(errorDetails);
    }

    return {
      handled: true,
      shouldAbort: false
    };
  }

  /**
   * Универсальный метод обработки любой ошибки
   */
  async handleError(
    error: any,
    options: ErrorHandlerOptions = {}
  ): Promise<ErrorHandlerResult> {
    // Response объект (HTTP ошибка)
    if (error instanceof Response) {
      return this.handleHttpError(error, options);
    }

    // CloseEvent (WebSocket ошибка)
    if (error instanceof CloseEvent) {
      return this.handleWebSocketError(error, options);
    }

    // Error объект (сетевая ошибка, исключение)
    if (error instanceof Error) {
      return this.handleNetworkError(error, options);
    }

    // Объект с полем status (fetch error)
    if (error && typeof error === 'object' && 'status' in error) {
      const mockResponse = new Response(null, { status: error.status });
      return this.handleHttpError(mockResponse, options);
    }

    // Неизвестная ошибка
    console.error('[UnifiedErrorHandler] Unknown error type:', error);
    
    if (options.showToast !== false) {
      toast({
        title: "❌ Произошла ошибка",
        description: "Пожалуйста, попробуйте еще раз",
        variant: "destructive",
      });
    }

    return {
      handled: true,
      shouldAbort: true
    };
  }
}

// Singleton instance
export const unifiedErrorHandler = new UnifiedErrorHandler();

/**
 * Helper функции для быстрого использования
 */

// Для HTTP fetch запросов
export async function handleFetchError(
  response: Response,
  options: Omit<ErrorHandlerOptions, 'retryCallback'> & {
    retryRequest?: () => Promise<Response>
  } = {}
): Promise<Response> {
  const result = await unifiedErrorHandler.handleHttpError(response, {
    ...options,
    retryCallback: options.retryRequest
  });

  if (result.retryResult) {
    return result.retryResult;
  }

  return response;
}

// Для WebSocket
export async function handleWebSocketClose(
  closeEvent: CloseEvent,
  options: ErrorHandlerOptions = {}
): Promise<boolean> {
  const result = await unifiedErrorHandler.handleWebSocketError(closeEvent, options);
  return !result.shouldAbort; // true если можно переподключиться
}

// Для сетевых ошибок
export async function handleNetworkError(
  error: Error,
  options: ErrorHandlerOptions = {}
): Promise<void> {
  await unifiedErrorHandler.handleNetworkError(error, options);
}

