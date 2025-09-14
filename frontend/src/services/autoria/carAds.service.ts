/**
 * Сервис для работы с объявлениями автомобилей
 * Типизированные методы для всех операций CRUD
 */

// Используем внутренний API proxy вместо прямых запросов к DRF
// В браузере используем относительный URL, в Node.js (API routes) - полный URL
const API_BASE = typeof window !== 'undefined'
  ? '/api/autoria'
  : 'http://localhost:3000/api/autoria';
import {
  CarAd,
  CarAdFormData,
  CarSearchFormData,
  CarAdAnalytics,
  PaginatedResponse,
  ApiResponse,
  ModerationResult,
  AccountLimits
} from '@/types/autoria';

export class CarAdsService {
  // Получение списка объявлений с пагинацией и фильтрами
  static async getCarAds(
    params?: CarSearchFormData & {
      page?: number;
      page_size?: number;
      ordering?: string;
    }
  ): Promise<PaginatedResponse<CarAd>> {
    const queryParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          // Преобразуем параметры для соответствия backend API
          let paramKey = key;
          let paramValue = String(value);

          // Маппинг параметров сортировки
          if (key === 'sort_by') {
            paramKey = 'ordering';
            // Преобразуем frontend сортировку в backend формат
            switch (value) {
              case 'price_asc':
                paramValue = 'price';
                break;
              case 'price_desc':
                paramValue = '-price';
                break;
              case 'year_desc':
                paramValue = '-year';
                break;
              case 'year_asc':
                paramValue = 'year';
                break;
              case 'mileage_asc':
                paramValue = 'mileage_km';
                break;
              case 'mileage_desc':
                paramValue = '-mileage_km';
                break;
              case 'created_desc':
                paramValue = '-created_at';
                break;
              case 'created_asc':
                paramValue = 'created_at';
                break;
              default:
                paramValue = '-created_at';
            }
          }

          // Маппинг других параметров
          if (key === 'brand' && value) {
            paramKey = 'mark';
          }
          if (key === 'mileage_to' && value) {
            paramKey = 'mileage_km_max';
          }
          if (key === 'transmission' && value) {
            paramKey = 'transmission_type';
          }

          // Примечание: маппинг параметров цены, года и пробега уже происходит в SearchPage.tsx
          // Здесь мы просто передаем параметры как есть

          queryParams.append(paramKey, paramValue);
        }
      });
    }

    // Используем API route для получения объявлений (с авторизацией)
    const endpoint = `/api/autoria/cars${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    console.log('[CarAdsService] Fetching cars:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include' // Включаем cookies для авторизации
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CarAdsService] API Error:', response.status, errorText);
      throw new Error(`Failed to fetch car ads: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[CarAdsService] Success:', data.count || 0, 'cars found');

    return data;
  }

  // Получение конкретного объявления
  static async getCarAd(id: number): Promise<CarAd> {
    console.log('[CarAdsService] Fetching car ad:', id);

    const response = await fetch(`/api/autoria/cars/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CarAdsService] Get car ad error:', response.status, errorText);
      throw new Error(`Failed to fetch car ad: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[CarAdsService] Successfully fetched car ad:', data.id);
    return data;
  }

  // Добавление в избранное
  static async addToFavorites(carId: number): Promise<void> {
    console.log('[CarAdsService] Adding to favorites:', carId);

    const response = await fetch(`/api/autoria/cars/${carId}/favorite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CarAdsService] Add to favorites error:', response.status, errorText);
      throw new Error(`Failed to add to favorites: ${response.statusText}`);
    }

    console.log('[CarAdsService] Successfully added to favorites');
  }

  // Удаление из избранного
  static async removeFromFavorites(carId: number): Promise<void> {
    console.log('[CarAdsService] Removing from favorites:', carId);

    const response = await fetch(`/api/autoria/cars/${carId}/favorite`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CarAdsService] Remove from favorites error:', response.status, errorText);
      throw new Error(`Failed to remove from favorites: ${response.statusText}`);
    }

    console.log('[CarAdsService] Successfully removed from favorites');
  }

  // Обновление объявления
  static async updateCarAd(id: number, data: Partial<CarAdFormData>): Promise<CarAd> {
    console.log('[CarAdsService] 🔄 Updating car ad:', id);
    console.log('[CarAdsService] 📤 Request data keys:', Object.keys(data));

    // Используем правильный API route для обновления
    const updateUrl = `/api/autoria/cars/${id}/update`;
    console.log('[CarAdsService] 📤 Request URL:', updateUrl);

    const requestBody = JSON.stringify(data);
    console.log('[CarAdsService] 📤 Request body size:', requestBody.length, 'chars');

    const response = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: requestBody
    });

    console.log('[CarAdsService] 📡 Response status:', response.status);
    console.log('[CarAdsService] 📡 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CarAdsService] ❌ Update error:', response.status, errorText);
      console.error('[CarAdsService] ❌ Failed request data sample:', {
        id,
        dataKeys: Object.keys(data),
        url: `/api/autoria/cars/${id}`
      });
      throw new Error(`Failed to update car ad: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('[CarAdsService] ✅ Successfully updated car ad:', result.id);
    console.log('[CarAdsService] ✅ Response data keys:', Object.keys(result));
    return result;
  }

  // Удаление объявления
  static async deleteCarAd(id: number): Promise<void> {
    console.log('[CarAdsService] Deleting car ad:', id);

    // Используем универсальный API route
    const deleteUrl = `/api/autoria/cars/${id}`;
    console.log('[CarAdsService] 📤 Delete URL:', deleteUrl);

    const response = await fetch(deleteUrl, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CarAdsService] Delete error:', response.status, errorText);
      throw new Error(`Failed to delete car ad: ${response.statusText}`);
    }

    console.log('[CarAdsService] Successfully deleted car ad');
  }

  // Создание нового объявления
  static async createCarAd(data: CarAdFormData): Promise<CarAd> {
    console.log('[CarAdsService] 🔄 Creating new car ad');
    console.log('[CarAdsService] 📤 Request data keys:', Object.keys(data));

    // Используем универсальный API route
    const createUrl = '/api/autoria/cars';
    console.log('[CarAdsService] 📤 Create URL:', createUrl);

    const response = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    console.log('[CarAdsService] 📡 Create response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CarAdsService] ❌ Create error:', response.status, errorText);
      throw new Error(`Failed to create car ad: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    const created = (result && (result.data || result));
    console.log('[CarAdsService] ✅ Successfully created car ad:', created?.id || created?.data?.id);
    return created;
  }





  // Получение объявлений пользователя
  static async getMyCarAds(
    params?: { page?: number; limit?: number; status?: string; ordering?: string; search?: string }
  ): Promise<PaginatedResponse<CarAd>> {
    const queryParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          // Маппинг параметров для соответствия backend API
          let paramKey = key;
          let paramValue = String(value);

          // Преобразуем limit в page_size для соответствия backend API
          if (key === 'limit') {
            paramKey = 'page_size';
          }

          queryParams.append(paramKey, paramValue);
        }
      });
    }

    // Используем правильный API endpoint через proxy
    const endpoint = `/api/ads/my-ads${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    console.log('[CarAdsService] Fetching my ads:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch my car ads: ${response.statusText}`);
    }

    return response.json();
  }

  // Тестирование модерации объявления
  static async testModeration(data: {
    title: string;
    description: string;
    price?: number;
  }): Promise<ModerationResult> {
    const response = await fetch(`${API_BASE}/test-moderation/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Failed to test moderation: ${response.statusText}`);
    }

    return response.json();
  }

  // Получение аналитики объявления (только для Premium)
  static async getCarAdAnalytics(id: number): Promise<CarAdAnalytics> {
    const response = await fetch(`${API_BASE}/${id}/analytics/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get car ad analytics: ${response.statusText}`);
    }

    return response.json();
  }

  // Добавление в избранное
  static async addToFavorites(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/favorites/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to add to favorites: ${response.statusText}`);
    }
  }

  // Удаление из избранного
  static async removeFromFavorites(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/favorites/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to remove from favorites: ${response.statusText}`);
    }
  }

  // Получение избранных объявлений
  static async getFavoriteAds(
    params?: { page?: number; limit?: number }
  ): Promise<PaginatedResponse<CarAd>> {
    const queryParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          // Преобразуем limit в page_size для соответствия backend API
          let paramKey = key;
          if (key === 'limit') {
            paramKey = 'page_size';
          }
          queryParams.append(paramKey, String(value));
        }
      });
    }

    const endpoint = `${API_BASE}/favorites${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    console.log('[CarAdsService] Fetching favorites:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch favorites: ${response.statusText}`);
    }

    return response.json();
  }

  // Проверка лимитов аккаунта
  static async checkAccountLimits(token: string): Promise<AccountLimits> {
    return api.get<AccountLimits>(`/api/accounts/limits/`, token);
  }

  // Активация/деактивация объявления
  static async toggleAdStatus(id: number, active: boolean, token: string): Promise<CarAd> {
    return api.patch<CarAd>(`${this.BASE_PATH}/${id}/`, { is_active: active }, token);
  }

  // Продление объявления (обновление даты)
  static async renewAd(id: number, token: string): Promise<CarAd> {
    return api.post<CarAd>(`${this.BASE_PATH}/${id}/renew/`, {}, token);
  }

  // Получение похожих объявлений
  static async getSimilarAds(id: number, limit: number = 5): Promise<CarAd[]> {
    return api.get<CarAd[]>(`${this.BASE_PATH}/${id}/similar/?limit=${limit}`);
  }

  // Получение статистики просмотров
  static async getViewStats(id: number, token: string): Promise<{
    total_views: number;
    today_views: number;
    week_views: number;
    month_views: number;
  }> {
    return api.get(`${this.BASE_PATH}/${id}/views/`, token);
  }

  // Отправка сообщения продавцу
  static async sendMessage(adId: number, message: string, token: string): Promise<void> {
    return api.post<void>(`${this.BASE_PATH}/${adId}/message/`, { message }, token);
  }

  // Жалоба на объявление
  static async reportAd(id: number, reason: string, description?: string, token?: string): Promise<void> {
    return api.post<void>(`${this.BASE_PATH}/${id}/report/`, {
      reason,
      description
    }, token);
  }

  // Получение истории изменений объявления
  static async getAdHistory(id: number, token: string): Promise<Array<{
    id: number;
    field: string;
    old_value: any;
    new_value: any;
    changed_at: string;
    changed_by: string;
  }>> {
    return api.get(`${this.BASE_PATH}/${id}/history/`, token);
  }

  // Клонирование объявления
  static async cloneAd(id: number, token: string): Promise<CarAd> {
    return api.post<CarAd>(`${this.BASE_PATH}/${id}/clone/`, {}, token);
  }

  // Экспорт объявления в различные форматы
  static async exportAd(id: number, format: 'pdf' | 'json' | 'xml', token: string): Promise<Blob> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${this.BASE_PATH}/${id}/export/?format=${format}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }

  // Получение QR кода для объявления
  static async getAdQRCode(id: number): Promise<string> {
    const response = await api.get<{ qr_code: string }>(`${this.BASE_PATH}/${id}/qr-code/`);
    return response.qr_code;
  }

  // Получение ссылки для социальных сетей
  static async getShareUrl(id: number, platform: 'facebook' | 'telegram' | 'viber' | 'whatsapp'): Promise<string> {
    const response = await api.get<{ share_url: string }>(`${this.BASE_PATH}/${id}/share/?platform=${platform}`);
    return response.share_url;
  }

  // Переключение статуса избранного
  static async toggleFavorite(carAdId: number): Promise<{ is_favorite: boolean; message: string }> {
    console.log('[CarAdsService] Toggling favorite for car ad:', carAdId);

    const response = await fetch('/api/autoria/favorites/toggle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ car_ad_id: carAdId })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CarAdsService] Toggle favorite error:', response.status, errorText);
      throw new Error(`Failed to toggle favorite: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[CarAdsService] Successfully toggled favorite:', {
      car_ad_id: carAdId,
      is_favorite: data.is_favorite
    });

    return data;
  }

  // Добавить в избранное
  static async addToFavorites(carAdId: number): Promise<{ is_favorite: boolean; message: string }> {
    console.log('[CarAdsService] Adding to favorites:', carAdId);
    return this.toggleFavorite(carAdId);
  }

  // Удалить из избранного
  static async removeFromFavorites(carAdId: number): Promise<{ is_favorite: boolean; message: string }> {
    console.log('[CarAdsService] Removing from favorites:', carAdId);
    return this.toggleFavorite(carAdId);
  }
}

// Экспорт сервиса
export default CarAdsService;
