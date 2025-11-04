"use client";

import { useNotification } from "@/contexts/NotificationContext";

/**
 * Типы ошибок для уведомлений
 */
export enum ErrorType {
  NETWORK = "network",
  VALIDATION = "validation",
  AUTHENTICATION = "authentication",
  AUTHORIZATION = "authorization",
  SERVER = "server",
  UNKNOWN = "unknown"
}

/**
 * Интерфейс для обработки ошибок
 */
export interface ErrorHandlerOptions {
  showNotification?: boolean;
  type?: ErrorType;
  prefix?: string;
}

/**
 * Хук для обработки ошибок и отображения уведомлений
 */
export function useErrorHandler() {
  const { setNotification } = useNotification();

  /**
   * Обрабатывает ошибку и отображает уведомление
   * @param error Ошибка для обработки
   * @param options Опции обработки ошибки
   */
  const handleError = (error: unknown, options: ErrorHandlerOptions = {}) => {
    const { showNotification = true, type = ErrorType.UNKNOWN, prefix = "" } = options;
    
    // Определяем сообщение об ошибке
    let errorMessage = "Произошла неизвестная ошибка";
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    } else if (error instanceof Response) {
      errorMessage = `Ошибка сервера: ${error.status} ${error.statusText}`;
    } else if (error && typeof error === "object" && "message" in error) {
      errorMessage = String((error as { message: unknown }).message);
    }
    
    // Добавляем префикс, если он указан
    if (prefix) {
      errorMessage = `${prefix}: ${errorMessage}`;
    }
    
    // Логируем ошибку
    console.error(`[${type.toUpperCase()}]`, errorMessage, error);
    
    // Отображаем уведомление, если нужно
    if (showNotification) {
      setNotification(errorMessage, "error");
    }
    
    return { type, message: errorMessage, originalError: error };
  };
  
  /**
   * Отображает уведомление об успешном выполнении операции
   * @param message Сообщение для отображения
   */
  const showSuccess = (message: string) => {
    setNotification(message, "success");

    // Для уведомлений об успешной отправке файлов - автоматически скрываем через 2 секунды
    if (message.includes('Файлы успешно отправлены')) {
      setTimeout(() => {
        // Используем toast для более надежного отображения кратковременных уведомлений
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('clear-file-upload-notification'));
        }
      }, 2000);
    }
  };
  
  /**
   * Отображает информационное уведомление
   * @param message Сообщение для отображения
   */
  const showInfo = (message: string) => {
    setNotification(message, "info");
  };
  
  /**
   * Отображает предупреждающее уведомление
   * @param message Сообщение для отображения
   */
  const showWarning = (message: string) => {
    setNotification(message, "warning");
  };
  
  return {
    handleError,
    showSuccess,
    showInfo,
    showWarning
  };
}

/**
 * Функция для резюмирования ошибок
 * Группирует похожие ошибки и возвращает обобщенное сообщение
 * @param errors Массив ошибок для резюмирования
 */
export function summarizeErrors(errors: string[]): string {
  if (errors.length === 0) {
    return "";
  }
  
  if (errors.length === 1) {
    return errors[0];
  }
  
  // Группируем похожие ошибки
  const errorCounts: Record<string, number> = {};
  
  errors.forEach(error => {
    if (errorCounts[error]) {
      errorCounts[error]++;
    } else {
      errorCounts[error] = 1;
    }
  });
  
  // Формируем резюме
  const summary = Object.entries(errorCounts)
    .map(([error, count]) => count > 1 ? `${error} (${count})` : error)
    .join("; ");
  
  return summary;
}
