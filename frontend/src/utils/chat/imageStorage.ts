/**
 * Утилита для работы с размерами изображений в localStorage
 */

// Константа для ключа в localStorage
const IMAGE_SIZES_KEY = 'chat_image_sizes';

/**
 * Интерфейс для хранения размеров изображений
 */
interface ImageSizesMap {
  [imageId: string]: number;
}

/**
 * Получает размер изображения по его ID
 * @param imageId Уникальный идентификатор изображения
 * @param defaultSize Размер по умолчанию, если размер не найден
 * @returns Размер изображения в процентах
 */
export const getImageSize = (imageId: string, defaultSize: number = 100): number => {
  try {
    if (typeof window === 'undefined') return defaultSize;
    
    const sizesStr = localStorage.getItem(IMAGE_SIZES_KEY);
    if (!sizesStr) {
      return defaultSize;
    }

    const sizes: ImageSizesMap = JSON.parse(sizesStr);
    return sizes[imageId] || defaultSize;
  } catch (error) {
    console.error(`Error getting image size for ${imageId}:`, error);
    return defaultSize;
  }
};

/**
 * Сохраняет размер изображения
 * @param imageId Уникальный идентификатор изображения
 * @param size Размер изображения в процентах
 */
export const saveImageSize = (imageId: string, size: number): void => {
  try {
    if (typeof window === 'undefined') return;
    
    const sizesStr = localStorage.getItem(IMAGE_SIZES_KEY) || '{}';
    const sizes: ImageSizesMap = JSON.parse(sizesStr);
    
    // Обновляем размер
    sizes[imageId] = size;
    
    // Сохраняем обновленные размеры
    localStorage.setItem(IMAGE_SIZES_KEY, JSON.stringify(sizes));
    
    console.log(`Image size saved for ${imageId}: ${size}%`);
  } catch (error) {
    console.error(`Error saving image size for ${imageId}:`, error);
  }
};

/**
 * Удаляет размер изображения
 * @param imageId Уникальный идентификатор изображения
 */
export const removeImageSize = (imageId: string): void => {
  try {
    if (typeof window === 'undefined') return;
    
    const sizesStr = localStorage.getItem(IMAGE_SIZES_KEY);
    if (!sizesStr) {
      return;
    }

    const sizes: ImageSizesMap = JSON.parse(sizesStr);
    
    // Удаляем размер
    delete sizes[imageId];
    
    // Сохраняем обновленные размеры
    localStorage.setItem(IMAGE_SIZES_KEY, JSON.stringify(sizes));
    
    console.log(`Image size removed for ${imageId}`);
  } catch (error) {
    console.error(`Error removing image size for ${imageId}:`, error);
  }
};

/**
 * Получает все сохраненные размеры изображений
 * @returns Объект с размерами изображений
 */
export const getAllImageSizes = (): ImageSizesMap => {
  try {
    if (typeof window === 'undefined') return {};
    
    const sizesStr = localStorage.getItem(IMAGE_SIZES_KEY);
    if (!sizesStr) {
      return {};
    }

    return JSON.parse(sizesStr);
  } catch (error) {
    console.error('Error getting all image sizes:', error);
    return {};
  }
};

/**
 * Генерирует уникальный идентификатор для изображения на основе URL
 * @param imageUrl URL изображения
 * @returns Уникальный идентификатор
 */
export const generateImageId = (imageUrl: string): string => {
  // Извлекаем параметры из URL
  try {
    const url = new URL(imageUrl);
    
    // Если есть параметр seed, используем его как часть идентификатора
    const seed = url.searchParams.get('seed');
    if (seed) {
      return `img_${seed}`;
    }
    
    // Иначе используем часть пути URL
    const pathParts = url.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    
    return `img_${lastPart}`;
  } catch (error) {
    // Если не удалось разобрать URL, используем хеш от всего URL
    return `img_${hashString(imageUrl)}`;
  }
};

/**
 * Простая хеш-функция для строк
 * @param str Строка для хеширования
 * @returns Хеш строки
 */
const hashString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
};
