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
} from '@/modules/autoria/shared/types/autoria';
import { fetchWithAuth } from '@/modules/autoria/shared/utils/fetchWithAuth';

export class CarAdsService {
  // Получение списка объявлений с пагинацией и фильтрами
  static async getCarAds(
    params?: CarSearchFormData & {
      page?: number;
      page_size?: number;
      ordering?: string;
      status?: string;
      mine?: boolean; // показывать только свои объявления (без принудительного статуса)
      owner_id?: number | 'me';
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

          // Маппинг фильтра "свои объявления"
          if (key === 'mine' && value === true) {
            // На backend предполагаем параметр created_by=me
            paramKey = 'created_by';
            paramValue = 'me';
          }
          if (key === 'owner_id') {
            paramKey = 'created_by';
          }

          // Примечание: маппинг параметров цены, года и пробега уже происходит в SearchPage.tsx
          // Здесь мы просто передаем параметры как есть

          queryParams.append(paramKey, paramValue);
        }
      });
    }

    // По умолчанию в публичном поиске показываем только видимые объявления
    // Если явно не указали статус и не включили режим просмотра своих объявлений, фильтруем по active
    const isOwnQuery = queryParams.get('created_by') === 'me' || queryParams.has('created_by');
    if (!queryParams.has('status') && !isOwnQuery) {
      queryParams.append('status', 'active');
    }

    // Используем API route для получения объявлений (с авторизацией)
    const endpoint = `/api/autoria/cars${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    console.log('[CarAdsService] Fetching cars:', endpoint);

    const response = await fetchWithAuth(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
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

    const response = await fetchWithAuth(`/api/autoria/cars/${id}`, {
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

    const response = await fetchWithAuth(deleteUrl, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CarAdsService] Delete error:', response.status, errorText);
      throw new Error(`Failed to delete car ad: ${response.statusText}`);
    }

    console.log('[CarAdsService] Successfully deleted car ad');
  }

  // Массовое удаление моих объявлений по списку ID (с фолбэком на поштучное удаление)
  static async bulkDeleteMyAds(ids: number[]): Promise<{ deleted: number[]; failed: number[] }> {
    if (!Array.isArray(ids) || ids.length === 0) {
      return { deleted: [], failed: [] };
    }

    try {
      const url = `/api/ads/bulk-delete`;
      const response = await fetchWithAuth(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return {
          deleted: data?.deleted_ids || ids,
          failed: data?.failed_ids || []
        };
      }
      // если бэкенд не поддерживает bulk — падаем в фолбэк
      console.warn('[CarAdsService] bulk endpoint not available, falling back to per-item deletes');
    } catch (e) {
      console.warn('[CarAdsService] bulk delete failed, fallback to per-item:', e);
    }

    const results = await Promise.allSettled(ids.map(id => this.deleteCarAd(id)));
    const deleted: number[] = [];
    const failed: number[] = [];
    results.forEach((r, idx) => (r.status === 'fulfilled' ? deleted : failed).push(ids[idx]));
    return { deleted, failed };
  }

  // Массовое удаление по статусу (если нет endpoint — выбираем мои объявления со статусом и удаляем)
  static async bulkDeleteMyAdsByStatus(status: string): Promise<{ deleted: number; failed: number }> {
    try {
      const url = `/api/ads/bulk-delete?status=${encodeURIComponent(status)}`;
      const response = await fetchWithAuth(url, { method: 'POST' });
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return {
          deleted: Number(data?.deleted || 0),
          failed: Number(data?.failed || 0)
        };
      }
      console.warn('[CarAdsService] bulk-by-status endpoint not available, falling back to client bulk');
    } catch (e) {
      console.warn('[CarAdsService] bulk-by-status failed, fallback to client bulk:', e);
    }

    // Фолбэк: загрузить мои объявления с этим статусом и удалить по одному
    const pageData = await this.getMyCarAds({ page: 1, limit: 1000, status });
    const ids = (pageData.results || []).map(a => a.id as unknown as number);
    const { deleted, failed } = await this.bulkDeleteMyAds(ids);
    return { deleted: deleted.length, failed: failed.length };
  }

  // Обновление статуса объявления владельцем (owner endpoint принимает только статус)
  static async updateMyAdStatus(id: number, status: string): Promise<CarAd> {
    console.log('[CarAdsService] Updating my ad status:', { id, status });

    // Используем owner endpoint через бэкенд API роут
    const url = `/api/autoria/cars/${id}/status`;
    const response = await fetchWithAuth(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      let errorMessage = `Failed to update status: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.error || errorMessage;
      } catch (e) {
        // If we can't parse the error as JSON, use the status text
        console.error('Error parsing error response:', e);
      }
      console.error('[CarAdsService] Update status error:', response.status, errorMessage);
      throw new Error(errorMessage);
    }

    try {
      return await response.json();
    } catch (e) {
      console.error('Error parsing response:', e);
      return { id, status } as CarAd; // Return minimal response if parsing fails
    }
  }

  // Обновление статуса объявления модератором (admin endpoint для модераторов)
  static async updateAdStatusAsModerator(
    adId: number,
    status: string,
    moderationReason?: string,
    notifyUser: boolean = true
  ): Promise<void> {
    console.log('[CarAdsService] Updating ad status as moderator:', { adId, status });

    const response = await fetchWithAuth(`/api/ads/moderation/${adId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status,
        moderation_reason: moderationReason ?? '',
        notify_user: notifyUser,
      }),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to update status';
      try {
        const errorData = await response.json();
        errorMessage = errorData?.error || errorData?.message || errorMessage;
      } catch (error) {
        console.warn('[CarAdsService] Unable to parse moderator status error response');
      }
      console.error('[CarAdsService] Moderator status update error:', response.status, errorMessage);
      throw new Error(errorMessage);
    }
  }

  // Сохранение заметок модератора
  static async saveModerationNotes(adId: number, notes: string): Promise<void> {
    if (!notes?.trim()) {
      throw new Error('Notes cannot be empty');
    }

    const response = await fetchWithAuth(`/api/ads/moderation/${adId}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notes }),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to save moderation notes';
      try {
        const errorData = await response.json();
        errorMessage = errorData?.error || errorData?.message || errorMessage;
      } catch (error) {
        console.warn('[CarAdsService] Unable to parse moderation notes error response');
      }
      console.error('[CarAdsService] Moderation notes error:', response.status, errorMessage);
      throw new Error(errorMessage);
    }
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

    const response = await fetchWithAuth(endpoint, {
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

    const response = await fetchWithAuth(endpoint, {
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
