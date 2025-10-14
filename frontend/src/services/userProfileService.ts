/**
 * API сервис для работы с профилем пользователя, аккаунтом и адресами
 * Использует существующий fetchData хелпер с поддержкой Bearer токенов и авторефреша
 */

import { fetchData, fetchWithDomain } from '@/app/api/common';
import {
  BackendUser,
  BackendProfile,
  BackendAccount,
  BackendRawAddress,
  BackendAccountContact,
  ProfileUpdateData,
  AccountUpdateData,
  RawAddressUpdateData,
  ContactUpdateData,
  ProfileApiResponse,
  AccountApiResponse,
  FullUserProfileData,
  AccountTypeEnum,
  ModerationLevelEnum,
  RoleEnum,
  ContactTypeEnum
} from '@/types/backend-user';

/**
 * Сервис для работы с профилем пользователя
 */
export class UserProfileService {
  
  /**
   * Получить данные пользователя с профилем (UserEditSerializer)
   */
  static async getUserProfile(): Promise<ProfileApiResponse | null> {
    try {
      console.log('[UserProfileService] 📤 Fetching user profile...');

      const data = await fetchWithDomain<ProfileApiResponse>('api/user/profile/', {
        domain: 'internal',
        redirectOnError: false
      });

      if (!data) {
        console.log('[UserProfileService] ❌ No profile data received');
        return null;
      }

      console.log('[UserProfileService] ✅ Profile data received successfully');
      return data;
    } catch (error) {
      console.error('[UserProfileService] ❌ Error fetching profile:', error);
      throw error;
    }
  }

  /**
   * Обновить профиль пользователя
   */
  static async updateUserProfile(updateData: { profile: ProfileUpdateData }): Promise<ProfileApiResponse | null> {
    try {
      console.log('==================================================');
      console.log('[UserProfileService] 🚀 updateUserProfile called!');
      console.log('[UserProfileService] 📤 Input data:', JSON.stringify(updateData, null, 2));
      console.log('==================================================');

      // Данные уже правильно структурированы в хуке
      console.log('[UserProfileService] 📋 Final update data:', updateData);

      console.log('[UserProfileService] 🔄 Calling fetchWithDomain...');
      console.log('[UserProfileService] 📤 URL: api/user/profile/');
      console.log('[UserProfileService] 📤 Method: PATCH');
      console.log('[UserProfileService] 📤 Body:', JSON.stringify(updateData, null, 2));

      const data = await fetchWithDomain<ProfileApiResponse>('api/user/profile/', {
        method: 'PATCH',
        body: updateData,
        domain: 'internal',
        redirectOnError: false
      });

      console.log('[UserProfileService] 📥 fetchWithDomain response:', data);

      if (!data) {
        console.log('[UserProfileService] ❌ No response from profile update');
        return null;
      }

      console.log('[UserProfileService] ✅ Profile updated successfully');
      return data;
    } catch (error) {
      console.error('[UserProfileService] ❌ Error updating profile:', error);
      throw error;
    }
  }

  /**
   * Загрузить аватар пользователя
   */
  static async uploadAvatar(avatarFile: File, userId: number): Promise<BackendProfile | null> {
    try {
      console.log('[UserProfileService] 📤 Uploading avatar...');

      const formData = new FormData();
      formData.append('avatar', avatarFile);

      const data = await fetchWithDomain<BackendProfile>('api/user/profile/avatar', {
        method: 'PATCH',
        body: formData,
        domain: 'internal',
        headers: {}, // Для FormData не устанавливаем Content-Type
        redirectOnError: false
      });

      if (!data) {
        console.log('[UserProfileService] ❌ No response from avatar upload');
        return null;
      }

      console.log('[UserProfileService] ✅ Avatar uploaded successfully');
      return data;
    } catch (error) {
      console.error('[UserProfileService] ❌ Error uploading avatar:', error);
      throw error;
    }
  }
}

/**
 * Сервис для работы с аккаунтом пользователя
 */
export class UserAccountService {
  
  /**
   * Получить аккаунт пользователя
   */
  static async getUserAccount(): Promise<AccountApiResponse | null> {
    try {
      console.log('[UserAccountService] 📤 Fetching user account...');

      const data = await fetchWithDomain<AccountApiResponse>('api/user/account/', {
        domain: 'internal',
        redirectOnError: false
      });

      // Возвращаем аккаунт пользователя
      const account = data;

      if (!account) {
        console.log('[UserAccountService] ❌ No account data received');
        return null;
      }

      console.log('[UserAccountService] ✅ Account data received successfully');
      return account;
    } catch (error) {
      console.error('[UserAccountService] ❌ Error fetching account:', error);
      throw error;
    }
  }

  /**
   * Создать или обновить аккаунт пользователя
   */
  static async updateUserAccount(accountData: AccountUpdateData): Promise<AccountApiResponse | null> {
    try {
      console.log('[UserAccountService] 📤 Updating user account...', accountData);

      const data = await fetchWithDomain<AccountApiResponse>('api/user/account/', {
        method: 'POST', // AddsAccountSerializer использует POST для create_or_update
        body: accountData,
        domain: 'internal',
        redirectOnError: false
      });

      if (!data) {
        console.log('[UserAccountService] ❌ No response from account update');
        return null;
      }

      console.log('[UserAccountService] ✅ Account updated successfully');
      return data;
    } catch (error) {
      console.error('[UserAccountService] ❌ Error updating account:', error);
      throw error;
    }
  }
}

/**
 * Сервис для работы с контактами аккаунта
 */
export class UserContactService {

  /**
   * Получить все контакты аккаунта
   */
  static async getAccountContacts(): Promise<BackendAccountContact[]> {
    try {
      console.log('[UserContactService] 📤 Fetching account contacts...');

      const data = await fetchWithDomain<any[]>('api/accounts/contacts/', {
        domain: 'internal',
        redirectOnError: false
      });

      if (!data) {
        console.log('[UserContactService] ❌ No contacts data received');
        return [];
      }

      // Normalize backend shape (type/value/adds_account) -> frontend shape (contact_type/contact_value/account)
      const normalized: BackendAccountContact[] = (Array.isArray(data) ? data : []).map((item: any) => ({
        id: item.id,
        account: item.adds_account ?? item.account ?? null,
        contact_type: item.type ?? item.contact_type,
        contact_value: item.value ?? item.contact_value,
        // Backend has is_visible/note; approximate mapping for UI expectations
        is_primary: item.is_primary ?? (typeof item.is_visible === 'boolean' ? item.is_visible : false),
        is_verified: item.is_verified ?? false,
        created_at: item.created_at,
        updated_at: item.updated_at
      }));

      console.log('[UserContactService] ✅ Contacts data normalized:', normalized.length);
      return normalized;
    } catch (error) {
      console.error('[UserContactService] ❌ Error fetching contacts:', error);
      return [];
    }
  }

  /**
   * Создать новый контакт
   */
  static async createContact(contactData: ContactUpdateData): Promise<BackendAccountContact | null> {
    try {
      console.log('[UserContactService] 📤 Creating contact...', contactData);

      // ✅ ИСПРАВЛЕНИЕ: Получаем аккаунт и добавляем его ID
      const account = await UserAccountService.getUserAccount();
      console.log('[UserContactService] 🏢 User account:', account);

      if (!account) {
        throw new Error('User account not found. Please create account first.');
      }

      // Преобразуем в формат backend: { type, value, is_visible, note, account }
      const backendPayload: any = {
        type: contactData.contact_type,
        value: contactData.contact_value,
        is_visible: contactData.is_primary ?? true,
        note: undefined,
        account: account.id,
      };

      console.log('[UserContactService] 📤 Sending contact data (backend shape):', backendPayload);

      const data = await fetchWithDomain<any>('api/accounts/contacts/', {
        method: 'POST',
        body: backendPayload,
        domain: 'internal',
        redirectOnError: false
      });

      // Нормализуем ответ в frontend-формат
      const normalized: BackendAccountContact | null = data
        ? {
            id: data.id,
            account: data.adds_account ?? data.account ?? account.id,
            contact_type: data.type ?? data.contact_type,
            contact_value: data.value ?? data.contact_value,
            is_primary: data.is_primary ?? (typeof data.is_visible === 'boolean' ? data.is_visible : false),
            is_verified: data.is_verified ?? false,
            created_at: data.created_at,
            updated_at: data.updated_at,
          }
        : null;

      if (!normalized) {
        console.log('[UserContactService] ❌ No response from contact creation');
        return null;
      }

      console.log('[UserContactService] ✅ Contact created successfully:', normalized);
      return normalized;
    } catch (error) {
      console.error('[UserContactService] ❌ Error creating contact:', error);

      // Добавляем более подробную информацию об ошибке
      if (error instanceof Error) {
        console.error('[UserContactService] ❌ Error details:', {
          message: error.message,
          stack: error.stack
        });
      }

      throw error;
    }
  }

  /**
   * Обновить контакт
   */
  static async updateContact(contactId: number, contactData: Partial<ContactUpdateData>): Promise<BackendAccountContact | null> {
    try {
      console.log('[UserContactService] 📤 Updating contact...', { contactId, contactData });

      const data = await fetchWithDomain<BackendAccountContact>(`api/accounts/contacts/${contactId}`, {
        method: 'PATCH',
        body: contactData,
        domain: 'internal',
        redirectOnError: false
      });

      if (!data) {
        console.log('[UserContactService] ❌ No response from contact update');
        return null;
      }

      console.log('[UserContactService] ✅ Contact updated successfully');
      return data;
    } catch (error) {
      console.error('[UserContactService] ❌ Error updating contact:', error);
      throw error;
    }
  }

  /**
   * Удалить контакт
   */
  static async deleteContact(contactId: number): Promise<boolean> {
    try {
      console.log('[UserContactService] 📤 Deleting contact...', contactId);

      await fetchWithDomain(`api/accounts/contacts/${contactId}`, {
        method: 'DELETE',
        domain: 'internal',
        redirectOnError: false
      });

      console.log('[UserContactService] ✅ Contact deleted successfully');
      return true;
    } catch (error) {
      console.error('[UserContactService] ❌ Error deleting contact:', error);
      throw error;
    }
  }
}

/**
 * Сервис для работы с адресами пользователя
 */
export class UserAddressService {
  
  /**
   * Получить все адреса пользователя
   */
  static async getUserAddresses(): Promise<BackendRawAddress[]> {
    try {
      console.log('[UserAddressService] 📤 Fetching user addresses...');

      const data = await fetchWithDomain<BackendRawAddress[]>('api/user/addresses/', {
        domain: 'internal',
        redirectOnError: false
      });

      if (!data) {
        console.log('[UserAddressService] ℹ️ No addresses found, returning empty array');
        return [];
      }

      console.log(`[UserAddressService] ✅ Success: ${Array.isArray(data) ? data.length : 0} addresses found`);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('[UserAddressService] ❌ Error fetching addresses:', error);
      return [];
    }
  }

  /**
   * Создать новый адрес
   */
  static async createAddress(addressData: RawAddressUpdateData): Promise<BackendRawAddress | null> {
    try {
      console.log('[UserAddressService] 📤 Creating new address...', addressData);

      // Use Next.js API route instead of direct backend call
      const response = await fetch('/api/accounts/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(addressData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data) {
        console.log('[UserAddressService] ❌ No response from address creation');
        return null;
      }

      console.log('[UserAddressService] ✅ Address created successfully');
      return data;
    } catch (error) {
      console.error('[UserAddressService] ❌ Error creating address:', error);
      throw error;
    }
  }

  /**
   * Обновить существующий адрес
   */
  static async updateAddress(addressId: number, addressData: RawAddressUpdateData): Promise<BackendRawAddress | null> {
    try {
      console.log('[UserAddressService] 📤 Updating address...', addressId, addressData);

      // Use Next.js API route instead of direct backend call
      const response = await fetch(`/api/accounts/addresses/${addressId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(addressData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data) {
        console.log('[UserAddressService] ❌ No response from address update');
        return null;
      }

      console.log('[UserAddressService] ✅ Address updated successfully');
      return data;
    } catch (error) {
      console.error('[UserAddressService] ❌ Error updating address:', error);
      throw error;
    }
  }

  /**
   * Удалить адрес
   */
  static async deleteAddress(addressId: number): Promise<boolean> {
    try {
      console.log('[UserAddressService] 📤 Deleting address...', addressId);

      // Use Next.js API route instead of direct backend call
      const response = await fetch(`/api/accounts/addresses/${addressId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('[UserAddressService] ✅ Address deleted successfully');
      return true;
    } catch (error) {
      console.error('[UserAddressService] ❌ Error deleting address:', error);
      return false;
    }
  }
}

/**
 * Объединенный сервис для получения всех данных пользователя
 */
export class FullUserDataService {
  
  /**
   * Получить все данные пользователя (профиль + аккаунт + адреса + контакты)
   */
  static async getFullUserData(): Promise<FullUserProfileData | null> {
    try {
      console.log('[FullUserDataService] 📤 Fetching full user data...');

      // Параллельно загружаем все данные
      const [profileResponse, accountResponse, addressResponse, contactResponse] = await Promise.allSettled([
        UserProfileService.getUserProfile(),
        UserAccountService.getUserAccount(),
        UserAddressService.getUserAddresses(),
        UserContactService.getAccountContacts()
      ]);

      // Обрабатываем результаты
      const profile = profileResponse.status === 'fulfilled' ? profileResponse.value : null;
      const account = accountResponse.status === 'fulfilled' ? accountResponse.value : null;
      const addressList = addressResponse.status === 'fulfilled' ? addressResponse.value : [];
      const contactList = contactResponse.status === 'fulfilled' ? contactResponse.value : [];

      if (!profile) {
        console.log('[FullUserDataService] ❌ Failed to load user profile');
        return null;
      }
      
      // Получаем данные пользователя из localStorage для is_staff и is_superuser
      let userFlags = { is_staff: false, is_superuser: false, is_active: true };
      try {
        if (typeof window !== 'undefined') {
          const storedAuth = localStorage.getItem('backend_auth');
          if (storedAuth) {
            const authData = JSON.parse(storedAuth);
            if (authData?.user) {
              userFlags = {
                is_staff: authData.user.is_staff || false,
                is_superuser: authData.user.is_superuser || false,
                is_active: authData.user.is_active !== undefined ? authData.user.is_active : true
              };
              console.log('[FullUserDataService] 🔑 User flags from localStorage:', userFlags);
            }
          }
        }
      } catch (error) {
        console.error('[FullUserDataService] ❌ Error getting user flags:', error);
      }

      // Формируем объединенные данные
      const fullData: FullUserProfileData = {
        user: {
          id: profile.profile?.user || 0,
          email: profile.email,
          is_active: userFlags.is_active,
          is_staff: userFlags.is_staff,
          is_superuser: userFlags.is_superuser,
          profile: profile.profile,
          created_at: profile.profile?.created_at || '',
          updated_at: profile.profile?.updated_at || ''
        },
        account: account,
        addresses: addressList,
        contacts: contactList
      };

      console.log('[FullUserDataService] ✅ Full user data loaded successfully:', {
        profile: !!profile,
        account: !!account,
        addressCount: addressList?.length || 0,
        contactCount: contactList?.length || 0
      });
      return fullData;
    } catch (error) {
      console.error('[FullUserDataService] ❌ Error loading full user data:', error);
      return null;
    }
  }
}
