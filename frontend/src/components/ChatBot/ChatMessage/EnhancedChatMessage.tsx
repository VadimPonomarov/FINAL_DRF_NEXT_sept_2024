import React, { useRef, useCallback, useState, useEffect } from 'react';
import { CurrencyExchangeDisplay } from './CurrencyExchangeDisplay';
import { Message } from '../hooks/useChat';
import { ChatMessageView } from './ChatMessageView';

interface ChatMessageProps {
  message: Message;
  onDelete?: (messageId: string) => void;
  messageContext?: any;
  onThreadClick?: (threadId: string | null) => void;
  showContext?: boolean;
}

// Интерфейс для сохранения состояния изображения
interface ImageState {
  loaded: boolean;
  error: boolean;
  retryCount: number;
  size: number;
  isFullscreen: boolean;
  isLoading: boolean;
}

// Ключ для localStorage
const IMAGE_STATE_KEY = 'chatbot_image_states';

export const EnhancedChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onDelete,
  messageContext,
  onThreadClick,
  showContext = false
}) => {
  const isCurrencyData = message.content && typeof message.content === 'object' && 'rates' in message.content;
  const imageRef = useRef<HTMLImageElement>(null);
  
  // DEBUG: Log all received data
  React.useEffect(() => {
    console.log('[EnhancedChatMessage] Message received:', {
      id: message.id,
      role: message.role,
      hasImageUrl: !!(message.imageUrl || message.image_url),
      imageUrl: message.imageUrl || message.image_url,
      hasTableHtml: !!(message.table_html || message.tableHtml),
      hasTableData: !!(message.table_data || message.tableData),
      messagePreview: message.message?.slice(0, 50)
    });
  }, [message]);
  
  // Загружаем сохраненное состояние изображения
  const [imageState, setImageState] = useState<ImageState>(() => {
    if (typeof window === 'undefined') {
      return {
        loaded: false,
        error: false,
        retryCount: 0,
        size: 100,
        isFullscreen: false,
        isLoading: false
      };
    }

    try {
      const savedStates = JSON.parse(localStorage.getItem(IMAGE_STATE_KEY) || '{}');
      const messageImageState = savedStates[message.id];
      
      if (messageImageState) {
        return {
          loaded: false, // Всегда начинаем с не загруженного состояния
          error: false,
          retryCount: 0,
          size: messageImageState.size || 100,
          isFullscreen: false, // Всегда начинаем с не полноэкранного режима
          isLoading: false
        };
      }
    } catch (error) {
      console.warn('Failed to load saved image state:', error);
    }

    return {
      loaded: false,
      error: false,
      retryCount: 0,
      size: 100,
      isFullscreen: false,
      isLoading: false
    };
  });

  // Сохраняем состояние изображения в localStorage
  const saveImageState = useCallback((newState: ImageState) => {
    if (typeof window === 'undefined') return;

    try {
      const savedStates = JSON.parse(localStorage.getItem(IMAGE_STATE_KEY) || '{}');
      savedStates[message.id] = {
        size: newState.size,
        isFullscreen: newState.isFullscreen
      };
      localStorage.setItem(IMAGE_STATE_KEY, JSON.stringify(savedStates));
    } catch (error) {
      console.warn('Failed to save image state:', error);
    }
  }, [message.id]);

  // Сохраняем состояние при изменении
  useEffect(() => {
    saveImageState(imageState);
  }, [imageState.size, imageState.isFullscreen, saveImageState]);

  const handleImageLoad = useCallback(() => {
    setImageState(prev => ({
      ...prev,
      loaded: true,
      error: false,
      isLoading: false
    }));
  }, []);

  const handleImageError = useCallback(() => {
    setImageState(prev => ({
      ...prev,
      error: true,
      loaded: false,
      isLoading: false
    }));
  }, []);

  const handleZoomIn = useCallback(() => {
    setImageState(prev => {
      const newSize = Math.min(prev.size + 20, 500); // Максимум 500%
      return {
        ...prev,
        size: newSize
      };
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setImageState(prev => {
      const newSize = Math.max(prev.size - 20, 10); // Минимум 10%
      return {
        ...prev,
        size: newSize
      };
    });
  }, []);

  const handleDownload = useCallback(() => {
    const imgUrl = message.imageUrl || message.image_url;
    if (imgUrl) {
      const link = document.createElement('a');
      link.href = imgUrl;
      link.download = `chatbot-image-${message.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [message.imageUrl, message.image_url, message.id]);

  const handleToggleFullscreen = useCallback(() => {
    setImageState(prev => ({
      ...prev,
      isFullscreen: !prev.isFullscreen
    }));
  }, []);

  // Сброс размера изображения
  const handleResetSize = useCallback(() => {
    setImageState(prev => ({
      ...prev,
      size: 100
    }));
  }, []);

  // Извлечение данных графика, если доступны
  const chartBase64 = message.chartBase64 || message.chart_base64 || (message.content?.chart_base64);
  const tableHtml = message.tableHtml || message.table_html || (message.content?.table_html);
  const tableData = message.tableData || message.table_data || (message.content?.table_data);
  const files = message.files || [];
  const resultFileUrl = message.resultFileUrl || message.result_file_url;

  // Обработка различных типов контента
  let content = message.content;
  if (typeof content === 'object' && content !== null) {
    // Если контент - объект, но не данные валют, попробуем его сериализовать
    if (!isCurrencyData) {
      try {
        content = JSON.stringify(content, null, 2);
      } catch (e) {
        content = String(content);
      }
    }
  }

  return (
    <ChatMessageView
      isUser={message.sender === 'user'}
      isAssistant={message.sender === 'assistant'}
      isSystem={message.sender === 'system'}
      messageText={typeof content === 'string' ? content : ''}
      imageUrl={message.imageUrl || message.image_url || undefined}
      imageState={imageState}
      imageRef={imageRef}
      messageId={message.id}
      onDelete={onDelete}
      onImageLoad={handleImageLoad}
      onImageError={handleImageError}
      onZoomIn={handleZoomIn}
      onZoomOut={handleZoomOut}
      onDownload={handleDownload}
      onToggleFullscreen={handleToggleFullscreen}
      onResetSize={handleResetSize}
      contextInfo={messageContext}
      onThreadClick={onThreadClick}
      showContext={showContext}
      files={files}
      resultFileUrl={resultFileUrl}
      tableHtml={tableHtml}
      tableData={tableData}
      chartBase64={chartBase64}
      timestamp={message.timestamp}
    />
  );
};

