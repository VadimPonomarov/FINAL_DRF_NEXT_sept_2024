import { CarAdFormData } from '@/modules/autoria/shared/types/autoria';
import { GeneratedCarImage } from '@/services/carImageGenerator.service';

export interface ImagesFormProps {
  data: Partial<CarAdFormData>;
  onChange: (data: Partial<CarAdFormData>) => void;
  errors?: string[];
  adId?: number;
}

export interface ImageGenerationOptions {
  imageTypes: string[];
  mode: 'add' | 'replace' | 'update';
  replaceExisting: boolean;
  onlyMissing: boolean;
  replaceEmpty: boolean;
}

export interface GenerationProgress {
  current: number;
  total: number;
}

export interface GalleryImage {
  id: string;
  url: string;
  title: string;
  type: string;
  isMain: boolean;
  source: 'existing' | 'generated' | 'uploaded';
}

export interface ExistingImage {
  id?: number;
  image_display_url?: string;
  image?: string;
  image_url?: string;
  is_main?: boolean;
  is_primary?: boolean;
  order?: number;
}
