/**
 * Хук для работы с генератором изображений автомобилей
 * Интегрируется с формами создания объявлений
 */

import { useState, useEffect, useCallback } from 'react';
import CarImageGeneratorService, {
  CarImageParams,
  GeneratedCarImage,
  CarViewAngle
} from '@/services/carImageGenerator.service';
import { CarAdFormData } from '@/types/autoria';
import { buildCanonicalCarData } from '@/utils/imageNormalization';

interface UseCarImageGeneratorOptions {
  autoGenerate?: boolean;
  extended?: boolean;
  onImagesGenerated?: (images: GeneratedCarImage[]) => void;
}

interface UseCarImageGeneratorReturn {
  images: GeneratedCarImage[];
  loading: boolean;
  error: string | null;
  generateImages: (params?: Partial<CarImageParams>) => Promise<void>;
  regenerateImage: (angle: CarViewAngle) => Promise<void>;
  downloadImage: (image: GeneratedCarImage) => Promise<void>;
  downloadAllImages: () => Promise<void>;
  getImageByAngle: (angle: CarViewAngle) => GeneratedCarImage | undefined;
  getMainImage: () => GeneratedCarImage | undefined;
  isServiceAvailable: boolean;
  checkServiceAvailability: () => Promise<boolean>;
}

export const useCarImageGenerator = (
  formData: Partial<CarAdFormData>,
  options: UseCarImageGeneratorOptions = {}
): UseCarImageGeneratorReturn => {
  const { autoGenerate = true, extended = false, onImagesGenerated } = options;

  const [images, setImages] = useState<GeneratedCarImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isServiceAvailable, setIsServiceAvailable] = useState(true);

  // Преобразование данных формы в параметры для генератора
  const formDataToCarParams = useCallback((data: Partial<CarAdFormData>): CarImageParams | null => {
    const canonical = buildCanonicalCarData(data);
    if (!canonical?.brand || !canonical?.model || !canonical?.year) return null;

    const clampCondition = (c: any): 'excellent'|'good'|'fair'|'poor' => {
      switch (c) {
        case 'excellent':
        case 'good':
        case 'fair':
        case 'poor':
          return c;
        default:
          return 'poor';
      }
    };

    return {
      brand: canonical.brand,
      model: canonical.model,
      year: canonical.year,
      color: canonical.color,
      condition: clampCondition(canonical.condition),
      bodyType: canonical.body_type,
      vehicleType: canonical.vehicle_type,
      vehicleTypeName: canonical.vehicle_type_name,
      description: canonical.description
    };
  }, []);

  // Проверка доступности сервиса
  const checkServiceAvailability = useCallback(async (): Promise<boolean> => {
    try {
      const available = await CarImageGeneratorService.checkServiceAvailability();
      setIsServiceAvailable(available);
      return available;
    } catch (error) {
      console.error('Error checking service availability:', error);
      setIsServiceAvailable(false);
      return false;
    }
  }, []);

  // Генерация изображений
  const generateImages = useCallback(async (customParams?: Partial<CarImageParams>) => {
    setLoading(true);
    setError(null);

    try {
      const carParams = customParams || formDataToCarParams(formData);

      if (!carParams) {
        throw new Error('Недостаточно данных для генерации изображений. Укажите марку, модель и год.');
      }

      console.log('🎨 Generating images with params:', carParams);

      // Используем AI генерацию для создания изображений
      const generatedImages = await CarImageGeneratorService.generateImagesForAd(carParams);

      setImages(generatedImages.images);

      if (onImagesGenerated) {
        onImagesGenerated(generatedImages.images);
      }

      console.log('✅ Images generated successfully:', generatedImages.images.length);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка генерации изображений';
      setError(errorMessage);
      console.error('Error generating images:', err);
    } finally {
      setLoading(false);
    }
  }, [formData, extended, onImagesGenerated, formDataToCarParams]);

  // Перегенерация конкретного изображения
  const regenerateImage = useCallback(async (angle: CarViewAngle) => {
    const carParams = formDataToCarParams(formData);
    if (!carParams) return;

    try {
      const newImage = CarImageGeneratorService.generateCustomImage(carParams, angle);
      
      setImages(prevImages => 
        prevImages.map(img => 
          img.angle === angle ? newImage : img
        )
      );
    } catch (err) {
      console.error('Error regenerating image:', err);
    }
  }, [formData, formDataToCarParams]);

  // Скачивание изображения
  const downloadImage = useCallback(async (image: GeneratedCarImage) => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const carParams = formDataToCarParams(formData);
      const filename = carParams 
        ? `${carParams.brand}-${carParams.model}-${carParams.year}-${image.angle}.svg`
        : `car-${image.angle}.svg`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading image:', err);
    }
  }, [formData, formDataToCarParams]);

  // Скачивание всех изображений
  const downloadAllImages = useCallback(async () => {
    for (const image of images) {
      await downloadImage(image);
      // Небольшая задержка между скачиваниями
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }, [images, downloadImage]);

  // Получение изображения по ракурсу
  const getImageByAngle = useCallback((angle: CarViewAngle): GeneratedCarImage | undefined => {
    return images.find(img => img.angle === angle);
  }, [images]);

  // Получение главного изображения
  const getMainImage = useCallback((): GeneratedCarImage | undefined => {
    return images.find(img => img.isMain) || images[0];
  }, [images]);

  // Автоматическая генерация при изменении данных формы
  useEffect(() => {
    if (autoGenerate && formData.brand && formData.model && formData.year) {
      const carParams = formDataToCarParams(formData);
      if (carParams) {
        generateImages();
      }
    }
  }, [formData.brand, formData.model, formData.year, formData.color, autoGenerate, generateImages, formDataToCarParams]);

  // Проверка доступности сервиса при инициализации
  useEffect(() => {
    checkServiceAvailability();
  }, [checkServiceAvailability]);

  return {
    images,
    loading,
    error,
    generateImages,
    regenerateImage,
    downloadImage,
    downloadAllImages,
    getImageByAngle,
    getMainImage,
    isServiceAvailable,
    checkServiceAvailability
  };
};

export default useCarImageGenerator;
