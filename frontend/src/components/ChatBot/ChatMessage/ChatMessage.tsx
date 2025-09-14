import React, { useRef, useCallback, useState } from 'react';
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

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onDelete,
  messageContext,
  onThreadClick,
  showContext = false
}) => {
  const isCurrencyData = message.content && typeof message.content === 'object' && 'rates' in message.content;
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageState, setImageState] = useState({
    loaded: false,
    error: false,
    retryCount: 0,
    size: 100,
    isFullscreen: false,
    isLoading: false
  });

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
    setImageState(prev => ({
      ...prev,
      size: Math.min(prev.size + 20, 500) // Максимум 500%
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setImageState(prev => ({
      ...prev,
      size: Math.max(prev.size - 20, 10) // Минимум 10%
    }));
  }, []);

  const handleDownload = useCallback(() => {
    if (message.imageUrl) {
      const link = document.createElement('a');
      link.href = message.imageUrl;
      link.download = `chart-${message.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [message.imageUrl, message.id]);

  const handleToggleFullscreen = useCallback(() => {
    setImageState(prev => ({
      ...prev,
      isFullscreen: !prev.isFullscreen
    }));
  }, []);

  // Extract chart data if available
  const chartBase64 = message.chartBase64 || message.chart_base64 || (message.content?.chart_base64);
  const tableHtml = message.tableHtml || message.table_html || (message.content?.table_html);
  const tableData = message.tableData || message.table_data || (message.content?.table_data);
  const files = message.files || [];
  const resultFileUrl = message.resultFileUrl || message.result_file_url;

  // Handle different content types
  let content = message.content;
  if (typeof content === 'object' && content !== null) {
    // If content is an object but not currency data, try to stringify it
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
      imageUrl={message.imageUrl || undefined}
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