"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Camera,
  Download,
  RefreshCw,
  Eye,
  Car,
  Palette,
  Settings,
  Image as ImageIcon,
  Grid3X3,
  Maximize2,
} from 'lucide-react';
import type { CarImageGeneratorProps } from './types';
import { useCarImageGenerator, downloadImage, getAngleIcon, getAngleName } from './hooks';

const CarImageGenerator: React.FC<CarImageGeneratorProps> = ({
  carParams,
  onImagesGenerated,
  onImagesSelected,
  showExtended = false,
  className = '',
  mode = 'preview',
  maxImages = 6,
}) => {
  const {
    images,
    loading,
    selectedImage,
    selectedImages,
    viewMode,
    generateImages,
    setSelectedImage,
    setViewMode,
    toggleImageSelection,
    isImageSelected,
    selectAllImages,
    clearSelection,
  } = useCarImageGenerator({
    carParams,
    onImagesGenerated,
    onImagesSelected,
    showExtended,
    className,
    mode,
    maxImages,
  });

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-slate-600">Генерируем изображения автомобиля...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                {mode === 'selection' ? 'Выберите изображения для объявления' : 'Изображения автомобиля'}
              </CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                {carParams.brand} {carParams.model} {carParams.year}
                {carParams.color && ` • ${carParams.color}`}
                {mode === 'selection' && (
                  <span className="ml-2 text-blue-600 font-medium">
                    Выбрано: {selectedImages.length}/{maxImages}
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              {mode === 'selection' && images.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllImages}
                    disabled={selectedImages.length >= maxImages}
                  >
                    Выбрать все
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                    disabled={selectedImages.length === 0}
                  >
                    Очистить
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'carousel' : 'grid')}
              >
                {viewMode === 'grid' ? <Maximize2 className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={generateImages}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Обновить
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Image Display */}
      {selectedImage && viewMode === 'carousel' && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="relative inline-block">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.title}
                  className="max-w-full h-auto max-h-96 rounded-lg shadow-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/api/placeholder/400/300';
                  }}
                />
                <Badge className="absolute top-2 right-2 bg-black/70 text-white">
                  {getAngleIcon(selectedImage.angle)} {getAngleName(selectedImage.angle)}
                </Badge>
              </div>
              <div className="mt-4 flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadImage(selectedImage, carParams)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Скачать
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Grid/Thumbnails */}
      <Card>
        <CardContent className="p-6">
          <div
            className={`grid gap-4 ${
              viewMode === 'grid'
                ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                : 'grid-cols-6'
            }`}
          >
            {images.map((image, index) => (
              <div
                key={`${image.angle}-${index}`}
                className={`relative group cursor-pointer transition-all duration-200 ${
                  mode === 'selection' && isImageSelected(image)
                    ? 'ring-2 ring-green-500 ring-offset-2 scale-105'
                    : selectedImage?.angle === image.angle
                      ? 'ring-2 ring-blue-500 ring-offset-2'
                      : 'hover:scale-105'
                }`}
                onClick={() => {
                  if (mode === 'selection') {
                    toggleImageSelection(image);
                  } else {
                    setSelectedImage(image);
                  }
                }}
              >
                <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden">
                  <img
                    src={image.url}
                    alt={image.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/api/placeholder/200/200?text=Car+Image';
                    }}
                  />
                </div>

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 rounded-lg flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Eye className="h-6 w-6 text-white" />
                  </div>
                </div>

                {/* Angle Badge */}
                <Badge
                  variant="secondary"
                  className="absolute bottom-2 left-2 text-xs bg-white/90 text-slate-700"
                >
                  {getAngleIcon(image.angle)} {getAngleName(image.angle)}
                </Badge>

                {/* Selection Indicator */}
                {mode === 'selection' && isImageSelected(image) && (
                  <div className="absolute top-2 right-2 bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center">
                    <span className="text-xs font-bold">✓</span>
                  </div>
                )}

                {/* Main Image Indicator */}
                {image.isMain && mode !== 'selection' && (
                  <Badge className="absolute top-2 right-2 bg-blue-600 text-white text-xs">
                    Главное
                  </Badge>
                )}

                {/* Download Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 hover:bg-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadImage(image, carParams);
                  }}
                >
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Image Info */}
      {selectedImage && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-slate-900">{selectedImage.title}</h4>
                <p className="text-sm text-slate-600">
                  Ракурс: {getAngleName(selectedImage.angle)}
                  {selectedImage.isMain && ' • Главное изображение'}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <ImageIcon className="h-4 w-4" />
                SVG формат
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generation Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Settings className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Параметры генерации</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <div>
                  Марка: <span className="font-medium">{carParams.brand}</span>
                </div>
                <div>
                  Модель: <span className="font-medium">{carParams.model}</span>
                </div>
                <div>
                  Год: <span className="font-medium">{carParams.year}</span>
                </div>
                {carParams.color && (
                  <div>
                    Цвет: <span className="font-medium">{carParams.color}</span>
                  </div>
                )}
                {carParams.condition && (
                  <div>
                    Состояние: <span className="font-medium">{carParams.condition}</span>
                  </div>
                )}
                <div>
                  Ракурсов: <span className="font-medium">{images.length}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CarImageGenerator;
