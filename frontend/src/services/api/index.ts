/**
 * Универсальные API хелперы с автоматическим управлением токенами
 */

import { apiClient } from './apiClient';

// Интерфейсы для типизации
interface User {
  id: number;
  email: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  profile?: {
    id: number;
    name: string;
    surname: string;
    age: number;
    avatar: string | null;
  };
}

interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
  message?: string;
}

// Хелперы для аутентификации
export const authApi = {
  /**
   * Вход в систему
   */
  login: async (credentials: { email: string; password: string }): Promise<ApiResponse<AuthResponse>> => {
    try {
      const data = await apiClient.auth<AuthResponse>(credentials);
      return {
        data,
        status: 200,
        message: 'Authentication successful'
      };
    } catch (error) {
      return {
        status: 500,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  },

  /**
   * Обновление токенов
   */
  refresh: async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.ok;
    } catch (error) {
      console.error('[authApi] Refresh error:', error);
      return false;
    }
  },

  /**
   * Выход из системы
   */
  logout: async (): Promise<boolean> => {
    try {
      await apiClient.post('/api/auth/logout');
      
      // Очищаем токены в Redis
      await fetch('/api/redis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'backend_auth',
          value: JSON.stringify({
            access: '',
            refresh: '',
            refreshAttempts: 0
          })
        })
      });
      
      return true;
    } catch (error) {
      console.error('[authApi] Logout error:', error);
      return false;
    }
  }
};

// Хелперы для работы с пользователями
export const usersApi = {
  /**
   * Получить список пользователей
   */
  getUsers: async (params?: { limit?: number; offset?: number }): Promise<ApiResponse<User[]>> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());
      
      const endpoint = `/api/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const data = await apiClient.get<User[]>(endpoint);
      
      return {
        data,
        status: 200
      };
    } catch (error) {
      return {
        status: 500,
        error: error instanceof Error ? error.message : 'Failed to fetch users'
      };
    }
  },

  /**
   * Получить профиль текущего пользователя
   */
  getProfile: async (): Promise<ApiResponse<User>> => {
    try {
      const data = await apiClient.get<User>('/api/users/profile');
      return {
        data,
        status: 200
      };
    } catch (error) {
      return {
        status: 500,
        error: error instanceof Error ? error.message : 'Failed to fetch profile'
      };
    }
  },

  /**
   * Обновить профиль пользователя
   */
  updateProfile: async (profileData: Partial<User>): Promise<ApiResponse<User>> => {
    try {
      const data = await apiClient.put<User>('/api/users/profile', profileData);
      return {
        data,
        status: 200
      };
    } catch (error) {
      return {
        status: 500,
        error: error instanceof Error ? error.message : 'Failed to update profile'
      };
    }
  }
};

// Хелперы для работы с объявлениями
export const adsApi = {
  /**
   * Получить список объявлений
   */
  getAds: async (params?: { limit?: number; offset?: number; search?: string }): Promise<ApiResponse<any[]>> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());
      if (params?.search) queryParams.append('search', params.search);
      
      const endpoint = `/api/ads${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const data = await apiClient.get<any[]>(endpoint);
      
      return {
        data,
        status: 200
      };
    } catch (error) {
      return {
        status: 500,
        error: error instanceof Error ? error.message : 'Failed to fetch ads'
      };
    }
  },

  /**
   * Создать новое объявление
   */
  createAd: async (adData: any): Promise<ApiResponse<any>> => {
    try {
      const data = await apiClient.post<any>('/api/ads', adData);
      return {
        data,
        status: 201
      };
    } catch (error) {
      return {
        status: 500,
        error: error instanceof Error ? error.message : 'Failed to create ad'
      };
    }
  }
};

// Универсальный хелпер для любых запросов
export const api = {
  /**
   * Выполнить GET запрос
   */
  get: <T>(endpoint: string): Promise<T> => apiClient.get<T>(endpoint),

  /**
   * Выполнить POST запрос
   */
  post: <T>(endpoint: string, body?: unknown): Promise<T> => apiClient.post<T>(endpoint, body),

  /**
   * Выполнить PUT запрос
   */
  put: <T>(endpoint: string, body?: unknown): Promise<T> => apiClient.put<T>(endpoint, body),

  /**
   * Выполнить DELETE запрос
   */
  delete: <T>(endpoint: string): Promise<T> => apiClient.delete<T>(endpoint)
};

// Экспортируем все API
export { apiClient };
export { apiClient as centralizedApiClient } from './client';
export default {
  auth: authApi,
  users: usersApi,
  ads: adsApi,
  api
};
