import type {
  CarImageParams,
  GeneratedCarImage,
  CarViewAngle,
} from '@/services/carImageGenerator.service';

export type CarImageGeneratorMode = 'preview' | 'selection';

export interface CarImageGeneratorProps {
  carParams: CarImageParams;
  onImagesGenerated?: (images: GeneratedCarImage[]) => void;
  onImagesSelected?: (images: GeneratedCarImage[]) => void;
  showExtended?: boolean;
  className?: string;
  mode?: CarImageGeneratorMode; // Режим: просмотр или выбор для объявления
  maxImages?: number; // Максимальное количество изображений для выбора
}

export type { CarImageParams, GeneratedCarImage, CarViewAngle };
