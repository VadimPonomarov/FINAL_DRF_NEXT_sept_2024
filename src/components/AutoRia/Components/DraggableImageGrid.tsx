"use client";

import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Star, Trash2, Eye, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ZoomableImage from './ZoomableImage';

export interface DraggableImage {
  id: string;
  url: string;
  title?: string;
  type?: string;
  isMain?: boolean;
  source?: 'uploaded' | 'generated' | 'existing';
}

interface DraggableImageGridProps {
  images: DraggableImage[];
  onReorder: (reorderedImages: DraggableImage[]) => void;
  onSetMain: (imageId: string) => void;
  onDelete: (imageId: string) => void;
  onPreview?: (image: DraggableImage, index: number) => void;
  className?: string;
}

const DraggableImageGrid: React.FC<DraggableImageGridProps> = ({
  images,
  onReorder,
  onSetMain,
  onDelete,
  onPreview,
  className = ''
}) => {
  const [previewImage, setPreviewImage] = useState<DraggableImage | null>(null);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const items = Array.from(images);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    onReorder(items);
  };

  const getSourceBadgeColor = (source?: string) => {
    switch (source) {
      case 'uploaded':
        return 'bg-blue-500';
      case 'generated':
        return 'bg-purple-500';
      case 'existing':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSourceLabel = (source?: string) => {
    switch (source) {
      case 'uploaded':
        return 'Завантажене';
      case 'generated':
        return 'Згенероване';
      case 'existing':
        return 'Існуюче';
      default:
        return 'Зображення';
    }
  };

  const handlePreview = (image: DraggableImage, index: number) => {
    if (onPreview) {
      onPreview(image, index);
    } else {
      setPreviewImage(image);
    }
  };

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="images-grid" direction="horizontal">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${className} ${
                snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg p-2' : ''
              }`}
            >
              {images.map((image, index) => (
                <Draggable key={image.id} draggableId={image.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`relative group ${
                        snapshot.isDragging ? 'rotate-3 shadow-2xl z-50' : ''
                      }`}
                    >
                      {/* Drag Handle */}
                      <div
                        {...provided.dragHandleProps}
                        className="absolute top-2 left-2 z-10 bg-black/50 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                      >
                        <GripVertical className="h-4 w-4" />
                      </div>

                      {/* Изображение */}
                      <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-300 transition-colors">
                        <img
                          src={typeof image === 'string' ? image : image.url}
                          alt={image.title || `Image ${index + 1}`}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => handlePreview(image, index)}
                        />
                      </div>

                      {/* Бейдж источника */}
                      <div className={`absolute top-2 right-2 ${getSourceBadgeColor(image.source)} text-white text-xs px-2 py-1 rounded`}>
                        {getSourceLabel(image.source)}
                      </div>

                      {/* Индикатор главного изображения */}
                      {image.isMain && (
                        <div className="absolute top-2 right-2 bg-yellow-500 text-white p-1 rounded-full">
                          <Star className="h-3 w-3 fill-current" />
                        </div>
                      )}

                      {/* Контролы */}
                      <div className="absolute bottom-2 left-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onSetMain(image.id)}
                          className="flex-1 bg-black/50 hover:bg-black/70 text-white text-xs"
                          disabled={image.isMain}
                        >
                          <Star className={`h-3 w-3 ${image.isMain ? 'fill-current' : ''}`} />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handlePreview(image, index)}
                          className="flex-1 bg-black/50 hover:bg-black/70 text-white text-xs"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onDelete(image.id)}
                          className="flex-1 bg-red-500/50 hover:bg-red-500/70 text-white text-xs"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Номер позиции */}
                      <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-1 py-0.5 rounded">
                        {index + 1}
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Модальное окно предпросмотра */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="relative w-full h-full max-w-4xl max-h-4xl">
            <ZoomableImage
              src={typeof previewImage === 'string' ? previewImage : previewImage.url}
              alt={previewImage.title || 'Preview'}
              className="w-full h-full"
              onClose={() => setPreviewImage(null)}
              showControls={true}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default DraggableImageGrid;
