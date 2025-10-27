"use client";

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useI18n } from '@/contexts/I18nContext';

interface AlertDialogState {
  isOpen: boolean;
  title: string;
  description: string;
  type: 'alert' | 'confirm';
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

let setGlobalAlertState: React.Dispatch<React.SetStateAction<AlertDialogState>> | null = null;
let getTranslation: ((key: string, fallback?: string) => string) | null = null;

/**
 * Глобальный провайдер для React Alert Dialog (shadcn)
 * Заменяет нативные window.alert и window.confirm
 * Поддерживает интернационализацию
 */
export const AlertDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useI18n();
  
  const [state, setState] = React.useState<AlertDialogState>({
    isOpen: false,
    title: '',
    description: '',
    type: 'alert',
    confirmText: t('common.ok') || 'OK',
    cancelText: t('common.cancel') || 'Скасувати',
  });

  React.useEffect(() => {
    setGlobalAlertState = setState;
    getTranslation = t;
    return () => {
      setGlobalAlertState = null;
      getTranslation = null;
    };
  }, [t]);

  const handleClose = () => {
    setState(prev => ({ ...prev, isOpen: false }));
    if (state.type === 'confirm' && state.onCancel) {
      state.onCancel();
    }
  };

  const handleConfirm = () => {
    setState(prev => ({ ...prev, isOpen: false }));
    if (state.onConfirm) {
      state.onConfirm();
    }
  };

  return (
    <>
      {children}
      <AlertDialog open={state.isOpen} onOpenChange={handleClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{state.title}</AlertDialogTitle>
            {state.description && (
              <AlertDialogDescription className="whitespace-pre-line">
                {state.description}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            {state.type === 'confirm' && (
              <AlertDialogCancel onClick={handleClose}>
                {state.cancelText}
              </AlertDialogCancel>
            )}
            <AlertDialogAction onClick={handleConfirm}>
              {state.confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

/**
 * React замена для window.alert (shadcn AlertDialog)
 * @param message - Сообщение для отображения
 * @param title - Заголовок (опционально, использует перевод по умолчанию)
 */
export const showAlert = (message: string, title?: string) => {
  if (!setGlobalAlertState) {
    console.warn('[AlertDialog] Provider not mounted, falling back to window.alert');
    alert(message);
    return;
  }

  const t = getTranslation || ((key: string, fallback?: string) => fallback || key);
  
  setGlobalAlertState({
    isOpen: true,
    title: title || t('common.notification', 'Повідомлення'),
    description: message,
    type: 'alert',
    confirmText: t('common.ok', 'OK'),
  });
};

/**
 * React замена для window.confirm (shadcn AlertDialog)
 * @param message - Сообщение для подтверждения
 * @param title - Заголовок (опционально, использует перевод)
 * @param confirmText - Текст кнопки подтверждения (опционально)
 * @param cancelText - Текст кнопки отмены (опционально)
 * @returns Promise<boolean> - true если подтверждено, false если отменено
 */
export const showConfirm = (
  message: string,
  title?: string,
  confirmText?: string,
  cancelText?: string
): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!setGlobalAlertState) {
      console.warn('[AlertDialog] Provider not mounted, falling back to window.confirm');
      resolve(confirm(message));
      return;
    }

    const t = getTranslation || ((key: string, fallback?: string) => fallback || key);

    setGlobalAlertState({
      isOpen: true,
      title: title || t('common.confirmAction', 'Підтвердження дії'),
      description: message,
      type: 'confirm',
      confirmText: confirmText || t('common.ok', 'OK'),
      cancelText: cancelText || t('common.cancel', 'Скасувати'),
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
};

/**
 * Хелперы для часто используемых сценариев (с переводами)
 */
export const alertHelpers = {
  success: (message: string, title?: string) => {
    const t = getTranslation || ((key: string, fallback?: string) => fallback || key);
    return showAlert(message, title || `✅ ${t('common.success', 'Успіх')}`);
  },
  
  error: (message: string, title?: string) => {
    const t = getTranslation || ((key: string, fallback?: string) => fallback || key);
    return showAlert(message, title || `❌ ${t('common.error', 'Помилка')}`);
  },
  
  warning: (message: string, title?: string) => {
    const t = getTranslation || ((key: string, fallback?: string) => fallback || key);
    return showAlert(message, title || `⚠️ ${t('common.warning', 'Увага')}`);
  },
  
  info: (message: string, title?: string) => {
    const t = getTranslation || ((key: string, fallback?: string) => fallback || key);
    return showAlert(message, title || `ℹ️ ${t('common.info', 'Інформація')}`);
  },
  
  confirmDelete: (itemName?: string) => {
    const t = getTranslation || ((key: string, fallback?: string) => fallback || key);
    const item = itemName || t('common.thisItem', 'цей елемент');
    return showConfirm(
      t('common.confirmDeleteMessage', `Ви впевнені, що хочете видалити ${item}? Цю дію неможливо скасувати.`),
      `🗑️ ${t('common.confirmDelete', 'Підтвердження видалення')}`,
      t('common.delete', 'Видалити'),
      t('common.cancel', 'Скасувати')
    );
  },
  
  confirmAction: (action: string) => {
    const t = getTranslation || ((key: string, fallback?: string) => fallback || key);
    return showConfirm(
      t('common.areYouSure', `Ви впевнені, що хочете ${action}?`),
      t('common.confirmAction', 'Підтвердження дії'),
      t('common.yes', 'Так'),
      t('common.no', 'Ні')
    );
  },
};

