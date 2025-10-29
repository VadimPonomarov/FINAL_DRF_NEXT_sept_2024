"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Upload, X, Star, Wand2, Camera, Image as ImageIcon, Copy, RefreshCw, Settings } from 'lucide-react';
import { CarAdFormData } from '@/types/autoria';
import { useI18n } from '@/contexts/I18nContext';
import { useToast } from '@/hooks/use-toast';
import { alertHelpers } from '@/components/ui/alert-dialog-helper';
// import CarImageGenerator from '@/components/AutoRia/Components/CarImageGenerator';
import ImageGenerationModal from '@/components/AutoRia/Components/ImageGenerationModal';
// import ImageLightbox from '@/components/AutoRia/Components/ImageLightbox';
import GalleryWithThumbnails, { GalleryImage } from '@/components/AutoRia/Components/GalleryWithThumbnails';
import { useCarImageGenerator } from '@/hooks/useCarImageGenerator';
import { GeneratedCarImage } from '@/services/carImageGenerator.service';
// import DraggableImageGrid, { DraggableImage } from '@/components/AutoRia/Components/DraggableImageGrid';

interface ImagesFormProps {
  data: Partial<CarAdFormData>;
  onChange: (data: Partial<CarAdFormData>) => void;
  errors?: string[];
  adId?: number;
}

interface ImageGenerationOptions {
  imageTypes: string[];
  mode: 'add' | 'replace' | 'update';
  replaceExisting: boolean;
  onlyMissing: boolean;
  replaceEmpty: boolean;
}

const ImagesForm: React.FC<ImagesFormProps> = ({ data, onChange, errors, adId }) => {
  const { t } = useI18n();
  const { toast } = useToast();

  // Функция для получения названия ракурса
  const getAngleName = (angle: string) => {
    const angleNames: Record<string, string> = {
      front: t('autoria.images.angles.front', 'Front'),
      side: t('autoria.images.angles.side', 'Side'),
      rear: t('autoria.images.angles.rear', 'Rear'),
      interior: t('autoria.images.angles.interior', 'Interior'),
      engine: t('autoria.images.angles.engine', 'Engine'),
      dashboard: t('autoria.images.angles.dashboard', 'Dashboard')
    };
    return angleNames[angle as keyof typeof angleNames] || angle;
  };
  const [images, setImages] = useState<File[]>([]);
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'upload' | 'generate'>('generate');
  // Настройка: автосохранять ли AI-изображения сразу после генерации
  const [autoSaveGenerated, setAutoSaveGenerated] = useState(true);

  const [generatedImages, setGeneratedImages] = useState<GeneratedCarImage[]>([]);
  const [showGenerationModal, setShowGenerationModal] = useState(false);
  // const [lightboxOpen, setLightboxOpen] = useState(false);
  // const [lightboxIndex, setLightboxIndex] = useState(0);
  // const [lightboxImages, setLightboxImages] = useState<Array<{url: string; title?: string; alt?: string}>>([]);

  // Состояния для прогресса генерации
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [generationStatus, setGenerationStatus] = useState('');

  // Состояние для существующих изображений (при редактировании)
  const [existingImages, setExistingImages] = useState(data.existing_images || []);
  const [mainExistingImageIndex, setMainExistingImageIndex] = useState(
    (() => {
      const idx = data.existing_images?.findIndex((img: any) => (img as any).is_main || (img as any).is_primary);
      return typeof idx === 'number' && idx >= 0 ? idx : 0;
    })()
  );

  // Обновляем существующие изображения при изменении данных
  React.useEffect(() => {
    console.log('[ImagesForm] useEffect called with data.existing_images:', data.existing_images);
    if (data.existing_images) {
      setExistingImages(data.existing_images as any);
      const mainIndex = data.existing_images.findIndex((img: any) => (img as any).is_main || (img as any).is_primary);
      setMainExistingImageIndex(mainIndex >= 0 ? mainIndex : 0);
    }
  }, [data.existing_images]);

  // Хук для генерации изображений
  const {
    images: aiImages,
    loading: aiLoading,
    error: aiError,
    generateImages,
    downloadImage,
    getMainImage,
    isServiceAvailable
  } = useCarImageGenerator(data, {
    autoGenerate: false,
    extended: true,
    onImagesGenerated: (images) => {
      setGeneratedImages(images);
      // Инициализируем локальную копию для редактирования (удаление/перестановка до сохранения)
      setLocalAiImages(images as any[]);
      // Автоматически добавляем сгенерированные изображения в форму
      onChange({
        ...data,
        generated_images: images
      });
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    addFiles(files);
  };

  const addFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      // Проверяем тип файла
      if (!file.type.startsWith('image/')) {
        toast({ title: t('common.error'), description: `${t('autoria.fileNotImage')}: ${file.name}`, variant: 'destructive' });
        return false;
      }
      // Проверяем размер файла (максимум 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: t('common.error'), description: `${t('autoria.fileTooLarge')}: ${file.name} (${t('autoria.max10MB')})`, variant: 'destructive' });
        return false;
      }
      return true;
    });

    const newImages = [...images, ...validFiles].slice(0, 10); // Максимум 10 изображений
    setImages(newImages);

    // Обновляем данные формы
    onChange({
      ...data,
      uploaded_images: newImages
    });
  };

  // Drag & Drop обработчики
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) addFiles(files);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);

    if (mainImageIndex >= index && mainImageIndex > 0) {
      setMainImageIndex(prev => prev - 1);
    }

    // Обновляем данные формы
    onChange({
      ...data,
      uploaded_images: newImages
    });
  };

  const setMainImage = (index: number) => {
    setMainImageIndex(index);

    // Обновляем данные формы
    onChange({
      ...data,
      main_image_index: index
    });
  };

  // Функции для работы с существующими изображениями
  const removeExistingImage = async (index: number) => {
    const target = (existingImages as any[])[index];
    if (!target) return;

    const prevImages = existingImages;
    const newImages = existingImages.filter((_, i) => i !== index);
    setExistingImages(newImages);

    if (mainExistingImageIndex >= index && mainExistingImageIndex > 0) {
      setMainExistingImageIndex(prev => prev - 1);
    }

    // Обновляем локальные данные формы
    onChange({
      ...data,
      existing_images: newImages,
    });

    // Если редактируем объявление — удаляем на бэкенде сразу
    if (adId) {
      try {
        // Фолбэк: уточняем реальный ID на бэкенде по списку изображений
        let backendImageId = target.id;
        if (!backendImageId) {
          const resp = await fetch(`/api/ads/${adId}/images`);
          const list: any[] = resp.ok ? await resp.json() as any[] : [];
          const match = Array.isArray(list) && list.find((img: any) => (img?.image_display_url || img?.image || img?.image_url) === ((target as any)?.image_display_url || (target as any)?.image || (target as any)?.image_url));
          backendImageId = match?.id;
        }

        if (!backendImageId) throw new Error('Не удалось определить ID изображения в БД');

        console.log('[ImagesForm] Deleting image', { adId, backendImageId, target });
        const res = await fetch(`/api/ads/${adId}/images/${backendImageId}`, { method: 'DELETE' });
        if (!res.ok) {
          const text = await res.text();
          console.error('[ImagesForm] Backend delete failed', res.status, text);
          throw new Error(text || `HTTP ${res.status}`);
        }
        toast({ title: 'Фото удалено', description: 'Изображение удалено из БД' });
      } catch (err: any) {
        console.error('[ImagesForm] Failed to delete existing image:', err);
        // Откатываем локальное удаление
        setExistingImages(prevImages);
        toast({ title: 'Не удалось удалить фото', description: err?.message || 'Ошибка', variant: 'destructive' });
      }
    }
  };

  const setMainExistingImage = async (index: number) => {
    const targetImage = existingImages[index];
    if (!targetImage) return;

    // Перемещаем изображение на первое место в массиве
    const newImages = [...existingImages];
    const [movedImage] = newImages.splice(index, 1);
    newImages.unshift(movedImage);

    // Обновляем флаги is_main/is_primary и порядок
    const updatedImages = newImages.map((img: any, i: number) => ({
      ...img,
      is_main: i === 0,
      is_primary: i === 0,
      order: i + 1
    }));

    setExistingImages(updatedImages);
    setMainExistingImageIndex(0); // Главное изображение теперь на позиции 0

    // Обновляем данные формы
    onChange({
      ...data,
      existing_images: updatedImages,
      main_existing_image_id: movedImage?.id
    });

    // Если редактируем существующее объявление — сразу сохраняем на бэкенде
    if (adId && targetImage?.id) {
      try {
        // Сначала устанавливаем новое главное изображение
        const res = await fetch(`/api/ads/${adId}/images/${targetImage.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_primary: true, order: 1 })
        });
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || `HTTP ${res.status}`);
        }

        // Затем обновляем порядок остальных изображений
        const updatePromises = updatedImages.slice(1).map((img: any, i: number) =>
          fetch(`/api/ads/${adId}/images/${img.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_primary: false, order: i + 2 })
          })
        );

        await Promise.all(updatePromises);

        toast({
          title: '⭐ Головне фото встановлено',
          description: 'Зображення переміщено на перше місце',
        });
      } catch (err) {
        console.error('[ImagesForm] Failed to set primary image:', err);
        toast({
          title: 'Не вдалося встановити головне фото',
          description: err instanceof Error ? err.message : 'Невідома помилка',
          variant: 'destructive'
        });

        // Откатываем изменения при ошибке
        setExistingImages(existingImages);
        setMainExistingImageIndex(index);
      }
    }
  };

  const handleGenerateImages = async () => {
    console.log('🎨 [ImagesForm] handleGenerateImages called with data:', {
      brand: data.brand,
      model: data.model,
      year: data.year,
      hasRequiredData: !!(data.brand && data.model && data.year)
    });

    if (!data.brand || !data.model || !data.year) {
      toast({ title: t('common.warning'), description: t('autoria.fillRequiredFieldsForGeneration') || 'Заповніть марку, модель та рік автомобіля для генерації зображень', variant: 'destructive' });
      return;
    }

    // Можно открыть модальное окно для выбора опций или сразу генерировать
    // Пока открываем модальное окно для настройки параметров
    setShowGenerationModal(true);
  };

  // Удалено: устаревшая синхронная генерация через /api/car-images/generate
  // Вся генерация теперь через модалку и generateImagesWithTypes (асинхронно с прогрессом)


  // Проверка наличия данных автомобиля
  const hasCarData = () => {
    return !!(data.brand && data.model && data.year);
  };

  // Удалено: старая генерация с собственными тостами/прогрессом. Используем только модалку + generateImagesWithTypes.

  const handleModalGenerate = async (options: ImageGenerationOptions) => {
    console.log('🎨 [ImagesForm] Generating car images with options:', {
      brand: data.brand,
      model: data.model,
      year: data.year,
      color: data.color,
      body_type: data.body_type,
      selectedTypes: options.imageTypes,
      mode: options.mode,
      isServiceAvailable,
      aiLoading
    });

    // Закрываем модальное окно
    setShowGenerationModal(false);

    try {
      // Используем тот же процесс, что и на главной странице
      await generateImagesWithTypes(options.imageTypes);
      console.log('🎨 [ImagesForm] Image generation completed successfully');
    } catch (error) {
      console.error('🎨 [ImagesForm] Image generation failed:', error);
      toast({
        title: "❌ Ошибка генерации",
        description: "Не удалось сгенерировать изображения. Попробуйте еще раз.",
        variant: "destructive",
      });
    }
  };

  // Локальное состояние для генерации изображений
  const [localAiLoading, setLocalAiLoading] = useState(false);
  const [localAiImages, setLocalAiImages] = useState<any[]>([]);

  // Состояние для zoom модального окна
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // Состояние для drag-and-drop (устарело, управление порядком теперь в GalleryWithThumbnails)
  // const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  // const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Объединяем все изображения в единый пул для drag-and-drop
  const allImages: any[] = [
    // Существующие изображения
    ...existingImages.map((img, index) => ({
      id: `existing-${index}`,
      url: (() => {
        const ai = img as any;
        const u = ai.image_display_url || ai.image || ai.image_url;
        if (!u) return '/api/placeholder/300/300';
        if (typeof u === 'string' && u.startsWith('http')) return u;
        if (typeof u === 'string' && u.startsWith('/media/')) return `/api${u}`;
        if (typeof u === 'string' && u.startsWith('/api/media/')) return u;
        return `/api/media/${String(u).replace(/^\/+/, '')}`;
      })(),
      title: `Існуюче зображення ${index + 1}`,
      type: 'existing',
      isMain: mainExistingImageIndex === index,
      source: 'existing' as const
    })),
    // Сгенерированные изображения
    ...[...localAiImages, ...aiImages].map((img: any, index: number) => ({
      id: `generated-${img.id || index}`,
      url: img.url,
      title: img.title || `Згенероване зображення ${index + 1}`,
      type: img.angle || img.type || 'generated',
      isMain: img.isMain || false,
      source: 'generated' as const
    })).filter((v, i, arr) => arr.findIndex(x => x.url === v.url) === i),
    // Загруженные изображения
    ...images.map((img, index) => ({
      id: `uploaded-${index}`,
      url: typeof img === 'string' ? img : URL.createObjectURL(img),
      title: `Завантажене зображення ${index + 1}`,
      type: 'uploaded',
      isMain: false,
      source: 'uploaded' as const
    }))
  ];

  // Обработчики для drag-and-drop перенесены в GalleryWithThumbnails
  // Оставляем только универсальные функции обновления порядка ниже

  const updateImageArraysAfterReorder = (reorderedImages: any[]) => {
    // Разделяем изображения по типам и обновляем соответствующие состояния
    const newExisting = reorderedImages.filter(img => img.source === 'existing');
    const newGenerated = reorderedImages.filter(img => img.source === 'generated');
    const newUploaded = reorderedImages.filter(img => img.source === 'uploaded');

    // Перестраиваем existingImages согласно новому порядку
    const orderMap = new Map<string, number>();
    newExisting.forEach((img: any, idx: number) => orderMap.set(img.id, idx));

    setExistingImages(prev => {
      // Сортируем прежний массив по новому порядку, по возможности по id
      const withKeys = prev.map((img: any, idx: number) => ({
        orig: img,
        key: `existing-${img.id || idx}`
      }));
      withKeys.sort((a, b) => {
        const ai = orderMap.get(a.key);
        const bi = orderMap.get(b.key);
        if (ai == null && bi == null) return 0;
        if (ai == null) return 1;
        if (bi == null) return -1;
        return ai - bi;
      });
      return withKeys.map(x => x.orig);
    });

    // Обновляем вспомогательные наборы
    setLocalAiImages(newGenerated.map((x: any) => x));
    setImages(newUploaded.map((x: any) => x));
  };

  const persistReorderToBackend = async (reorderedImages: any[]) => {
    if (!adId) return;
    try {
      const existingOrdered = reorderedImages.filter(img => img.source === 'existing');
      const payload = existingOrdered
        .map((img: any, idx: number) => {
          const raw = img.id as string;
          if (!raw?.startsWith('existing-')) return null;
          const idNum = parseInt(raw.replace('existing-', ''));
          if (Number.isNaN(idNum)) return null;
          return { id: idNum, order: idx + 1 };
        })
        .filter(Boolean) as Array<{ id: number; order: number }>;

      await Promise.allSettled(payload.map(item =>
        fetch(`/api/ads/${adId}/images/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: item.order })
        })
      ));
    } catch (e) {
      console.error('[ImagesForm] Failed to persist reorder:', e);
      toast({ title: 'Помилка збереження порядку', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    }
  };

  const handleSetMain = async (imageId: string) => {
    const image = allImages.find(img => img.id === imageId);

    if (image?.source === 'existing') {
      const index = parseInt(imageId.replace('existing-', ''));
      const targetImage = existingImages[index];

      if (!targetImage) return;

      // Перемещаем изображение на первое место в массиве
      const newImages = [...existingImages];
      const [movedImage] = newImages.splice(index, 1);
      newImages.unshift(movedImage);

      // Обновляем флаги is_main/is_primary
      const updatedImages = newImages.map((img: any, i: number) => ({
        ...img,
        is_main: i === 0,
        is_primary: i === 0,
        order: i + 1
      }));

      setExistingImages(updatedImages);
      setMainExistingImageIndex(0); // Главное изображение теперь на позиции 0

      // Обновляем данные формы
      onChange({
        ...data,
        existing_images: updatedImages,
        main_existing_image_id: movedImage?.id
      });

      // Если редактируем существующее объявление — сохраняем на бэкенде
      if (adId && targetImage?.id) {
        try {
          // Сначала устанавливаем новое главное изображение
          const res = await fetch(`/api/ads/${adId}/images/${targetImage.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_primary: true, order: 1 })
          });

          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || `HTTP ${res.status}`);
          }

          // Затем обновляем порядок остальных изображений
          const updatePromises = updatedImages.slice(1).map((img: any, i: number) =>
            fetch(`/api/ads/${adId}/images/${img.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ is_primary: false, order: i + 2 })
            })
          );

          await Promise.all(updatePromises);

          toast({
            title: '⭐ Головне фото встановлено',
            description: 'Зображення переміщено на перше місце',
          });
        } catch (err) {
          console.error('[ImagesForm] Failed to set primary image:', err);
          toast({
            title: 'Не вдалося встановити головне фото',
            description: err instanceof Error ? err.message : 'Невідома помилка',
            variant: 'destructive'
          });

          // Откатываем изменения при ошибке
          setExistingImages(existingImages);
          setMainExistingImageIndex(index);
        }
      }
    }

    console.log('⭐ Set main image:', imageId);
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
    const image = allImages.find(img => img.id === imageId);

    if (image?.source === 'uploaded') {
      // Удаляем загруженное изображение
      const index = parseInt(imageId.replace('uploaded-', ''));
      const newImages = [...images];
      newImages.splice(index, 1);
      setImages(newImages);
      console.log('🗑️ Deleted uploaded image:', imageId);
      return;
    }

    if (image?.source === 'uploaded') {
      // Если adId уже известен, сразу отправим на бэкенд загрузку файла(ов)
      if (adId) {
        // Ничего не делаем тут — загрузка новых файлов происходит при сохранении формы (EditAdPage)
      }
    }

    if (image?.source === 'generated') {
      // Удаляем сгенерированное изображение (работаем с локальной копией, чтобы не пропали все)
      const index = parseInt(imageId.replace('generated-', ''));
      const base = (localAiImages && localAiImages.length ? localAiImages : (aiImages as any[])) || [];
      const newAiImages = [...base];
      if (index >= 0 && index < newAiImages.length) {
        newAiImages.splice(index, 1);
      }
      setLocalAiImages(newAiImages);
      // Обновляем форму, чтобы корректно отобразить новый набор
      onChange({
        ...data,
        generated_images: newAiImages
      });
      console.log('🗑️ Deleted generated image:', { imageId, index, length: newAiImages.length });
      return;
    }

    if (image?.source === 'existing') {
      // Проксируем к удалению в БД по индексу
      const index = parseInt(imageId.replace('existing-', ''));
      await removeExistingImage(index);
      return;
    }
  } catch (err) {
    console.error('[ImagesForm] handleDeleteImage error:', err);
  }
  };

  // Массовое удаление всех изображений (существующие, загруженные, сгенерированные)
  const handleDeleteAllImages = async () => {
    try {
      const total = allImages.length;
      if (total === 0) return;
      const confirmed = typeof window !== 'undefined'
        ? await alertHelpers.confirmDelete(t('autoria.allImages') || 'всі зображення')
        : true;
      if (!confirmed) return;

      const hadExisting = existingImages.length > 0;

      // 1) Чистим локальные состояния/UI
      setExistingImages([]);
      setImages([]);
      setLocalAiImages([]);
      setGeneratedImages([]);
      setMainExistingImageIndex(0);

      // 2) Обновляем данные формы
      try {
        onChange({
          ...data,
          existing_images: [],
          uploaded_images: [],
          generated_images: [],
          main_existing_image_id: undefined,
        });
      } catch {}

      // 3) Если редактируем объявление — удаляем все изображения в БД
      if (adId && hadExisting) {
        try {
          const resp = await fetch(`/api/ads/${adId}/images`);
          const list: any[] = resp.ok ? await resp.json() : [];
          if (Array.isArray(list) && list.length) {
            await Promise.allSettled(
              list.map((img: any) => fetch(`/api/ads/${adId}/images/${img.id}`, { method: 'DELETE' }))
            );
          }
        } catch (e) {
          console.warn('[ImagesForm] Bulk delete: backend sync failed', e);
        }
      }

      toast({ title: 'Готово', description: 'Все изображения удалены' });
    } catch (err) {
      console.error('[ImagesForm] handleDeleteAllImages error:', err);
      toast({ title: 'Ошибка', description: err instanceof Error ? err.message : 'Не удалось удалить изображения', variant: 'destructive' });
    }
  };


  // Генерация изображений с выбранными типами (используем тот же подход что и на главной странице)
  const generateImagesWithTypes = async (imageTypes: string[]): Promise<void> => {
    console.log('[ImagesForm] 🎯 generateImagesWithTypes called with:', imageTypes);
    console.log('[ImagesForm] 📊 Total image types to generate:', imageTypes.length);

    if (!data.brand || !data.model || !data.year) {
      toast({
        title: "❌ Недостаточно данных",
        description: "Заполните марку, модель и год автомобиля для генерации изображений",
        variant: "destructive",
      });
      return;
    }

    setLocalAiLoading(true);
    setGenerationProgress({ current: 0, total: imageTypes.length });
    setGenerationStatus('Подготовка к генерации...');

    try {
      toast({
        title: t('autoria.images.startingGeneration', '🎨 Starting generation'),
        description: t('autoria.images.generatingCount', `Generating ${imageTypes.length} images for ${data.brand} ${data.model} ${data.year}`),
      });

      // 🚀 АСИНХРОННАЯ генерация - не блокируем интерфейс!
      console.log('[ImagesForm] 🚀 Starting ASYNC generation in background...');

      // Показываем пользователю, что генерация началась
      toast({
        title: t('autoria.images.generationStarted', '⏳ Generation started'),
        description: t('autoria.images.backgroundGeneration', 'Images are being generated in the background. You can continue working.'),
      });

      // Исключаем уже сгенерированные типы, чтобы не дублировать
      const already = new Set((localAiImages || []).map((i: any) => i.type || i.angle));
      const toGenerate = imageTypes.filter((t) => !already.has(t));

      if (toGenerate.length === 0) {
        toast({ title: 'ℹ️ Нечего генерировать', description: 'Всі вибрані типи вже згенеровані' });
        setLocalAiLoading(false);
        setGenerationProgress({ current: 0, total: 0 });
        setGenerationStatus('');
        return;
      }

      // Запускаем генерацию через backend mock-алгоритм — идентично демо-объявлениям
      console.log('[ImagesForm] 🎨 Calling backend /api/chat/generate-car-images-mock (same as test ads)');
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      fetch(`${backendUrl}/api/chat/generate-car-images-mock/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          car_data: {
            brand: typeof data.brand === 'string' ? data.brand : (data as any).brand_name || (data as any).brand || '',
            model: typeof data.model === 'string' ? data.model : (data.model as any)?.name || '',
            year: data.year,
            color: (typeof data.color === 'string' ? data.color : (data as any).color_name) || 'silver',
            body_type: data.body_type || 'sedan',
            vehicle_type: (data as any).vehicle_type,
            vehicle_type_name: (data as any).vehicle_type_name || (data.body_type as any) || 'car',
            condition: data.condition || 'good',
            description: data.description || ''
          },
          angles: toGenerate,
          style: 'realistic',
          use_mock_algorithm: true
        })
      })
      .then(async (response): Promise<any> => {
        if (!response.ok) {
          // Не показываем финальный алерт здесь; отрабатываем в catch
          throw new Error(`Ошибка генерации: ${response.status}`);
        }
        return response.json();
      })
      .then((result: any) => {
        console.log('🎨 [ImagesForm] ASYNC Generation completed:', result);

        if ((result.success || result.status === 'ok') && result.images && result.images.length > 0) {
          // Определяем, есть ли уже главное фото, чтобы не создавать дубликаты
          const hasExistingMain = typeof mainExistingImageIndex === 'number' && (mainExistingImageIndex as number) >= 0;
          const hasGeneratedMain = [...(aiImages as any[]), ...(localAiImages as any[])].some((im: any) => !!im?.isMain);
          const hasAnyMain = hasExistingMain || hasGeneratedMain;

          // Конвертируем результат в формат для отображения
          const freshImages = result.images.map((img: any, index: number) => ({
            id: `generated-${Date.now()}-${index}`,
            url: img.url,
            angle: img.angle || imageTypes[index] || 'front',
            title: img.title || `${data.brand} ${data.model} - ${img.angle || imageTypes[index] || 'front'}`,
            isMain: hasAnyMain ? false : (img.isMain || index === 0)
          }));

          console.log('🎯 [ImagesForm] Generated images:', freshImages);

          // Мержим с уже сгенерированными локально и удаляем дубли по URL
          setLocalAiImages((prev) => {
            const merged = [...(prev || []), ...freshImages];
            const seen = new Set<string>();
            const deduped = merged.filter((it) => {
              const key = String(it.url);
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            // Также сразу отражаем в данных формы для сохранения
            try {
              onChange({
                ...data,
                generated_images: deduped.map((d: any) => ({ url: d.url, title: d.title, isMain: !!d.isMain }))
              });
            } catch (e) {
              console.warn('[ImagesForm] onChange for generated_images failed:', e);
            }
            return deduped;
          });

          // Автосохранение в БД для существующего объявления (без await, не блокируем UI)
          try {
            if (adId && autoSaveGenerated) {
              const baseOrder = existingImages.length;
              Promise.allSettled(freshImages.map((img: any, i: number) =>
                fetch(`/api/ads/${adId}/images`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    image_url: img.url,
                    caption: img.title || '',
                    is_primary: false,
                    order: baseOrder + i + 1
                  })
                })
              )).then((results: PromiseSettledResult<Response>[]) => {
                const failed = results.filter(r => r.status === 'rejected');
                if (failed.length) {
                  console.warn('[ImagesForm] Some generated images failed to auto-save:', failed.length);
                }
              });
            }
          } catch (e) {
            console.warn('[ImagesForm] Auto-save generated images failed (will still be saved on submit):', e);
          }

          // Показываем уведомление об успехе синхронно с окончанием лоадера
          setLocalAiLoading(false);
          setGenerationProgress({ current: 0, total: 0 });
          setGenerationStatus('');
          toast({
            title: "🎉 Генерацію завершено",
            description: `Створено ${freshImages.length} зображень`,
          });
        } else {
          console.error('[ImagesForm] ❌ No images in result:', result);
          toast({
            title: "⚠️ Генерация завершена",
            description: "Зображення не були згенеровані",
            variant: "destructive",
          });
        }
      })
      .catch((error) => {
        console.error('[ImagesForm] ❌ ASYNC Generation error:', error);
        toast({
          title: "❌ Ошибка генерации",
          description: error.message || "Не удалось сгенерировать изображения",
          variant: "destructive",
        });
      })
      .finally(() => {
        setLocalAiLoading(false);
        setGenerationProgress({ current: 0, total: 0 });
        setGenerationStatus('');
      });

      // Сразу возвращаемся - не ждем завершения генерации
      console.log('[ImagesForm] ⏳ Generation started in background, UI is free!');

    } catch (error) {
      console.error('🎨 [ImagesForm] Failed to start generation:', error);

      toast({
        title: "❌ Ошибка генерации",
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
        variant: "destructive",
      });
    }
    // Генерация запущена асинхронно, интерфейс свободен!
  };



  const canGenerateImages = data.brand && data.model && data.year;

  // Функция для открытия lightbox
  // const openLightbox = (imageUrl: string, index: number, allImages: Array<{url: string; title?: string; alt?: string}>) => {
  //   setLightboxImages(allImages);
  //   setLightboxIndex(index);
  //   setLightboxOpen(true);
  // };

  // Отладочная информация
  console.log('[ImagesForm] Data check:', {
    brand: data.brand,
    model: data.model,
    year: data.year,
    canGenerateImages,
    allDataKeys: Object.keys(data)
  });

  // Отладочная информация
  console.log('[ImagesForm] Data check:', {
    brand: data.brand,
    brand_name: data.brand_name,
    model: data.model,
    year: data.year,
    color: data.color,
    condition: data.condition,
    description: data.description ? `${data.description.substring(0, 50)}...` : 'none',
    canGenerateImages,
    aiLoading,
    isServiceAvailable,
    hasCarData: hasCarData(),
    buttonDisabled: aiLoading || !isServiceAvailable || !hasCarData(),
    activeTab,
    showGenerationModal
  });

  return (
    <div className="space-y-6">


      {/* Заголовок секции */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-900">
          {t('autoria.images.title', '📸 Car Images')}
        </h2>
        <p className="text-sm text-slate-600">
          {existingImages.length > 0
            ? t('autoria.images.helpExisting', 'Manage existing photos or add new ones')
            : t('autoria.images.helpEmpty', 'Add car photos or generate them automatically')
          }
        </p>
      </div>

      {/* Существующие изображения */}
      {/* Упрощаем: оставляем только объединенную галерею ниже для dnd и действий */}

      {/* Вкладки */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'upload' | 'generate')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            {t('autoria.images.tabGenerate', 'Image Generator')}
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            {t('autoria.images.tabUpload', 'Upload Photos')}
          </TabsTrigger>
        </TabsList>

        {/* Вкладка генератора изображений */}
        <TabsContent value="generate" className="space-y-6 mt-6">
          {!canGenerateImages ? (
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-6">
                <div className="text-center">
                  <Camera className="h-12 w-12 text-amber-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-amber-900 mb-2">
                    {t('autoria.images.fillBasic', 'Fill in the basic information')}
                  </h3>
                  <p className="text-amber-800 mb-4">
                    {t('autoria.images.needBrandModelYear', 'To generate images, specify brand, model and year')}
                  </p>
                  <p className="text-sm text-amber-700">
                    {t('autoria.images.goToBasicTab', 'Go to the Basic Info tab and fill in the required fields')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Кнопка генерации */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5" />
                    {t('autoria.images.autoGenerationTitle', 'Automatic image generation')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                      <h4 className="font-medium text-amber-900 mb-2">💡 {t('autoria.images.whenToUse', 'When to use the generator')}</h4>
                      <ul className="text-sm text-amber-800 space-y-1">
                        <li>• {t('autoria.images.tipNoPhotos', 'You have no car photos')}</li>
                        <li>• {t('autoria.images.tipPreAd', 'Need images for a draft ad')}</li>
                        <li>• {t('autoria.images.tipDifferentCity', 'Car is in another city')}</li>
                        <li>• {t('autoria.images.tipAngles', 'Want to show different angles')}</li>
                      </ul>
                    </div>

                    <p className="text-sm text-slate-600">
                      {t('autoria.images.generateFor', 'Generate car images for')}
                      <span className="font-medium"> {data.brand} {data.model} {data.year}</span>
                      {data.color && <span className="font-medium"> • {data.color}</span>}


                      {data.condition && <span className="font-medium"> • {data.condition}</span>}
                    </p>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <p className="text-xs text-blue-800">
                        💡 <strong>Улучшенная генерация:</strong> Теперь учитывается цвет, состояние автомобиля и описание для создания более точных изображений
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        type="button"
                        onClick={() => setShowGenerationModal(true)}
                        disabled={aiLoading || localAiLoading}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      >
                        {(aiLoading || localAiLoading) ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            {t('autoria.images.generating', 'Generating images...')}
                          </>
                        ) : (
                          <>
                            <Wand2 className="h-4 w-4 mr-2" />
                            {t('autoria.images.generateButton', 'Generate Images')}
                          </>
                        )}
                      </Button>


                    </div>

                    {/* Индикатор прогресса */}
                    {(aiLoading || localAiLoading || generationProgress.total > 0) && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-blue-900">{t('autoria.images.progress', 'Image generation')}</span>
                          <span className="text-sm text-blue-700">{generationProgress.current}/{generationProgress.total}</span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${generationProgress.total > 0 ? (generationProgress.current / generationProgress.total) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-blue-600">{generationStatus}</p>
                      </div>
                    )}

                    {!isServiceAvailable && (
                      <div className="text-sm text-red-600 flex items-center">
                        ⚠️ {t('autoria.images.serviceUnavailable', 'Generation service is temporarily unavailable')}
                      </div>
                    )}

                    {aiError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-800">❌ {aiError}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>


            </>
          )}
        </TabsContent>

        {/* Вкладка загрузки файлов */}
        <TabsContent value="upload" className="space-y-6 mt-6">
          {/* Загрузка изображений */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                {t('autoria.images.uploadTitle', 'Photo Upload')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="space-y-4">
                  <div className="flex justify-center">
                    {isDragOver ? (
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <Upload className="h-6 w-6 text-blue-600" />
                      </div>
                    ) : (
                      <Upload className="h-12 w-12 text-slate-400" />
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">
                      {isDragOver ? t('autoria.images.dropHere', 'Drop files here') : t('autoria.images.uploadPrompt', 'Upload car photos')}
                    </h3>
                    <p className="text-slate-600 mb-4">
                      {t('autoria.images.dragOrClick', 'Drag files here or click the button to select')}
                    </p>
                    <p className="text-sm text-slate-500">
                      {t('autoria.images.supportedFormats', 'Supported: JPG, PNG, WebP • Max 10 files • Up to 10MB each')}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload">
                      <Button asChild className="cursor-pointer">
                        <span className="flex items-center gap-2">
                          <Camera className="h-4 w-4" />
                          {t('autoria.images.chooseFiles', 'Choose files')}
                        </span>
                      </Button>
                    </label>

                    {images.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => setImages([])}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4 mr-2" />
                        {t('autoria.images.clearAll', 'Clear all')} ({images.length})
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>



          {/* Советы по фотографиям */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">💡 {t('autoria.images.photoTipsTitle', 'Photo tips')}</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• {t('autoria.images.photoTip1', 'Take photos in good lighting')}</li>
              <li>• {t('autoria.images.photoTip2', 'Show the car from different angles')}</li>
              <li>• {t('autoria.images.photoTip3', 'Photograph the interior and trunk')}</li>
              <li>• {t('autoria.images.photoTip4', 'Note all defects if any')}</li>
              <li>• {t('autoria.images.photoTip5', 'Use high-quality images')}</li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>

      {/* Общая информация */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <div>
              {t('autoria.images.uploadedCount', 'Uploaded photos')}: <span className="font-medium">{images.length}/10</span>
            </div>
            <div>
              {t('autoria.images.generatedCount', 'Generated')}: <span className="font-medium">{generatedImages.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Объединенный предпросмотр всех изображений с каруселью и миниатюрами */}
      {allImages.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              {t('autoria.images.allImages', 'All images for the ad')}
              <span className="text-sm font-normal text-gray-500">
                ({allImages.length} {t('autoria.images.photos', 'photos')})
              </span>
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              {t('autoria.images.hint', 'Drag thumbnails to reorder. Click image to zoom. Click ⭐ to set main, ✖ to delete.')}
            </p>
          </CardHeader>
          <CardContent>
            <GalleryWithThumbnails
              images={allImages as unknown as GalleryImage[]}
              onSetMain={(id) => handleSetMain(id)}
              onDelete={(id) => handleDeleteImage(id)}
              onReorder={(reordered) => {
                updateImageArraysAfterReorder(reordered as any);
                persistReorderToBackend(reordered as any);
              }}
            />
          </CardContent>
        </Card>
      )}



      {/* Модальное окно для выбора опций генерации */}
      <ImageGenerationModal
        isOpen={showGenerationModal}
        onClose={() => setShowGenerationModal(false)}
        onGenerate={async (options) => {
          console.log('[ImagesForm] 🚀 Starting generation with options:', options);
          console.log('[ImagesForm] 📋 Selected image types:', options.imageTypes);
          console.log('[ImagesForm] 📊 Total types selected:', options.imageTypes?.length);

          // Закрываем модальное окно сразу
          setShowGenerationModal(false);

          try {
            // Запускаем генерацию с выбранными типами
            await generateImagesWithTypes(options.imageTypes || []);
            console.log('[ImagesForm] ✅ Generation completed with selected types');

            toast({
              title: t('autoria.images.generationDone', 'Generation finished'),
              description: t('autoria.images.requestedTypesCount', 'Requested {count} image types', { count: options.imageTypes?.length || 0 }),
            });
          } catch (error) {
            console.error('[ImagesForm] ❌ Generation failed:', error);
            toast({
              title: "❌ Ошибка генерации",
              description: error instanceof Error ? error.message : 'Неизвестная ошибка',
              variant: "destructive",
            });
          }
        }}
        title={t('autoria.images.genModalTitle', 'Car image generation')}
        description={t('autoria.images.genModalDesc', { brand: data.brand || '', model: data.model || '', year: data.year || '' })}
        isLoading={aiLoading || localAiLoading}
      />

      {/* Модальное окно для zoom */}
      {zoomImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setZoomImage(null)}
        >
          <div className="relative max-w-4xl max-h-4xl w-full h-full flex items-center justify-center">
            <img
              src={zoomImage}
              alt="Zoomed image"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setZoomImage(null)}
              className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImagesForm;
