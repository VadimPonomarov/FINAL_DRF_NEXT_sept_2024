"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, X, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ZoomableImageProps {
  src: string;
  alt: string;
  className?: string;
  onClose?: () => void;
  showControls?: boolean;
}

const ZoomableImage: React.FC<ZoomableImageProps> = ({
  src,
  alt,
  className = '',
  onClose,
  showControls = true
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLDivElement>(null);

  // Zoom функции
  const zoomIn = () => {
    setScale(prev => Math.min(prev * 1.2, 5));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev / 1.2, 0.1));
  };

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Обработка колесика мыши
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.max(0.1, Math.min(5, prev * delta)));
  };

  // Drag функции
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Клавиатурные сокращения
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        zoomIn();
      } else if (e.key === '-') {
        zoomOut();
      } else if (e.key === '0') {
        resetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Контролы */}
      {showControls && (
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={zoomIn}
            className="bg-black/50 hover:bg-black/70 text-white"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={zoomOut}
            className="bg-black/50 hover:bg-black/70 text-white"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={resetZoom}
            className="bg-black/50 hover:bg-black/70 text-white"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          {onClose && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onClose}
              className="bg-black/50 hover:bg-black/70 text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Изображение */}
      <div
        ref={imageRef}
        className="w-full h-full flex items-center justify-center cursor-move"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in'
        }}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-none transition-transform duration-200"
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            transformOrigin: 'center center'
          }}
          draggable={false}
        />
      </div>

      {/* Индикатор масштаба */}
      {showControls && scale !== 1 && (
        <div className="absolute bottom-4 left-4 bg-black/50 text-white px-2 py-1 rounded text-sm">
          {Math.round(scale * 100)}%
        </div>
      )}

      {/* Подсказка */}
      {showControls && (
        <div className="absolute bottom-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-xs">
          Колесико: zoom • Drag: перемещение • ESC: закрыть
        </div>
      )}
    </div>
  );
};

export default ZoomableImage;
