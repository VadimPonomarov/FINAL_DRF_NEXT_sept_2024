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
        if (value !== undefined && value !== null) {
          // Преобразуем параметры для соответствия backend API
          let paramKey = key;
          let paramValue = String(value);

          // Маппинг параметров сортировки
          if (String(key) === 'sort_by') {
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
          if (String(key) === 'brand' && value) {
            paramKey = 'mark';
          }
          if (String(key) === 'mileage_to' && value) {
            paramKey = 'mileage_km_max';
          }
          if (String(key) === 'transmission' && value) {
            paramKey = 'transmission_type';
          }

          // Маппинг фильтра "свои объявления"
          if (String(key) === 'mine' && value === true) {
            // На backend предполагаем параметр created_by=me
            paramKey = 'created_by';
            paramValue = 'me';
          }
          if (String(key) === 'owner_id') {
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

  // Массовое удаление моих объявлений по списку ID (поштучное удаление через рабочий endpoint)
  static async bulkDeleteMyAds(ids: number[]): Promise<{ deleted: number[]; failed: number[] }> {
    if (!Array.isArray(ids) || ids.length === 0) {
      return { deleted: [], failed: [] };
    }

    console.log('[CarAdsService] bulkDeleteMyAds: deleting', ids.length, 'ads');
    
    // Используем поштучное удаление через рабочий endpoint /api/autoria/cars/{id}
    const results = await Promise.allSettled(ids.map(id => this.deleteCarAd(id)));
    const deleted: number[] = [];
    const failed: number[] = [];
    results.forEach((r, idx) => (r.status === 'fulfilled' ? deleted : failed).push(ids[idx]!));
    
    console.log('[CarAdsService] bulkDeleteMyAds result:', { deleted: deleted.length, failed: failed.length });
    return { deleted, failed };
  }

  // Массовое удаление по статусу — загружаем ВСЕ объявления постранично и удаляем
  static async bulkDeleteMyAdsByStatus(status: string): Promise<{ deleted: number; failed: number }> {
    console.log('[CarAdsService] bulkDeleteMyAdsByStatus called with status:', status);
    
    let totalDeleted = 0;
    let totalFailed = 0;
    let page = 1;
    const pageSize = 100; // Размер страницы для загрузки
    let hasMore = true;
    
    // Цикл по всем страницам пока есть объявления
    while (hasMore) {
      const params: { page: number; limit: number; status?: string } = { page, limit: pageSize };
      if (status && status !== 'all') {
        params.status = status;
      }
      
      const pageData = await this.getMyCarAds(params);
      const ads = pageData.results || [];
      console.log(`[CarAdsService] Page ${page}: found ${ads.length} ads to delete`);
      
      if (ads.length === 0) {
        hasMore = false;
        break;
      }
      
      const ids = ads.map(a => a.id as unknown as number);
      const { deleted, failed } = await this.bulkDeleteMyAds(ids);
      totalDeleted += deleted.length;
      totalFailed += failed.length;
      
      console.log(`[CarAdsService] Page ${page} result: deleted=${deleted.length}, failed=${failed.length}`);
      
      // Если удалили меньше чем загрузили или нет следующей страницы - выходим
      // Но так как мы удаляем, нужно продолжать с page=1 пока есть объявления
      // После удаления объявления сдвигаются, поэтому всегда берём первую страницу
      if (!pageData.next && ads.length < pageSize) {
        hasMore = false;
      }
      // Не увеличиваем page, так как после удаления объявления сдвигаются
    }
    
    console.log('[CarAdsService] Total deletion result:', { deleted: totalDeleted, failed: totalFailed });
    return { deleted: totalDeleted, failed: totalFailed };
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

    // Специальный кейс: ошибки авторизации обрабатываются самим fetchWithAuth
    // (ensureValidTokens + redirectToAuth / /login). Здесь не кидаем ошибку,
    // чтобы не показывать пользователю лишний red toast, а просто позволяем
    // глобальному auth-потоку выполнить редирект.
    if (response.status === 401 || response.status === 403) {
      console.warn(
        '[CarAdsService] Moderator status update auth error (',
        response.status,
        ') – relying on global auth flow / redirects and skipping toast error.'
      );
      return;
    }

    if (!response.ok) {
      let errorMessage = 'Failed to update status';
      try {
        const errorData = await response.json();
        // Вытягиваем максимально информативное сообщение из proxy-роута
        errorMessage =
          errorData?.message ||
          errorData?.detail ||
          errorData?.error ||
          errorMessage;
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
          if (String(key) === 'limit') {
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
        if (value !== undefined && value !== null) {
          // Преобразуем limit в page_size для соответствия backend API
          let paramKey = key;
          if (String(key) === 'limit') {
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
