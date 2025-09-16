"use client";

import React from "react";
import unifiedStyles from '@/components/ChatBot/styles/chatbot-unified.module.css';

interface ResizableChatWrapperViewProps {
  children: React.ReactNode;
  wrapperRef: React.RefObject<HTMLDivElement>;
  isResizing: boolean;
  onDragStart: (e: React.MouseEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  debugInfo: {
    size: string;
    position: string;
  };
}

export const ResizableChatWrapperView: React.FC<ResizableChatWrapperViewProps> = ({
  children,
  wrapperRef,
  isResizing,
  onDragStart,
  onMouseDown,
  debugInfo
}) => {
  return (
    <div
      className={unifiedStyles.resizableWrapper}
      ref={wrapperRef}
      data-debug={JSON.stringify(debugInfo)}
    >
      <div
        className={unifiedStyles.dragHandle}
        onMouseDown={onDragStart}
        title="Перетащите, чтобы переместить"
      />
      {children}
      <div
        className={`${unifiedStyles.resizer} ${isResizing ? unifiedStyles.active : ''}`}
        onMouseDown={onMouseDown}
        title="Потяните, чтобы изменить размер"
      />
    </div>
  );
};
