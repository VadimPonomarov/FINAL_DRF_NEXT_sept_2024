"use client";

import React from "react";
import styles from './styles.module.css';

interface ResizableFilterWrapperViewProps {
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

export const ResizableFilterWrapperView: React.FC<ResizableFilterWrapperViewProps> = ({
  children,
  wrapperRef,
  isResizing,
  onDragStart,
  onMouseDown,
  debugInfo
}) => {
  return (
    <div
      className={styles.resizableFilterWrapper}
      ref={wrapperRef}
      data-filter-debug={JSON.stringify(debugInfo)}
    >
      {/* Заголовок для перетаскивания */}
      <div
        className={styles.dragHandle}
        onMouseDown={onDragStart}
        title="Перетащите, чтобы переместить"
      />
      {children}
      <div
        className={`${styles.resizer} ${isResizing ? styles.active : ''}`}
        onMouseDown={onMouseDown}
        title="Потяните, чтобы изменить размер"
      />
    </div>
  );
};
