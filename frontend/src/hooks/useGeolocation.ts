import { useState, useEffect, useCallback } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  region: string | null;
  country: string | null;
  timezone: string | null;
  locale: string | null;
  error: string | null;
  loading: boolean;
}

interface LocationData {
  city: string;
  region: string;
  country: string;
  timezone: string;
  locale: string;
}

export const useGeolocation = () => {
  const [geolocation, setGeolocation] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    city: null,
    region: null,
    country: null,
    timezone: null,
    locale: null,
    error: null,
    loading: true
  });

  // Функция для получения данных о местоположении
  const getLocation = useCallback(async (): Promise<LocationData> => {
    // Получаем локаль из браузера
    const locale = navigator.language || 'en-US';

    // Получаем часовой пояс из браузера
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    // Значения по умолчанию
    const defaultLocation: LocationData = {
      city: 'Запорожье',
      region: 'Запорожская область',
      country: 'Украина',
      timezone,
      locale
    };

    // Skip geolocation in development to avoid permissions issues
    if (process.env.NODE_ENV === 'development') {
      console.warn('Geolocation disabled in development mode');
      return defaultLocation;
    }

    // Если геолокация не поддерживается, возвращаем значения по умолчанию
    if (!navigator.geolocation) {
      console.warn('Geolocation API is not supported by this browser');
      return defaultLocation;
    }

    try {
      // Получаем координаты с помощью Promise
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });

      const { latitude, longitude } = position.coords;

      try {
        // Используем сервис обратного геокодирования
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&accept-language=${locale.split('-')[0]}`
        );

        if (!response.ok) {
          console.warn('Failed to fetch location data from geocoding service');
          return defaultLocation;
        }

        const data = await response.json();

        // Извлекаем информацию о местоположении
        const address = data.address || {};
        const city = address.city || address.town || address.village || address.hamlet || defaultLocation.city;
        const region = address.state || address.county || defaultLocation.region;
        const country = address.country || defaultLocation.country;

        return {
          city,
          region,
          country,
          timezone,
          locale
        };
      } catch (error) {
        console.warn('Error fetching location data from geocoding service:', error);
        return defaultLocation;
      }
    } catch (error) {
      console.warn('Error getting geolocation:', error);
      return defaultLocation;
    }
  }, []);

  useEffect(() => {
    // Инициализируем геолокацию при монтировании компонента
    const initGeolocation = async () => {
      try {
        // Получаем локаль из браузера
        const locale = navigator.language || 'en-US';

        // Получаем часовой пояс из браузера
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

        // Проверяем поддержку Geolocation API
        if (!navigator.geolocation) {
          setGeolocation(prev => ({
            ...prev,
            error: 'Geolocation is not supported by your browser',
            loading: false,
            timezone,
            locale
          }));
          return;
        }

        // Получаем данные о местоположении
        const locationData = await getLocation();

        // Обновляем состояние
        setGeolocation({
          latitude: null, // Не сохраняем координаты в состоянии для безопасности
          longitude: null,
          city: locationData.city,
          region: locationData.region,
          country: locationData.country,
          timezone: locationData.timezone,
          locale: locationData.locale,
          error: null,
          loading: false
        });
      } catch (error) {
        console.error('Error initializing geolocation:', error);

        // Получаем локаль и часовой пояс из браузера
        const locale = navigator.language || 'en-US';
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

        // Устанавливаем значения по умолчанию
        setGeolocation({
          latitude: null,
          longitude: null,
          city: 'Запорожье',
          region: 'Запорожская область',
          country: 'Украина',
          timezone,
          locale,
          error: error instanceof Error ? error.message : 'Unknown error',
          loading: false
        });
      }
    };

    initGeolocation();
  }, [getLocation]); // Убираем geolocation из зависимостей!

  return {
    ...geolocation,
    getLocation
  };
};
