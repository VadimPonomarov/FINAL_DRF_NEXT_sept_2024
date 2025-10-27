/**
 * Хелпер для отображения toast-уведомлений с поддержкой переводов
 */

import { toast } from '@/hooks/use-toast';

/**
 * Интерфейс для опций toast
 */
export interface ToastOptions {
  title?: string;
  description: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

/**
 * Показывает успешное уведомление
 */
export function showSuccess(message: string, title?: string) {
  toast({
    variant: 'default',
    title: title || '✅ Успешно',
    description: message,
    duration: 3000,
  });
}

/**
 * Показывает уведомление об ошибке
 */
export function showError(message: string, title?: string) {
  toast({
    variant: 'destructive',
    title: title || '❌ Ошибка',
    description: message,
    duration: 4000,
  });
}

/**
 * Показывает предупреждение
 */
export function showWarning(message: string, title?: string) {
  toast({
    variant: 'default',
    title: title || '⚠️ Внимание',
    description: message,
    duration: 3500,
  });
}

/**
 * Показывает информационное уведомление
 */
export function showInfo(message: string, title?: string) {
  toast({
    variant: 'default',
    title: title || 'ℹ️ Информация',
    description: message,
    duration: 3000,
  });
}

/**
 * Показывает уведомление с пользовательскими параметрами
 */
export function showToast(options: ToastOptions) {
  toast({
    variant: options.variant || 'default',
    title: options.title,
    description: options.description,
    duration: options.duration || 3000,
  });
}

