import { useState, useEffect, useCallback } from 'react';
import { fetchData } from '@/app/api/(helpers)/common';

// Интерфейсы для данных пользователя
export interface UserProfile {
  id: number;
  email: string;
  profile?: {
    id: number;
    name: string;
    surname: string;
    age: number | null;
    avatar: string | null;
  };
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
}

export interface UserContact {
  id: number;
  phone: string;
  phone_secondary?: string;
  telegram?: string;
  viber?: string;
  whatsapp?: string;
  is_primary: boolean;
}

export interface UserAddress {
  id: number;
  region: string;
  city: string;
  street?: string;
  house_number?: string;
  apartment?: string;
  postal_code?: string;
  is_primary: boolean;
}

export interface UserData {
  profile: UserProfile | null;
  contacts: UserContact[];
  addresses: UserAddress[];
  loading: boolean;
  error: string | null;
}

export const useUserProfile = () => {
  const [userData, setUserData] = useState<UserData>({
    profile: null,
    contacts: [],
    addresses: [],
    loading: false,
    error: null,
  });

  // Функция для получения данных пользователя с использованием общих хелперов
  const fetchUserData = useCallback(async () => {
    setUserData(prev => ({ ...prev, loading: true, error: null }));

    try {
      console.log('[useUserProfile] 📤 Fetching user data using common helpers...');

      // Получаем профиль пользователя через общий fetchData
      const profileData = await fetchData<UserProfile>('api/user/profile/', {
        redirectOnError: false
      });

      // Получаем контакты пользователя
      const contactsData = await fetchData<UserContact[]>('api/user/contacts/', {
        redirectOnError: false
      });

      // Получаем адреса пользователя
      const addressesData = await fetchData<UserAddress[]>('api/user/addresses/', {
        redirectOnError: false
      });

      console.log('[useUserProfile] ✅ All user data received');

      setUserData({
        profile: profileData,
        contacts: Array.isArray(contactsData) ? contactsData : [],
        addresses: Array.isArray(addressesData) ? addressesData : [],
        loading: false,
        error: null,
      });

    } catch (error) {
      console.error('[useUserProfile] ❌ Error fetching user data:', error);
      setUserData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, []);

  // Автоматически загружаем данные при монтировании компонента
  // ВРЕМЕННО ОТКЛЮЧЕНО для избежания CORS ошибок
  // useEffect(() => {
  //   fetchUserData();
  // }, [fetchUserData]);

  // Функция для обновления данных
  const refreshUserData = useCallback(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Функция для получения основного контакта
  const getPrimaryContact = useCallback(() => {
    return userData.contacts.find(contact => contact.is_primary) || userData.contacts[0] || null;
  }, [userData.contacts]);

  // Функция для получения основного адреса
  const getPrimaryAddress = useCallback(() => {
    return userData.addresses.find(address => address.is_primary) || userData.addresses[0] || null;
  }, [userData.addresses]);

  // Функция для получения полного имени
  const getFullName = useCallback(() => {
    if (!userData.profile?.profile) return '';
    const { name, surname } = userData.profile.profile;
    return [name, surname].filter(Boolean).join(' ');
  }, [userData.profile]);

  return {
    ...userData,
    refreshUserData,
    getPrimaryContact,
    getPrimaryAddress,
    getFullName,
    isAuthenticated: !!userData.profile,
  };
};
