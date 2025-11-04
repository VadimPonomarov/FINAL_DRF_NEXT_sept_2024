/**
 * Сервис для работы с избранными объявлениями
 * Использует параметр favorites_only для фильтрации через основной API автомобилей
 */

import { CarAd, CarSearchFormData, PaginatedResponse } from '@/modules/autoria/shared/types/autoria';
import { fetchWithAuth } from '@/modules/autoria/shared/utils/fetchWithAuth';

export class FavoritesService {

  /**
   * Получить список избранных объявлений с фильтрацией
   * Использует основной API автомобилей с параметром favorites_only=true
   */
  static async getFavorites(
    filters?: CarSearchFormData & {
      page?: number;
      page_size?: number;
      ordering?: string;
    }
  ): Promise<PaginatedResponse<CarAd>> {
    console.log('[FavoritesService] Getting favorites with filters:', filters);

    // Формируем параметры запроса
    const params = new URLSearchParams();

    // Добавляем фильтр избранного
    params.append('favorites_only', 'true');

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && value !== '__all__') {
          params.append(key, String(value));
        }
      });
    }

    // Используем основной API автомобилей с фильтром избранного
    const response = await fetchWithAuth(`/api/autoria/cars?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[FavoritesService] Get favorites error:', response.status, errorText);
      throw new Error(`Failed to fetch favorites: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[FavoritesService] Successfully fetched favorites:', {
      count: data.count || data.results?.length || 0
    });

    return data;
  }

  /**
   * Добавить/удалить объявление из избранного
   */
  static async toggleFavorite(carAdId: number): Promise<{ is_favorite: boolean; message: string; favorites_count?: number; car_ad_id?: number }> {
    console.log('[FavoritesService] Toggling favorite for car ad:', carAdId);

    const response = await fetchWithAuth('/api/autoria/favorites/toggle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ car_ad_id: carAdId })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[FavoritesService] Toggle favorite error:', response.status, errorText);
      throw new Error(`Failed to toggle favorite: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[FavoritesService] Successfully toggled favorite:', {
      car_ad_id: carAdId,
      is_favorite: data.is_favorite
    });

    return data;
  }

  /**
   * Проверить, находится ли объявление в избранном
   * Получает один автомобиль и проверяет его поле is_favorite
   */
  static async checkFavorite(carAdId: number): Promise<boolean> {
    console.log('[FavoritesService] Checking if car ad is favorite:', carAdId);

    try {
      // Получаем информацию об автомобиле, которая включает поле is_favorite
      const response = await fetchWithAuth(`/api/autoria/cars/${carAdId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('[FavoritesService] Check favorite error:', response.status);
        return false; // В случае ошибки считаем, что не в избранном
      }

      const data = await response.json();
      const isFavorite = data.is_favorite || false;

      console.log('[FavoritesService] Favorite status:', {
        car_ad_id: carAdId,
        is_favorite: isFavorite
      });

      return isFavorite;
    } catch (error) {
      console.error('[FavoritesService] Check favorite error:', error);
      return false;
    }
  }
}
