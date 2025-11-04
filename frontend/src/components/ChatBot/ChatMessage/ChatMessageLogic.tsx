"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { sanitizeUrl, addCacheBusting } from '@/modules/chatbot/chat/sanitizeUrl';
import { chatLogger, imageLogger } from '@/modules/chatbot/chat/logger';
import { ChatMessageProps } from './types';
import { useToast } from '@/modules/autoria/shared/hooks/use-toast';
import { extractFirstImageUrl, hasMarkdownImages, removeImagesFromMarkdown } from '@/modules/chatbot/chat/markdownParser';
import { useChatContext } from '../providers/ChatContextProvider';
import { generateImageId, getImageSize, saveImageSize } from '@/modules/chatbot/chat/imageStorage';

interface ImageState {
  loaded: boolean;
  error: boolean;
  retryCount: number;
  size: number;
  isFullscreen: boolean;
  isLoading: boolean;
}

export const useChatMessageLogic = (props: ChatMessageProps) => {
  const {
    message,
    onDelete,
    messageContext,
    onThreadClick,
    markMessageAsRendering,
    markMessageAsRendered,
    isMessageRendering
  } = props;
  const { toast } = useToast();
  const imageRef = useRef<HTMLImageElement>(null);
  const previousImageUrlRef = useRef<string | null>(null);

  // State for image handling
  const [imageState, setImageState] = useState<ImageState>({
    loaded: false,
    error: false,
    retryCount: 0,
    size: 100,
    isFullscreen: false,
    isLoading: false
  });

  // Extract image URL
  const imageUrl = useMemo(() => {
    if (message.image_url) {
      return message.image_url;
    }
    if (hasMarkdownImages(message.message || message.content || '')) {
      return extractFirstImageUrl(message.message || message.content || '');
    }
    return null;
  }, [message]);

  // Generate a unique ID for the image
  const imageId = useMemo(() => {
    if (!imageUrl) return '';
    return generateImageId(imageUrl);
  }, [imageUrl]);

  // Get the saved size for this image
  const savedSize = useMemo(() => {
    if (!imageId) return 100;
    return getImageSize(imageId, 100);
  }, [imageId]);

  // Update image state with saved size when component mounts or image URL changes
  useEffect(() => {
    if (imageId && savedSize !== 100) {
      setImageState(prev => ({ ...prev, size: savedSize }));
      console.log(`Loaded saved size for image ${imageId}: ${savedSize}%`);
    }
  }, [imageId, savedSize]);

  // Download handler - simplified version
  const handleDownload = useCallback(async () => {
    if (!imageUrl) return;

    try {
      // Fetch the image
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      // Create a filename based on message ID or timestamp
      const fileExtension = blob.type.split('/')[1] || 'png';
      const fileName = `image_${message.id || Date.now()}.${fileExtension}`;

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);

      toast({
        title: "Success",
        description: "Image downloaded successfully",
        duration: 3000,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download image",
        variant: "destructive",
        duration: 3000,
      });
    }
  }, [imageUrl, message.id, toast]);

  // Обрабатываем текст сообщения
  const rawMessageText = message.message || message.content || '';

  // Если в тексте есть markdown-разметка изображений, удаляем ее
  const messageText = hasMarkdownImages(rawMessageText) ? removeImagesFromMarkdown(rawMessageText) : rawMessageText;

  // Определяем тип сообщения
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isSystem = message.role === 'system';

  // Пропускаем пустые сообщения без текста, без изображения и без файлов
  const hasFiles = message.files && message.files.length > 0;
  const hasResultFile = !!message.result_file_url;
  const shouldRender = !(!messageText.trim() && !imageUrl && !hasFiles && !hasResultFile);

  // Отслеживаем рендеринг сообщения
  useEffect(() => {
    if (shouldRender && message.id && markMessageAsRendering && markMessageAsRendered) {
      // Отмечаем сообщение как рендерящееся при монтировании
      markMessageAsRendering(message.id);

      // Используем requestAnimationFrame для отметки завершения рендеринга
      // после того, как DOM обновится
      const markAsRendered = () => {
        requestAnimationFrame(() => {
          // Дополнительная проверка, что сообщение действительно отрендерилось
          setTimeout(() => {
            if (message.id) {
              console.log(`[ChatMessage] Message ${message.id} fully rendered`);
              markMessageAsRendered(message.id);
            }
          }, 50); // Небольшая задержка для гарантии полного рендеринга
        });
      };

      markAsRendered();
    }
  }, [shouldRender, message.id, markMessageAsRendering, markMessageAsRendered]);

  // Отслеживаем изменения в содержимом сообщения для повторной отметки рендеринга
  useEffect(() => {
    if (shouldRender && message.id && markMessageAsRendered) {
      const timer = setTimeout(() => {
        if (message.id) {
          console.log(`[ChatMessage] Message ${message.id} content updated and re-rendered`);
          markMessageAsRendered(message.id);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [messageText, imageUrl, hasFiles, hasResultFile, message.id, markMessageAsRendered, shouldRender]);

  // Функция для удаления сообщения
  const handleDelete = useCallback(() => {
    if (message.id && onDelete) {
      onDelete(message.id);
    }
  }, [message.id, onDelete]);

  // Функция для обработки клика по треду
  const handleThreadClick = useCallback((threadId: string) => {
    onThreadClick?.(threadId);
  }, [onThreadClick]);

  return {
    isUser,
    isAssistant,
    isSystem,
    messageText,
    imageUrl,
    imageState,
    imageRef,
    shouldRender,
    handleDelete,
    contextInfo: messageContext,
    handleThreadClick,
    files: message.files,
    resultFileUrl: message.result_file_url,
    handleImageLoad: () => setImageState(prev => ({ ...prev, loaded: true, error: false })),
    handleImageError: () => setImageState(prev => ({ ...prev, error: true })),
    handleZoomIn: () => {
      // Адаптивный шаг: меньший шаг для малых размеров, больший для крупных
      const step = imageState.size < 50 ? 10 : imageState.size < 100 ? 15 : 25;
      const newSize = Math.min(imageState.size + step, 500); // Максимум 500%
      console.log(`[Image Zoom] Zoom In: ${imageState.size}% -> ${newSize}% (step: ${step})`);
      setImageState(prev => ({ ...prev, size: newSize }));
      if (imageId) {
        saveImageSize(imageId, newSize);
        console.log(`Saved new size for image ${imageId}: ${newSize}%`);
      }
    },
    handleZoomOut: () => {
      // Адаптивный шаг: меньший шаг для малых размеров, больший для крупных
      const step = imageState.size <= 50 ? 5 : imageState.size <= 100 ? 10 : 25;
      const newSize = Math.max(imageState.size - step, 5); // Минимум 5%
      console.log(`[Image Zoom] Zoom Out: ${imageState.size}% -> ${newSize}% (step: ${step})`);
      setImageState(prev => ({ ...prev, size: newSize }));
      if (imageId) {
        saveImageSize(imageId, newSize);
        console.log(`Saved new size for image ${imageId}: ${newSize}%`);
      }
    },
    handleDownload,
    handleToggleFullscreen: () => setImageState(prev => ({ ...prev, isFullscreen: !prev.isFullscreen })),
  };
};
