"use client";

import React from 'react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User, Trash2, Download, ZoomIn, ZoomOut, Maximize, Minimize, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from 'next/image';
import { ImageSkeleton } from "../ImageSkeleton";
import { FileAttachments } from "./FileAttachments";
import { TableDisplay } from "./TableDisplay";
import { MarkdownText } from "../MarkdownText";
import { FileAttachment } from "@/modules/chatbot/chat/chatTypes";
import unifiedStyles from '@/components/ChatBot/styles/chatbot-unified.module.css';

interface ChatMessageViewProps {
  isUser: boolean;
  isAssistant: boolean;
  isSystem: boolean;
  messageText: string;
  imageUrl: string | null;
  imageState: {
    loaded: boolean;
    error: boolean;
    retryCount: number;
    size: number;
    isFullscreen: boolean;
    isLoading: boolean;
  };
  imageRef: React.RefObject<HTMLImageElement>;
  messageId?: string;
  onDelete?: (messageId: string) => void;
  onImageLoad: () => void;
  onImageError: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onDownload: () => void;
  onToggleFullscreen: () => void;
  // New context props
  contextInfo?: {
    threadId: string;
    references: string[];
    referencedBy: string[];
  };
  onThreadClick?: (threadId: string) => void;
  showContext?: boolean;
  // File attachments
  files?: FileAttachment[];
  resultFileUrl?: string;
  // Table and chart data
  tableHtml?: string;
  tableData?: Array<Record<string, any>>;
  chartBase64?: string;
  // Timestamp
  timestamp?: string;
}

export const ChatMessageView: React.FC<ChatMessageViewProps> = ({
  isUser,
  // isAssistant, // Не используется
  // isSystem, // Не используется
  messageText,
  imageUrl,
  imageState,
  imageRef,
  messageId,
  onDelete,
  onImageLoad,
  onImageError,
  onZoomIn,
  onZoomOut,
  onDownload,
  onToggleFullscreen,
  contextInfo,
  onThreadClick,
  showContext,
  files,
  resultFileUrl,
  tableHtml,
  tableData,
  chartBase64,
  timestamp
}) => {
  // Функция для форматирования времени в местном формате
  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) {
      return ''; // Не показываем timestamp, если его нет
    }

    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return ''; // Не показываем невалидный timestamp
      }

      const formatted = date.toLocaleString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit'
      });

      return formatted;
    } catch (error) {
      return ''; // Не показываем timestamp при ошибке
    }
  };

  return (
    <div className="w-full mb-4">
      {/* Временная метка над сообщением */}
      {timestamp && formatTimestamp(timestamp) && (
        <div className={`text-xs text-muted-foreground mb-1 opacity-70 px-2 ${isUser ? 'text-right' : 'text-left'}`}>
          {formatTimestamp(timestamp)}
        </div>
      )}

      {/* Основной контейнер сообщения */}
      <div className={`${unifiedStyles.chatMessage} ${isUser ? unifiedStyles.chatMessageUser : unifiedStyles.chatMessageAssistant} group relative`}>
        {/* Кнопка удаления сообщения - в правом верхнем углу */}
        {onDelete && messageId && (
          <Button
            variant="ghost"
            size="icon"
            className={`${unifiedStyles.deleteButton}`}
            onClick={() => onDelete(messageId)}
            title="Удалить сообщение"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}

        {/* Avatar without background */}
        <div className="flex items-center justify-center h-8 w-8">
          {isUser ? (
            <User className="h-5 w-5 text-foreground" />
          ) : (
            <Bot className="h-5 w-5 text-foreground" />
          )}
        </div>

        {/* Содержимое сообщения */}
        <div className={`${unifiedStyles.chatMessageBubble} ${isUser ? unifiedStyles.chatMessageBubbleUser : unifiedStyles.chatMessageBubbleAssistant}`}>

        {/* Context information */}
        {showContext && contextInfo && (
          <div className="text-xs text-muted-foreground mb-2">
            <div className="flex items-center gap-2">
              <span className="text-primary cursor-pointer hover:underline" onClick={() => onThreadClick?.(contextInfo.threadId)}>
                Thread: {contextInfo.threadId}
              </span>
              {contextInfo.references.length > 0 && (
                <span>Replying to: {contextInfo.references.join(', ')}</span>
              )}
            </div>
            {contextInfo.referencedBy.length > 0 && (
              <div>Referenced by: {contextInfo.referencedBy.join(', ')}</div>
            )}
          </div>
        )}

        {/* Отображаем текст только если он не пустой */}
        {messageText && messageText.trim() !== "" && (
          <div className="bg-gray-500/5 p-1 rounded text-black">
            <MarkdownText text={messageText} />
          </div>
        )}

        {/* Отображаем изображение, если оно есть */}
        {imageUrl && (
          <div className={imageState.isFullscreen ? unifiedStyles.imageFullscreen : unifiedStyles.imageContainer}>
              {/* Показываем скелетон во время загрузки изображения */}
              {imageState.isLoading && !imageState.loaded && !imageState.error && (
                <ImageSkeleton message="Загрузка изображения..." />
              )}

              {/* Контейнер изображения */}
              <div className="relative w-full min-h-[200px] flex items-center justify-center">
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Generated image"
                  style={{
                    width: imageState.isFullscreen ? '80%' : `${imageState.size}%`,
                    height: 'auto',
                    objectFit: 'contain',
                    maxHeight: imageState.isFullscreen ? '80vh' : '500px',
                    transition: 'width 0.3s ease, max-height 0.3s ease'
                  }}
                  onLoad={onImageLoad}
                  onError={onImageError}
                  className={`rounded-lg ${imageState.loaded ? 'opacity-100 z-20' : 'opacity-0 z-10'} transition-opacity duration-300`}
                  loading="eager"
                  decoding="async"
                  crossOrigin="anonymous"
                />
              </div>

            {/* Элементы управления изображением */}
            <div className={unifiedStyles.imageControls}>
              <Button
                variant="secondary"
                size="icon"
                onClick={onZoomOut}
                title="Уменьшить"
                className={`${unifiedStyles.imageControlButton} h-8 w-8`}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={onZoomIn}
                title="Увеличить"
                className={`${unifiedStyles.imageControlButton} h-8 w-8`}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={onDownload}
                title="Скачать"
                className={`${unifiedStyles.imageControlButton} h-8 w-8`}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={onToggleFullscreen}
                title={imageState.isFullscreen ? "Выйти из полноэкранного режима" : "Полноэкранный режим"}
                className={`${unifiedStyles.imageControlButton} h-8 w-8`}
              >
                {imageState.isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        {/* Отображаем график из base64, если он есть */}
        {chartBase64 && (
          <div className="mt-4">
            <img
              src={`data:image/png;base64,${chartBase64}`}
              alt="Generated chart"
              className="w-full max-w-4xl rounded-lg border shadow-sm"
              style={{ maxHeight: '600px', objectFit: 'contain' }}
            />
          </div>
        )}

        {/* Отображаем таблицу, если она есть */}
        {(tableHtml || tableData) && (
          <TableDisplay
            tableHtml={tableHtml}
            tableData={tableData}
            files={files}
          />
        )}

        {/* Отображаем прикрепленные файлы, если они есть */}
        {(files?.length > 0 || resultFileUrl) && (
          <FileAttachments files={files || []} resultFileUrl={resultFileUrl} />
        )}
      </div>

      </div>
    </div>
  );
};
