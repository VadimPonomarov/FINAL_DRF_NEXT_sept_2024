/**
 * Account Service - управление аккаунтами пользователей
 */
import { getAuthorizationHeaders } from '@/common/constants/headers';

export interface AccountUpdateData {
  account_type: 'BASIC' | 'PREMIUM';
  reason?: string;
  notify_user?: boolean;
}

export class AccountService {
  private static readonly BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  /**
   * Обновляет тип аккаунта пользователя до PREMIUM для тестовых целей
   */
  static async upgradeToPremium(accountId: number): Promise<any> {
    console.log(`🔄 Upgrading account ${accountId} to PREMIUM...`);

    try {
      const headers = await getAuthorizationHeaders();

      const updateData = {
        account_type: 'PREMIUM'
      };

      const response = await fetch(`${this.BASE_URL}/api/accounts/admin/${accountId}/type/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(updateData),
        cache: 'no-store'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Failed to upgrade account ${accountId}:`, errorText);
        throw new Error(`Failed to upgrade account: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ Account ${accountId} upgraded to PREMIUM:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Error upgrading account ${accountId}:`, error);
      throw error;
    }
  }

  /**
   * Получает информацию об аккаунте
   */
  static async getAccountInfo(accountId: number): Promise<any> {
    try {
      const headers = await getAuthorizationHeaders();

      const response = await fetch(`${this.BASE_URL}/api/accounts/${accountId}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`Failed to get account info: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ Error getting account ${accountId} info:`, error);
      throw error;
    }
  }

  /**
   * Получает информацию о пользователе по ID
   */
  static async getUserById(userId: number): Promise<any> {
    try {
      const headers = await getAuthorizationHeaders();

      const response = await fetch(`${this.BASE_URL}/api/users/admin/${userId}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`Failed to get user info: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ Error getting user ${userId} info:`, error);
      throw error;
    }
  }

  /**
   * Получает информацию о пользователе по email
   */
  static async getUserByEmail(email: string): Promise<any> {
    try {
      console.log('🔑 Getting authorization headers...');
      const headers = await getAuthorizationHeaders();
      console.log('🔑 Headers received:', Object.keys(headers));

      // Используем правильный admin endpoint для поиска пользователей
      const url = `${this.BASE_URL}/api/users/admin/list/?email=${encodeURIComponent(email)}`;
      console.log('🌐 Making request to:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        cache: 'no-store'
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP error:', response.status, errorText);
        if (response.status === 404) {
          throw new Error(`User with email ${email} not found`);
        }
        if (response.status === 403) {
          throw new Error(`Access denied. Admin rights required to search users`);
        }
        throw new Error(`Failed to get user by email: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('📋 API Response structure:', {
        hasResults: !!result.results,
        isArray: Array.isArray(result),
        resultCount: result.results?.length || 0,
        keys: Object.keys(result)
      });

      // Если результат - массив, берем первый элемент
      const user = Array.isArray(result.results) ? result.results[0] :
                   Array.isArray(result) ? result[0] : result;

      if (!user) {
        throw new Error(`User with email ${email} not found`);
      }

      console.log('✅ Found user:', { id: user.id, email: user.email });
      return user;
    } catch (error) {
      console.error(`❌ Error getting user by email ${email}:`, error);
      throw error;
    }
  }

  /**
   * Получает информацию о пользователе по ID
   */
  static async getUserById(userId: number): Promise<any> {
    try {
      console.log('🔑 Getting authorization headers...');
      const headers = await getAuthorizationHeaders();

      const url = `${this.BASE_URL}/api/users/admin/${userId}/`;
      console.log('🌐 Making request to:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        cache: 'no-store'
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP error:', response.status, errorText);
        if (response.status === 404) {
          throw new Error(`User with ID ${userId} not found`);
        }
        if (response.status === 403) {
          throw new Error(`Access denied. Admin rights required to get user details`);
        }
        throw new Error(`Failed to get user by ID: ${response.statusText} - ${errorText}`);
      }

      const user = await response.json();
      console.log('✅ Found user:', { id: user.id, email: user.email });
      return user;
    } catch (error) {
      console.error(`❌ Error getting user by ID ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Получает аккаунт пользователя по user ID
   */
  static async getAccountByUserId(userId: number): Promise<any> {
    try {
      const headers = await getAuthorizationHeaders();

      const response = await fetch(`${this.BASE_URL}/api/accounts/?user=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Account for user ${userId} not found`);
        }
        throw new Error(`Failed to get account by user ID: ${response.statusText}`);
      }

      const result = await response.json();
      // Если результат - массив, берем первый элемент
      const account = Array.isArray(result.results) ? result.results[0] :
                     Array.isArray(result) ? result[0] : result;

      if (!account) {
        throw new Error(`Account for user ${userId} not found`);
      }

      return account;
    } catch (error) {
      console.error(`❌ Error getting account by user ID ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Изменяет тип аккаунта (BASIC/PREMIUM) используя специальный admin endpoint
   */
  static async changeAccountType(accountId: number, accountType: 'BASIC' | 'PREMIUM', reason?: string): Promise<any> {
    console.log(`🔄 Changing account ${accountId} type to ${accountType}...`);

    try {
      const headers = await getAuthorizationHeaders();
      console.log('🔑 Headers:', headers);

      const updateData = {
        account_type: accountType
      };

      const url = `${this.BASE_URL}/api/accounts/admin/${accountId}/type/`;
      console.log('🌐 Request URL:', url);
      console.log('📦 Request data:', updateData);

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(updateData),
        cache: 'no-store'
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Failed to change account ${accountId} type:`, errorText);

        // Более детальная обработка ошибок
        if (response.status === 404) {
          throw new Error(`Account with ID ${accountId} not found`);
        } else if (response.status === 403) {
          throw new Error('Access denied. Only superusers can change account types.');
        } else if (response.status === 401) {
          throw new Error('Authentication required. Please log in.');
        } else {
          throw new Error(`Failed to change account type: ${response.status} ${response.statusText}. ${errorText}`);
        }
      }

      const result = await response.json();
      console.log(`✅ Account ${accountId} type changed to ${accountType}:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Error changing account ${accountId} type:`, error);

      // Проверяем, является ли это сетевой ошибкой
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to the server. Please check your connection.');
      }

      throw error;
    }
  }
}
