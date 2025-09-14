"use client";

import { useState, useEffect } from 'react';

// Константа для ключа в localStorage
const IMAGE_SIZES_KEY = 'chat_image_sizes';

/**
 * Хук для работы с размерами изображений
 * @param imageId Уникальный идентификатор изображения
 * @param defaultSize Размер по умолчанию
 * @returns [size, setSize] - размер изображения и функция для его изменения
 */
export const useImageSize = (imageId: string, defaultSize: number = 100): [number, (size: number) => void] => {
  // Получаем начальный размер из localStorage
  const getInitialSize = (): number => {
    if (typeof window === 'undefined' || !imageId) return defaultSize;
    
    try {
      const sizesStr = localStorage.getItem(IMAGE_SIZES_KEY);
      if (!sizesStr) return defaultSize;
      
      const sizes = JSON.parse(sizesStr);
      return sizes[imageId] || defaultSize;
    } catch (error) {
      console.error(`Error getting image size for ${imageId}:`, error);
      return defaultSize;
    }
  };
  
  // Создаем состояние с начальным значением из localStorage
  const [size, setSize] = useState<number>(getInitialSize);
  
  // Сохраняем размер в localStorage при его изменении
  useEffect(() => {
    if (typeof window === 'undefined' || !imageId) return;
    
    try {
      const sizesStr = localStorage.getItem(IMAGE_SIZES_KEY) || '{}';
      const sizes = JSON.parse(sizesStr);
      
      // Обновляем размер
      sizes[imageId] = size;
      
      // Сохраняем обновленные размеры
      localStorage.setItem(IMAGE_SIZES_KEY, JSON.stringify(sizes));
      
      console.log(`Image size saved for ${imageId}: ${size}%`);
    } catch (error) {
      console.error(`Error saving image size for ${imageId}:`, error);
    }
  }, [imageId, size]);
  
  return [size, setSize];
};
