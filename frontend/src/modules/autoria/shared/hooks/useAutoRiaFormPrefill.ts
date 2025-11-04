import { useCallback, useEffect } from 'react';
import { useUserProfile } from './useUserProfile';
import { CarAdFormData } from '@/modules/autoria/shared/types/autoria';

interface AutoFillData {
  // Контактная информация
  seller_name?: string;
  seller_phone?: string;
  seller_phone_secondary?: string;
  seller_telegram?: string;
  seller_viber?: string;
  seller_whatsapp?: string;
  
  // Адресная информация
  region?: string;
  city?: string;
  
  // Дополнительная информация
  seller_email?: string;
}

export const useAutoRiaFormPrefill = () => {
  const { 
    profile, 
    contacts, 
    addresses, 
    loading, 
    error,
    getPrimaryContact,
    getPrimaryAddress,
    getFullName,
    isAuthenticated 
  } = useUserProfile();

  /**
   * Получает данные для автозаполнения формы
   */
  const getAutoFillData = useCallback((): AutoFillData => {
    if (!isAuthenticated || !profile) {
      console.log('[AutoRiaFormPrefill] 🔒 User not authenticated or no profile');
      return {};
    }

    const primaryContact = getPrimaryContact();
    const primaryAddress = getPrimaryAddress();
    const fullName = getFullName();

    const autoFillData: AutoFillData = {};

    // Заполняем контактную информацию
    if (fullName) {
      autoFillData.seller_name = fullName;
      console.log('[AutoRiaFormPrefill] ✅ Added seller name:', fullName);
    }

    if (profile.email) {
      autoFillData.seller_email = profile.email;
      console.log('[AutoRiaFormPrefill] ✅ Added seller email:', profile.email);
    }

    if (primaryContact) {
      if (primaryContact.phone) {
        autoFillData.seller_phone = primaryContact.phone;
        console.log('[AutoRiaFormPrefill] ✅ Added primary phone:', primaryContact.phone);
      }
      
      if (primaryContact.phone_secondary) {
        autoFillData.seller_phone_secondary = primaryContact.phone_secondary;
        console.log('[AutoRiaFormPrefill] ✅ Added secondary phone');
      }
      
      if (primaryContact.telegram) {
        autoFillData.seller_telegram = primaryContact.telegram;
        console.log('[AutoRiaFormPrefill] ✅ Added Telegram');
      }
      
      if (primaryContact.viber) {
        autoFillData.seller_viber = primaryContact.viber;
        console.log('[AutoRiaFormPrefill] ✅ Added Viber');
      }
      
      if (primaryContact.whatsapp) {
        autoFillData.seller_whatsapp = primaryContact.whatsapp;
        console.log('[AutoRiaFormPrefill] ✅ Added WhatsApp');
      }
    }

    // Заполняем адресную информацию
    if (primaryAddress) {
      if (primaryAddress.region) {
        autoFillData.region = primaryAddress.region;
        console.log('[AutoRiaFormPrefill] ✅ Added region:', primaryAddress.region);
      }
      
      if (primaryAddress.city) {
        autoFillData.city = primaryAddress.city;
        console.log('[AutoRiaFormPrefill] ✅ Added city:', primaryAddress.city);
      }
    }

    console.log('[AutoRiaFormPrefill] 📋 Auto-fill data prepared:', Object.keys(autoFillData));
    return autoFillData;
  }, [
    isAuthenticated, 
    profile, 
    getPrimaryContact, 
    getPrimaryAddress, 
    getFullName
  ]);

  /**
   * Применяет автозаполнение к данным формы (только по запросу пользователя)
   */
  const applyAutoFill = useCallback((
    currentFormData: Partial<CarAdFormData>,
    options: {
      overwriteExisting?: boolean; // Перезаписывать ли существующие значения
      fieldsToFill?: string[]; // Конкретные поля для заполнения
    } = {}
  ): Partial<CarAdFormData> => {
    const { overwriteExisting = false, fieldsToFill } = options;
    const autoFillData = getAutoFillData();

    if (Object.keys(autoFillData).length === 0) {
      console.log('[AutoRiaFormPrefill] ℹ️ No auto-fill data available');
      return currentFormData;
    }

    // Создаем новый объект с автозаполненными данными
    const updatedFormData: Partial<CarAdFormData> = { ...currentFormData };
    let appliedCount = 0;

    // Применяем автозаполнение
    Object.entries(autoFillData).forEach(([key, value]) => {
      const formKey = key as keyof CarAdFormData;

      // Проверяем, нужно ли заполнять это поле
      if (fieldsToFill && !fieldsToFill.includes(key)) {
        return;
      }

      // Проверяем, можно ли заполнить поле
      const canFill = value && (
        overwriteExisting ||
        !updatedFormData[formKey] ||
        updatedFormData[formKey] === ''
      );

      if (canFill) {
        (updatedFormData as any)[formKey] = value;
        appliedCount++;
        console.log(`[AutoRiaFormPrefill] 🔄 Auto-filled ${key}:`, value);
      }
    });

    if (appliedCount > 0) {
      console.log(`[AutoRiaFormPrefill] ✅ Applied ${appliedCount} auto-fill values`);
    } else {
      console.log('[AutoRiaFormPrefill] ℹ️ No fields were auto-filled');
    }

    return updatedFormData;
  }, [getAutoFillData]);

  /**
   * Проверяет, доступно ли автозаполнение
   */
  const isAutoFillAvailable = useCallback((): boolean => {
    return isAuthenticated && !!profile && Object.keys(getAutoFillData()).length > 0;
  }, [isAuthenticated, profile, getAutoFillData]);

  /**
   * Получает сводку доступных данных для автозаполнения
   */
  const getAutoFillSummary = useCallback(() => {
    const autoFillData = getAutoFillData();

    return {
      available: Object.keys(autoFillData).length > 0,
      fields: Object.keys(autoFillData),
      hasContact: !!getPrimaryContact(),
      hasAddress: !!getPrimaryAddress(),
      hasProfile: !!profile,
      totalFields: Object.keys(autoFillData).length,
    };
  }, [getAutoFillData, getPrimaryContact, getPrimaryAddress, profile]);

  /**
   * Получает placeholder'ы с подсказками на основе данных пользователя
   */
  const getPlaceholders = useCallback(() => {
    if (!isAuthenticated || !profile) {
      return {};
    }

    const autoFillData = getAutoFillData();
    const placeholders: Record<string, string> = {};

    // Создаем placeholder'ы на основе доступных данных
    Object.entries(autoFillData).forEach(([key, value]) => {
      if (value) {
        switch (key) {
          case 'seller_name':
            placeholders[key] = `напр. ${value}`;
            break;
          case 'seller_phone':
            placeholders[key] = `напр. ${value}`;
            break;
          case 'seller_email':
            placeholders[key] = `напр. ${value}`;
            break;
          case 'region':
            placeholders[key] = `напр. ${value}`;
            break;
          case 'city':
            placeholders[key] = `напр. ${value}`;
            break;
          default:
            placeholders[key] = `напр. ${value}`;
        }
      }
    });

    return placeholders;
  }, [isAuthenticated, profile, getAutoFillData]);

  return {
    // Данные
    profile,
    contacts,
    addresses,
    loading,
    error,
    isAuthenticated,

    // Функции автозаполнения
    getAutoFillData,
    applyAutoFill,
    isAutoFillAvailable,
    getAutoFillSummary,
    getPlaceholders,

    // Утилиты
    getPrimaryContact,
    getPrimaryAddress,
    getFullName,
  };
};
