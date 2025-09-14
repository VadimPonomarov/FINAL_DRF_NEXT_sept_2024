"use client";

import { useRef, useState, useEffect } from "react";
import { ResizableFilterWrapperProps, FilterPosition, FilterSize } from './types';

// Константы для хранения в localStorage
const SIZE_STORAGE_KEY = 'filterDialogSize';
const POSITION_STORAGE_KEY = 'filterDialogPosition';
const MIN_WIDTH = 300;
const MIN_HEIGHT = 300;

export const useResizableFilterWrapperLogic = (/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  _props: ResizableFilterWrapperProps
) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Добавляем состояние для размеров и положения
  const [size, setSize] = useState<FilterSize | null>(null);
  const [position, setPosition] = useState<FilterPosition | null>(null);

  // Обработчик начала перетаскивания
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();

    if (!wrapperRef.current) return;

    const rect = wrapperRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    setIsDragging(true);
    document.body.style.cursor = 'move';
    document.body.style.userSelect = 'none';

    const onMouseMove = (e: MouseEvent) => {
      if (!wrapperRef.current || !isDragging) return;

      // Вычисляем новое положение с учетом смещения
      let newLeft = e.clientX - offsetX;
      let newTop = e.clientY - offsetY;

      // Получаем размеры окна и экрана
      const wrapperWidth = wrapperRef.current.offsetWidth;
      const wrapperHeight = wrapperRef.current.offsetHeight;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      // Ограничиваем позицию, чтобы окно не выходило за границы экрана
      // Оставляем минимум 50px видимыми на экране
      newLeft = Math.max(newLeft, -wrapperWidth + 50);
      newLeft = Math.min(newLeft, windowWidth - 50);
      newTop = Math.max(newTop, 0);
      newTop = Math.min(newTop, windowHeight - 50);

      // Устанавливаем новое положение
      wrapperRef.current.style.left = `${newLeft}px`;
      wrapperRef.current.style.top = `${newTop}px`;
      // Убираем центрирующие стили для перетаскивания
      wrapperRef.current.style.right = 'auto';
      wrapperRef.current.style.bottom = 'auto';
      wrapperRef.current.style.margin = '0';
    };

    const onMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);

      // Сохраняем новое положение
      if (wrapperRef.current) {
        const newPosition: FilterPosition = {
          top: wrapperRef.current.style.top,
          left: wrapperRef.current.style.left,
          right: wrapperRef.current.style.right,
          bottom: wrapperRef.current.style.bottom,
          margin: wrapperRef.current.style.margin
        };

        // Обновляем состояние
        setPosition(newPosition);

        // Сохраняем в localStorage для сохранения между сессиями
        localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(newPosition));
      }
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Обработчик изменения размера
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
        // Получаем размеры экрана
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // Получаем позицию окна
        const rect = wrapperRef.current.getBoundingClientRect();

        // Вычисляем новые размеры
        let newHeight = Math.max(startHeight + (e.clientY - startY), MIN_HEIGHT);
        let newWidth = Math.max(startWidth + (e.clientX - startX), MIN_WIDTH);

        // Ограничиваем размеры, чтобы окно не выходило за границы экрана
        if (rect.left + newWidth > windowWidth) {
          newWidth = windowWidth - rect.left;
        }

        if (rect.top + newHeight > windowHeight) {
          newHeight = windowHeight - rect.top;
        }

        // Устанавливаем новые размеры
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
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);

      // Сохраняем новые размеры в текущей сессии и как дефолтные
      if (wrapperRef.current) {
        const newSize: FilterSize = {
          width: wrapperRef.current.style.width,
          height: wrapperRef.current.style.height
        };

        // Обновляем состояние
        setSize(newSize);

        // Сохраняем в localStorage для сохранения между сессиями
        localStorage.setItem(SIZE_STORAGE_KEY, JSON.stringify(newSize));
        console.log(`New default filter size saved: ${newSize.width} x ${newSize.height}`);
      }
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Восстанавливаем размеры и положение при монтировании
  useEffect(() => {
    if (wrapperRef.current) {
      try {
        // Восстанавливаем размеры из localStorage
        const savedSize = localStorage.getItem(SIZE_STORAGE_KEY);
        if (savedSize) {
          const parsedSize = JSON.parse(savedSize);
          setSize(parsedSize);
          wrapperRef.current.style.width = parsedSize.width;
          wrapperRef.current.style.height = parsedSize.height;
          console.log(`Restored filter size: ${parsedSize.width} x ${parsedSize.height}`);
        } else {
          // Устанавливаем дефолтные размеры, если нет сохраненных
          const defaultWidth = '600px';
          const defaultHeight = 'auto';
          wrapperRef.current.style.width = defaultWidth;
          wrapperRef.current.style.height = defaultHeight;
          console.log(`Using default filter size: ${defaultWidth} x ${defaultHeight}`);
        }

        // Восстанавливаем положение из localStorage (только в браузере)
        if (typeof window !== 'undefined') {
          const savedPosition = localStorage.getItem(POSITION_STORAGE_KEY);
          if (savedPosition) {
            const parsedPosition = JSON.parse(savedPosition);
            setPosition(parsedPosition);
            if (parsedPosition.top) wrapperRef.current.style.top = parsedPosition.top;
            if (parsedPosition.left) wrapperRef.current.style.left = parsedPosition.left;
            // Если есть сохраненная позиция, убираем центрирующие стили
            wrapperRef.current.style.right = 'auto';
            wrapperRef.current.style.bottom = 'auto';
            wrapperRef.current.style.margin = '0';
            console.log(`Restored filter position: top=${parsedPosition.top}, left=${parsedPosition.left}`);
          } else {
            // Если позиция не найдена, используем Flexbox центрирование
            wrapperRef.current.style.top = '0';
            wrapperRef.current.style.left = '0';
            wrapperRef.current.style.right = '0';
            wrapperRef.current.style.bottom = '0';
            wrapperRef.current.style.margin = 'auto';
          }
        }
      } catch (error) {
        console.error('Error loading filter settings:', error);
        // Аварийное центрирование с помощью Flexbox
        if (wrapperRef.current) {
          wrapperRef.current.style.top = '0';
          wrapperRef.current.style.left = '0';
          wrapperRef.current.style.right = '0';
          wrapperRef.current.style.bottom = '0';
          wrapperRef.current.style.margin = 'auto';
        }
      }
    }

    return () => {
      // Очищаем обработчики при размонтировании
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  // Используем переменные size и position для отладки
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
