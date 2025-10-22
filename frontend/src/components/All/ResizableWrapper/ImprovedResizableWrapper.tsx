"use client"
import React, { FC, useRef, useState, useEffect, useCallback } from "react";

interface ImprovedResizableWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  storageKey?: string;
  centered?: boolean;
  className?: string;
  style?: React.CSSProperties;
  minWidth?: number;
  minHeight?: number;
  defaultWidth?: number;
  defaultHeight?: number;
  onResizeStart?: () => void;
  onResizeEnd?: (size: { width: number; height: number }) => void;
  resizeTimeout?: number; // Таймаут для предотвращения случайного закрытия
}

const ImprovedResizableWrapper: FC<ImprovedResizableWrapperProps> = ({
  children,
  storageKey = 'resizable-wrapper',
  centered = true,
  className = '',
  style = {},
  minWidth = 200,
  minHeight = 150,
  defaultWidth = 400,
  defaultHeight = 300,
  onResizeStart,
  onResizeEnd,
  resizeTimeout = 2000
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [size, setSize] = useState({ width: defaultWidth, height: defaultHeight });
  const [isMobile, setIsMobile] = useState(false);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Отслеживание размера окна для адаптивности
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkMobile = () => {
        setIsMobile(window.innerWidth <= 768);
      };

      checkMobile();
      window.addEventListener('resize', checkMobile);

      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);

  // Загрузка сохраненного размера при монтировании
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedSize = localStorage.getItem(`wrapper-size-${storageKey}`);
        if (savedSize) {
          const parsed = JSON.parse(savedSize);
          setSize({
            width: Math.max(parsed.width || defaultWidth, minWidth),
            height: Math.max(parsed.height || defaultHeight, minHeight)
          });
        }
      } catch (error) {
        console.warn('Failed to load saved size:', error);
      }
    }
  }, [storageKey, defaultWidth, defaultHeight, minWidth, minHeight]);

  // Сохранение размера
  const saveSize = useCallback((newSize: { width: number; height: number }) => {
    try {
      localStorage.setItem(`wrapper-size-${storageKey}`, JSON.stringify(newSize));
    } catch (error) {
      console.warn('Failed to save size:', error);
    }
  }, [storageKey]);

  // Обработчик начала изменения размера
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    
    // Очищаем предыдущий таймаут
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = null;
    }
    
    // Вызываем callback начала изменения размера
    onResizeStart?.();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = size.width;
    const startHeight = size.height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      const newWidth = Math.max(startWidth + deltaX, minWidth);
      const newHeight = Math.max(startHeight + deltaY, minHeight);
      
      setSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      const finalSize = { width: size.width, height: size.height };
      saveSize(finalSize);
      
      // Устанавливаем таймаут для предотвращения случайного закрытия
      resizeTimeoutRef.current = setTimeout(() => {
        resizeTimeoutRef.current = null;
      }, resizeTimeout);
      
      // Вызываем callback окончания изменения размера
      onResizeEnd?.(finalSize);
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Восстановление стилей
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    // Предотвращение выделения текста
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'nw-resize';
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [size, minWidth, minHeight, saveSize, onResizeStart, onResizeEnd, resizeTimeout]);

  // Очистка таймаута при размонтировании
  useEffect(() => {
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  // Стили для контейнера с адаптивностью
  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: centered ? '50%' : '20px',
    left: centered ? '50%' : '20px',
    transform: centered ? 'translate(-50%, -50%)' : 'none',
    width: isMobile ? 'calc(100vw - 40px)' : `${size.width}px`,
    height: isMobile ? 'calc(100vh - 40px)' : `${size.height}px`,
    minWidth: isMobile ? 'auto' : `${minWidth}px`,
    minHeight: isMobile ? 'auto' : `${minHeight}px`,
    maxWidth: isMobile ? 'none' : 'calc(100vw - 40px)',
    maxHeight: isMobile ? 'none' : 'calc(100vh - 40px)',
    zIndex: 9999,
    ...style
  };

  return (
    <div
      ref={wrapperRef}
      className={`resizable-wrapper ${className}`}
      style={containerStyle}
      data-debug="true"
      data-storage-key={storageKey}
    >
      {children}
      
      {/* Handle для изменения размера */}
      {!isMobile && (
        <div
          className="resize-handle"
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '20px',
            height: '20px',
            cursor: 'nw-resize',
            background: 'linear-gradient(-45deg, transparent 30%, #ccc 30%, #ccc 70%, transparent 70%)',
            opacity: isResizing ? 1 : 0.5,
            transition: 'opacity 0.2s ease'
          }}
          onMouseDown={handleMouseDown}
        />
      )}
    </div>
  );
};

export default ImprovedResizableWrapper;
