"use client";

import React from 'react';
import { ResizableFilterWrapperView } from './ResizableFilterWrapperView';
import { useResizableFilterWrapperLogic } from './ResizableFilterWrapperLogic';
import { ResizableFilterWrapperProps } from './types';

export const ResizableFilterWrapper: React.FC<ResizableFilterWrapperProps> = (props) => {
  const {
    wrapperRef,
    isResizing,
    handleDragStart,
    handleMouseDown,
    debugInfo
  } = useResizableFilterWrapperLogic(props);

  return (
    <ResizableFilterWrapperView
      wrapperRef={wrapperRef}
      isResizing={isResizing}
      onDragStart={handleDragStart}
      onMouseDown={handleMouseDown}
      debugInfo={debugInfo}
    >
      {props.children}
    </ResizableFilterWrapperView>
  );
};

export * from './types';
