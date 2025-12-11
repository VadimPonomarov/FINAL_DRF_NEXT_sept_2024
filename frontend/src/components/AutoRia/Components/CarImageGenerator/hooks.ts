"use client";

import { useCallback, useEffect, useState } from 'react';
import CarImageGeneratorService, {
  CarImageParams,
  GeneratedCarImage,
  CarViewAngle,
} from '@/services/carImageGenerator.service';
import type { CarImageGeneratorMode, CarImageGeneratorProps } from './types';

export interface UseCarImageGeneratorOptions extends CarImageGeneratorProps {}

export interface UseCarImageGeneratorResult {
  images: GeneratedCarImage[];
  loading: boolean;
  selectedImage: GeneratedCarImage | null;
  selectedImages: GeneratedCarImage[];
  viewMode: 'grid' | 'carousel';
  mode: CarImageGeneratorMode;
  maxImages: number;
  generateImages: () => Promise<void>;
  setSelectedImage: (image: GeneratedCarImage | null) => void;
  setViewMode: (mode: 'grid' | 'carousel') => void;
  toggleImageSelection: (image: GeneratedCarImage) => void;
  isImageSelected: (image: GeneratedCarImage) => boolean;
  selectAllImages: () => void;
  clearSelection: () => void;
}

export const useCarImageGenerator = (
  options: UseCarImageGeneratorOptions,
): UseCarImageGeneratorResult => {
  const {
    carParams,
    onImagesGenerated,
    onImagesSelected,
    showExtended = false,
    mode = 'preview',
    maxImages = 6,
  } = options;

  const [images, setImages] = useState<GeneratedCarImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GeneratedCarImage | null>(null);
  const [selectedImages, setSelectedImages] = useState<GeneratedCarImage[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'carousel'>('grid');

  const generateImages = useCallback(async () => {
    setLoading(true);
    try {
      const generatedImages = showExtended
        ? CarImageGeneratorService.generateExtendedCarImageSet(carParams)
        : CarImageGeneratorService.generateCarImageSet(carParams);

      setImages(generatedImages);
      setSelectedImage(generatedImages[0] || null);

      if (onImagesGenerated) {
        onImagesGenerated(generatedImages);
      }
    } catch (error) {
      console.error('Error generating car images:', error);
    } finally {
      setLoading(false);
    }
  }, [carParams, onImagesGenerated, showExtended]);

  // Генерация изображений при изменении параметров
  useEffect(() => {
    void generateImages();
  }, [generateImages]);

  // Функции для режима выбора изображений
  const toggleImageSelection = (image: GeneratedCarImage) => {
    if (mode !== 'selection') return;

    setSelectedImages((prev) => {
      const isSelected = prev.some((img) => img.angle === image.angle);

      if (isSelected) {
        // Убираем из выбранных
        const newSelected = prev.filter((img) => img.angle !== image.angle);
        if (onImagesSelected) {
          onImagesSelected(newSelected);
        }
        return newSelected;
      }

      // Добавляем в выбранные (с ограничением)
      if (prev.length >= maxImages) {
        return prev;
      }
      const newSelected = [...prev, image];
      if (onImagesSelected) {
        onImagesSelected(newSelected);
      }
      return newSelected;
    });
  };

  const isImageSelected = (image: GeneratedCarImage) =>
    selectedImages.some((img) => img.angle === image.angle);

  const selectAllImages = () => {
    const imagesToSelect = images.slice(0, maxImages);
    setSelectedImages(imagesToSelect);
    if (onImagesSelected) {
      onImagesSelected(imagesToSelect);
    }
  };

  const clearSelection = () => {
    setSelectedImages([]);
    if (onImagesSelected) {
      onImagesSelected([]);
    }
  };

  return {
    images,
    loading,
    selectedImage,
    selectedImages,
    viewMode,
    mode,
    maxImages,
    generateImages,
    setSelectedImage,
    setViewMode,
    toggleImageSelection,
    isImageSelected,
    selectAllImages,
    clearSelection,
  };
};

export const getAngleIcon = (angle: CarViewAngle): string => {
  const iconMap: Record<CarViewAngle | string, string> = {
    front: '🚗',
    rear: '🚙',
    side: '🚐',
    interior: '🪑',
    engine: '⚙️',
    dashboard: '📊',
  };
  return iconMap[angle] || '📷';
};

export const getAngleName = (angle: CarViewAngle): string => {
  const nameMap: Record<CarViewAngle | string, string> = {
    front: 'Спереди',
    rear: 'Сзади',
    side: 'Сбоку',
    interior: 'Салон',
    engine: 'Двигатель',
    dashboard: 'Панель',
  };
  return nameMap[angle] || angle;
};

export const downloadImage = async (image: GeneratedCarImage, carParams: CarImageParams) => {
  try {
    const response = await fetch(image.url);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${carParams.brand}-${carParams.model}-${image.angle}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading image:', error);
  }
};
