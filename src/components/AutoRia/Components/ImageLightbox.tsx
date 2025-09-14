import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight, Download } from 'lucide-react';

interface ImageLightboxProps {
  images: Array<{
    url: string;
    title?: string;
    alt?: string;
  }>;
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (index: number) => void;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({
  images,
  currentIndex,
  isOpen,
  onClose,
  onNavigate
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const currentImage = images[currentIndex];

  // Сброс состояния при смене изображения
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  // Сброс состояния при закрытии
  useEffect(() => {
    if (!isOpen) {
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.5, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.5, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handlePrevious = () => {
    if (onNavigate && images.length > 1) {
      const newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
      onNavigate(newIndex);
    }
  };

  const handleNext = () => {
    if (onNavigate && images.length > 1) {
      const newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
      onNavigate(newIndex);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDownload = async () => {
    if (currentImage?.url) {
      try {
        const response = await fetch(currentImage.url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentImage.title || `image-${currentIndex + 1}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading image:', error);
      }
    }
  };

  // Обработка клавиш
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case 'r':
        case 'R':
          handleRotate();
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, currentIndex]);

  if (!currentImage) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95">
        {/* Панель управления */}
        <div className="absolute top-4 left-4 right-4 z-50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              className="bg-black/50 hover:bg-black/70 text-white border-white/20"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-white text-sm bg-black/50 px-2 py-1 rounded">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoom >= 5}
              className="bg-black/50 hover:bg-black/70 text-white border-white/20"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRotate}
              className="bg-black/50 hover:bg-black/70 text-white border-white/20"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownload}
              className="bg-black/50 hover:bg-black/70 text-white border-white/20"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {images.length > 1 && (
              <span className="text-white text-sm bg-black/50 px-2 py-1 rounded">
                {currentIndex + 1} / {images.length}
              </span>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="bg-black/50 hover:bg-black/70 text-white border-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Навигация */}
        {images.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-black/50 hover:bg-black/70 text-white border-white/20"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 bg-black/50 hover:bg-black/70 text-white border-white/20"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}

        {/* Изображение */}
        <div 
          className="w-full h-full flex items-center justify-center overflow-hidden cursor-move"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            src={currentImage.url}
            alt={currentImage.alt || currentImage.title || 'Image'}
            className="max-w-none max-h-none object-contain transition-transform duration-200"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
              cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
            }}
            draggable={false}
          />
        </div>

        {/* Информация об изображении */}
        {currentImage.title && (
          <div className="absolute bottom-4 left-4 right-4 z-50">
            <div className="bg-black/50 text-white px-4 py-2 rounded text-center">
              {currentImage.title}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImageLightbox;
