"use client";

import { useRef, useState, useEffect } from "react";
import { ResizableChatWrapperProps, ChatPosition, ChatSize } from './types';

// Константы для хранения в localStorage
const SIZE_STORAGE_KEY = 'chatDialogSize';
const POSITION_STORAGE_KEY = 'chatDialogPosition';
const MIN_WIDTH = 300;
const MIN_HEIGHT = 400;

export const useResizableChatWrapperLogic = (
  _props: ResizableChatWrapperProps
) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [size, setSize] = useState<ChatSize | null>(null);
  const [position, setPosition] = useState<ChatPosition | null>(null);

  const handleDragStart = (e: React.MouseEvent) => {
    if (isResizing) return;
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;

    const offsetX = startX - rect.left;
    const offsetY = startY - rect.top;

    setIsDragging(true);
    document.body.style.cursor = 'move';
    document.body.style.userSelect = 'none';

    const onMouseMove = (e: MouseEvent) => {
      if (!wrapperRef.current || !isDragging) return;
      // При flex-центрировании перетаскивание может быть ограничено
      // или может потребоваться другой подход
      console.log('Dragging not implemented for flex-centered wrapper');
    };

    const onMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const startY = e.clientY;
    const startHeight = wrapperRef.current?.offsetHeight || 0;
    const startX = e.clientX;
    const startWidth = wrapperRef.current?.offsetWidth || 0;

    setIsResizing(true);
    document.body.style.cursor = 'nwse-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (e: MouseEvent) => {
      if (wrapperRef.current) {
        const newHeight = Math.max(startHeight + (e.clientY - startY), MIN_HEIGHT);
        const newWidth = Math.max(startWidth + (e.clientX - startX), MIN_WIDTH);
        wrapperRef.current.style.height = `${newHeight}px`;
        wrapperRef.current.style.width = `${newWidth}px`;
      }
    };

    const onMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);

      if (wrapperRef.current) {
        const newSize: ChatSize = {
          width: wrapperRef.current.style.width,
          height: wrapperRef.current.style.height
        };
        setSize(newSize);
        localStorage.setItem(SIZE_STORAGE_KEY, JSON.stringify(newSize));
      }
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  useEffect(() => {
    if (wrapperRef.current) {
      try {
        const savedSize = localStorage.getItem(SIZE_STORAGE_KEY);
        if (savedSize) {
          const parsedSize = JSON.parse(savedSize);
          setSize(parsedSize);
          // Применяем сохраненные размеры только если они разумные
          if (parsedSize.width && parsedSize.height) {
            const width = parseFloat(parsedSize.width);
            const height = parseFloat(parsedSize.height);
            if (width > 200 && height > 200) {
              wrapperRef.current.style.width = parsedSize.width;
              wrapperRef.current.style.height = parsedSize.height;
            }
          }
        }
        // Если нет сохраненных размеров, используем CSS размеры по умолчанию (800x600)

        // При flex центрировании через родительский контейнер
        // используем относительное позиционирование
        wrapperRef.current.style.position = 'relative';
        wrapperRef.current.style.top = '';
        wrapperRef.current.style.left = '';
        wrapperRef.current.style.transform = '';
        wrapperRef.current.style.flexShrink = '0'; // Предотвращаем сжатие

      } catch (error) {
        console.error('Error loading chat settings:', error);
        // Аварийное восстановление
        if (wrapperRef.current) {
          wrapperRef.current.style.position = 'relative';
          wrapperRef.current.style.top = '';
          wrapperRef.current.style.left = '';
          wrapperRef.current.style.transform = '';
          wrapperRef.current.style.flexShrink = '0';
        }
      }
    }
  }, []);

  const debugInfo = {
    size: size ? `${size.width} x ${size.height}` : 'not set',
    position: position ? `top: ${position.top}, left: ${position.left}` : 'not set',
  };

  return {
    wrapperRef,
    isResizing,
    handleDragStart,
    handleMouseDown,
    debugInfo
  };
};
