"use client";

import React from 'react';
import { ChatMessageView } from './ChatMessageView';
import { useChatMessageLogic } from './ChatMessageLogic';
import { ChatMessageProps } from './types';

export const ChatMessage: React.FC<ChatMessageProps> = (props) => {
  const {
    isUser,
    isAssistant,
    isSystem,
    messageText,
    imageUrl,
    imageState,
    imageRef,
    handleImageLoad,
    handleImageError,
    handleZoomIn,
    handleZoomOut,
    handleDownload,
    handleToggleFullscreen,
    shouldRender,
    handleDelete
  } = useChatMessageLogic(props);

  // Пропускаем рендеринг пустых сообщений
  if (!shouldRender) return null;

  return (
    <ChatMessageView
      isUser={isUser}
      isAssistant={isAssistant}
      isSystem={isSystem}
      messageText={messageText}
      imageUrl={imageUrl}
      imageState={imageState}
      imageRef={imageRef}
      messageId={props.message.id}
      onDelete={handleDelete}
      onImageLoad={handleImageLoad}
      onImageError={handleImageError}
      onZoomIn={handleZoomIn}
      onZoomOut={handleZoomOut}
      onDownload={handleDownload}
      onToggleFullscreen={handleToggleFullscreen}
      contextInfo={props.messageContext}
      onThreadClick={props.onThreadClick}
      showContext={props.showContext}
      files={props.message.files}
      resultFileUrl={props.message.result_file_url}
      tableHtml={props.message.table_html}
      tableData={props.message.table_data}
      chartBase64={props.message.chart_base64}
    />
  );
};

export * from './types';
