/**
 * Универсальная утилита для обработки ошибок API
 * Централизует логику обработки разных типов ошибок и показа Toast уведомлений
 */

import { toast } from '@/hooks/use-toast';

export interface ErrorHandlerOptions {
  /** Показывать ли Toast уведомление */
  showToast?: boolean;
  /** Кастомный заголовок для Toast */
  customTitle?: string;
  /** Кастомное описание для Toast */
  customDescription?: string;
  /** Длительность показа Toast в миллисекундах */
  duration?: number;
  /** Функция обратного вызова при ошибке авторизации */
  onAuthError?: () => void;
  /** Функция обратного вызова при ошибке доступа */
  onForbiddenError?: () => void;
  /** Функция обратного вызова при ошибке "не найдено" */
  onNotFoundError?: () => void;
  /** Функция обратного вызова при ошибке сервера */
  onServerError?: () => void;
}

export interface ParsedError {
  type: 'auth' | 'forbidden' | 'notFound' | 'validation' | 'server' | 'unknown';
  title: string;
  description: string;
  statusCode?: number;
  originalMessage: string;
}

/**
 * Парсит сообщение об ошибке и определяет её тип
 */
export function parseError(error: Error | string): ParsedError {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  // Определяем тип ошибки по содержимому сообщения
  if (errorMessage.includes('🔒') || errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
    return {
      type: 'auth',
      title: '🔒 Требуется авторизация',
      description: errorMessage.includes('🔒') ? errorMessage : 'Необходимо войти в систему для выполнения этого действия',
      statusCode: 401,
      originalMessage: errorMessage
    };
  }
  
  if (errorMessage.includes('🚫') || errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
    return {
      type: 'forbidden',
      title: '🚫 Доступ запрещен',
      description: errorMessage.includes('🚫') ? errorMessage : 'У вас нет прав для выполнения этого действия',
      statusCode: 403,
      originalMessage: errorMessage
    };
  }
  
  if (errorMessage.includes('❓') || errorMessage.includes('404') || errorMessage.includes('не найдено') || errorMessage.includes('not found')) {
    return {
      type: 'notFound',
      title: '❓ Не найдено',
      description: errorMessage.includes('❓') ? errorMessage : 'Запрашиваемый ресурс не найден',
      statusCode: 404,
      originalMessage: errorMessage
    };
  }
  
  if (errorMessage.includes('📝') || errorMessage.includes('400') || errorMessage.includes('валидации') || errorMessage.includes('validation')) {
    return {
      type: 'validation',
      title: '📝 Ошибка валидации',
      description: errorMessage.includes('📝') ? errorMessage : 'Проверьте правильность заполнения полей',
      statusCode: 400,
      originalMessage: errorMessage
    };
  }
  
  if (errorMessage.includes('🔧') || errorMessage.includes('500') || errorMessage.includes('сервера') || errorMessage.includes('server')) {
    return {
      type: 'server',
      title: '🔧 Ошибка сервера',
      description: errorMessage.includes('🔧') ? errorMessage : 'Временные проблемы на сервере. Попробуйте позже',
      statusCode: 500,
      originalMessage: errorMessage
    };
  }
  
  return {
    type: 'unknown',
    title: '❌ Ошибка',
    description: errorMessage || 'Произошла неизвестная ошибка',
    originalMessage: errorMessage
  };
}

/**
 * Обрабатывает ошибку и показывает соответствующее уведомление
 */
export function handleApiError(error: Error | string, options: ErrorHandlerOptions = {}): ParsedError {
  const {
    showToast = true,
    customTitle,
    customDescription,
    duration,
    onAuthError,
    onForbiddenError,
    onNotFoundError,
    onServerError
  } = options;
  
  const parsedError = parseError(error);
  
  // Показываем Toast уведомление, если требуется
  if (showToast) {
    const toastDuration = duration || getDefaultDuration(parsedError.type);
    
    toast({
      title: customTitle || parsedError.title,
      description: customDescription || parsedError.description,
      variant: 'destructive',
      duration: toastDuration,
    });
  }
  
  // Вызываем соответствующие колбэки
  switch (parsedError.type) {
    case 'auth':
      onAuthError?.();
      break;
    case 'forbidden':
      onForbiddenError?.();
      break;
    case 'notFound':
      onNotFoundError?.();
      break;
    case 'server':
      onServerError?.();
      break;
  }
  
  return parsedError;
}

/**
 * Возвращает длительность показа Toast по умолчанию для разных типов ошибок
 */
function getDefaultDuration(errorType: ParsedError['type']): number {
  switch (errorType) {
    case 'auth':
      return 5000; // 5 секунд
    case 'forbidden':
      return 6000; // 6 секунд
    case 'notFound':
      return 5000; // 5 секунд
    case 'validation':
      return 6000; // 6 секунд
    case 'server':
      return 7000; // 7 секунд
    case 'unknown':
    default:
      return 5000; // 5 секунд
  }
}

/**
 * Специализированные обработчики для разных контекстов
 */
export const errorHandlers = {
  /**
   * Обработчик ошибок для операций с объявлениями
   */
  carAds: {
    create: (error: Error | string, onAuthRedirect?: () => void) => 
      handleApiError(error, {
        onAuthError: onAuthRedirect,
        onForbiddenError: () => {
          // Дополнительная логика для ошибок лимита объявлений
          console.log('[ErrorHandler] Car ad creation forbidden - possibly hit limit');
        }
      }),
    
    update: (error: Error | string, onAuthRedirect?: () => void, onNotFoundRedirect?: () => void) =>
      handleApiError(error, {
        onAuthError: onAuthRedirect,
        onNotFoundError: onNotFoundRedirect
      }),
    
    delete: (error: Error | string, onAuthRedirect?: () => void, onNotFoundRedirect?: () => void) =>
      handleApiError(error, {
        onAuthError: onAuthRedirect,
        onNotFoundError: onNotFoundRedirect
      }),
    
    load: (error: Error | string) =>
      handleApiError(error, {
        duration: 5000
      })
  },
  
  /**
   * Обработчик ошибок для операций аутентификации
   */
  auth: {
    login: (error: Error | string) =>
      handleApiError(error, {
        customTitle: '🔐 Ошибка входа',
        duration: 6000
      }),
    
    register: (error: Error | string) =>
      handleApiError(error, {
        customTitle: '📝 Ошибка регистрации',
        duration: 6000
      })
  },
  
  /**
   * Обработчик ошибок для операций с изображениями
   */
  images: {
    upload: (error: Error | string) =>
      handleApiError(error, {
        customTitle: '📷 Ошибка загрузки изображения',
        duration: 5000
      }),
    
    delete: (error: Error | string) =>
      handleApiError(error, {
        customTitle: '🗑️ Ошибка удаления изображения',
        duration: 4000
      })
  }
};

/**
 * Хелпер для создания кастомного обработчика ошибок
 */
export function createErrorHandler(defaultOptions: ErrorHandlerOptions) {
  return (error: Error | string, overrideOptions?: ErrorHandlerOptions) => {
    const mergedOptions = { ...defaultOptions, ...overrideOptions };
    return handleApiError(error, mergedOptions);
  };
}
