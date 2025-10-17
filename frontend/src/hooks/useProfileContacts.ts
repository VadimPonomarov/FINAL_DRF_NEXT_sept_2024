"use client";

import { useState, useEffect } from 'react';
import { AdContact } from '@/types/autoria';
import { ContactTypeEnum } from '@/types/backend-user';

interface UseProfileContactsReturn {
  contacts: AdContact[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useProfileContacts = (): UseProfileContactsReturn => {
  const [contacts, setContacts] = useState<AdContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[useProfileContacts] 🔄 Fetching real profile contacts...');

      // ✅ ИСПРАВЛЕНИЕ: Используем правильный API маршрут
      console.log('[useProfileContacts] 🔄 Trying user contacts API first...');
      const response = await fetch('/api/user/contacts', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // НЕ используем credentials: 'include', так как мы используем Bearer токены в заголовках
        // credentials: 'include' вызывает CORS ошибку с Access-Control-Allow-Origin: *
        cache: 'no-store'
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('[useProfileContacts] ⚠️ User not authenticated, using empty contacts');
          setContacts([]);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('[useProfileContacts] 📞 Raw profile contacts response:', data);

      // Преобразуем контакты из аккаунта в формат для объявлений
      const profileContacts: AdContact[] = [];

      // Обрабатываем массив контактов из API
      if (Array.isArray(data)) {
        data.forEach((contact: any, index: number) => {
          // Определяем тип контакта на основе данных
          let contactType = ContactTypeEnum.PHONE;
          let contactValue = '';
          let contactNote = '';

          if (contact.phone && contact.phone.trim()) {
            contactType = ContactTypeEnum.PHONE;
            contactValue = contact.phone.trim();
            contactNote = contact.first_name && contact.last_name
              ? `${contact.first_name} ${contact.last_name}`.trim()
              : contact.first_name || 'Телефон';
          } else if (contact.email && contact.email.trim()) {
            contactType = ContactTypeEnum.EMAIL;
            contactValue = contact.email.trim();
            contactNote = contact.first_name && contact.last_name
              ? `${contact.first_name} ${contact.last_name}`.trim()
              : contact.first_name || 'Email';
          }

          if (contactValue) {
            profileContacts.push({
              type: contactType,
              value: contactValue,
              is_visible: true,
              is_primary: contact.is_primary === true || index === 0, // Первый контакт или помеченный как основной
              note: contactNote
            });
          }
        });
      } else if (data && typeof data === 'object') {
        // Если данные пришли как объект, а не массив
        if (data.phone && data.phone.trim()) {
          profileContacts.push({
            type: ContactTypeEnum.PHONE,
            value: data.phone.trim(),
            is_visible: true,
            is_primary: true,
            note: data.first_name && data.last_name
              ? `${data.first_name} ${data.last_name}`.trim()
              : data.first_name || 'Основной телефон'
          });
        }

        if (data.email && data.email.trim()) {
          profileContacts.push({
            type: ContactTypeEnum.EMAIL,
            value: data.email.trim(),
            is_visible: true,
            is_primary: profileContacts.length === 0, // Основной если это единственный контакт
            note: data.first_name && data.last_name
              ? `${data.first_name} ${data.last_name}`.trim()
              : data.first_name || 'Email из профиля'
          });
        }
      }

      console.log('[useProfileContacts] ✅ Processed profile contacts:', profileContacts);
      setContacts(profileContacts);

    } catch (err) {
      console.error('[useProfileContacts] ❌ Error fetching profile contacts:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');

      // Fallback к пустому массиву вместо демо-данных
      console.log('[useProfileContacts] 🔄 Using empty contacts as fallback');
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  return {
    contacts,
    loading,
    error,
    refetch: fetchContacts
  };
};
