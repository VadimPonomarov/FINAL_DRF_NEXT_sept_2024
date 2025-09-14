"use client";

import React from 'react';
import { ResizableChatWrapperView } from './ResizableChatWrapperView';
import { useResizableChatWrapperLogic } from './ResizableChatWrapperLogic';
import { ResizableChatWrapperProps } from './types';

export const ResizableChatWrapper: React.FC<ResizableChatWrapperProps> = (props) => {
  const {
    wrapperRef,
    isResizing,
    handleDragStart,
    handleMouseDown,
    debugInfo
  } = useResizableChatWrapperLogic(props);

  return (
    <ResizableChatWrapperView
      wrapperRef={wrapperRef}
      isResizing={isResizing}
      onDragStart={handleDragStart}
      onMouseDown={handleMouseDown}
      debugInfo={debugInfo}
    >
      {props.children}
    </ResizableChatWrapperView>
  );
};

export * from './types';
