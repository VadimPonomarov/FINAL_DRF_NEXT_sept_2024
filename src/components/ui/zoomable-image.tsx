"use client";

import React, { useState } from 'react';
import { X, ZoomIn } from 'lucide-react';

interface ZoomableImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
}

const ZoomableImage: React.FC<ZoomableImageProps> = ({
  src,
  alt,
  className = "",
  containerClassName = ""
}) => {
  const [isZoomed, setIsZoomed] = useState(false);

  const handleImageClick = () => {
    setIsZoomed(true);
  };

  const handleCloseZoom = () => {
    setIsZoomed(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsZoomed(false);
    }
  };

  return (
    <>
      {/* Обычное изображение */}
      <div className={`relative group cursor-pointer ${containerClassName}`}>
        <img
          src={src}
          alt={alt}
          className={`transition-transform duration-200 hover:scale-105 ${className}`}
          onClick={handleImageClick}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/api/placeholder/400/300?text=Image+Error';
          }}
        />
        
        {/* Overlay с иконкой zoom */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <ZoomIn className="h-8 w-8 text-white drop-shadow-lg" />
          </div>
        </div>
      </div>

      {/* Модальное окно с увеличенным изображением */}
      {isZoomed && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={handleBackdropClick}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            {/* Кнопка закрытия */}
            <button
              onClick={handleCloseZoom}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="h-8 w-8" />
            </button>
            
            {/* Увеличенное изображение */}
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/api/placeholder/800/600?text=Image+Error';
              }}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ZoomableImage;
