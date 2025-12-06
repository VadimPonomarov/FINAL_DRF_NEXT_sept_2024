"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Star, X } from 'lucide-react';
import ImageLightbox from '@/components/AutoRia/Components/ImageLightbox';

export type GalleryImage = {
  id: string;
  url: string;
  title?: string;
  isMain?: boolean;
  source?: 'uploaded' | 'generated' | 'existing';
};

interface GalleryWithThumbnailsProps {
  images: GalleryImage[];
  onSetMain?: (id: string) => void;
  onDelete?: (id: string) => void;
  onReorder?: (reordered: GalleryImage[]) => void;
  className?: string;
}

const GalleryWithThumbnails: React.FC<GalleryWithThumbnailsProps> = ({
  images,
  onSetMain,
  onDelete,
  onReorder,
  className = ''
}) => {
  const [current, setCurrent] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Normalize to safe array
  const safeImages = useMemo(() => (Array.isArray(images) ? images : []).filter(Boolean), [images]);

  useEffect(() => {
    if (current > safeImages.length - 1) setCurrent(Math.max(0, safeImages.length - 1));
  }, [safeImages.length, current]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (lightboxOpen) return; // let lightbox handle
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [current, lightboxOpen, safeImages.length]);

  const prev = () => setCurrent((i) => (i - 1 + safeImages.length) % Math.max(1, safeImages.length));
  const next = () => setCurrent((i) => (i + 1) % Math.max(1, safeImages.length));

  // Simple DnD for thumbnails (optional)
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const onThumbDragStart = (index: number) => setDragIndex(index);
  const onThumbDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) return setDragIndex(null);
    const items = [...safeImages];
    const [moved] = items.splice(dragIndex, 1);
    items.splice(index, 0, moved);
    setDragIndex(null);
    if (onReorder) onReorder(items);
    setCurrent(items.findIndex((it) => it.id === moved.id));
  };

  if (safeImages.length === 0) {
    return (
      <div className={`aspect-video bg-slate-100 rounded-lg flex items-center justify-center ${className}`}>
        <span className="text-slate-500">Немає зображень</span>
      </div>
    );
  }

  const img = safeImages[current] || safeImages[0];
  const mainUrl = (img && (img as any).url) ? String((img as any).url) : '/api/placeholder/800/450?text=No+Image';

  return (
    <div className={`w-full ${className}`}>
      {/* Main image */}
      <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden group">
        <img
          src={mainUrl}
          alt={(img?.title || `Зображення ${current + 1}`)}
          className="w-full h-full object-cover cursor-zoom-in"
          onClick={() => setLightboxOpen(true)}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/api/placeholder/800/450?text=No+Image';
          }}
        />

        {/* Nav arrows */}
        {safeImages.length > 1 && (
          <>
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 z-30 pointer-events-auto"
              onClick={(e) => { e.stopPropagation(); prev(); }}
              aria-label="Prev"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 z-30 pointer-events-auto"
              onClick={(e) => { e.stopPropagation(); next(); }}
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Controls overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-10">
          <div className="flex gap-3">
            {onSetMain && (
              <button
                onClick={(e) => { e.stopPropagation(); onSetMain(img.id); }}
                className={`p-3 rounded-full transition-colors ${img.isMain ? 'bg-yellow-500 text-white' : 'bg-white/90 text-gray-700 hover:bg-yellow-500 hover:text-white'}`}
                title={img.isMain ? 'Головне фото' : 'Зробити головним'}
              >
                <Star className="h-5 w-5" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(img.id); }}
                className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                title="Видалити зображення"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Badges */}
        {img.source && (
          <div className={`absolute top-2 right-2 text-white text-xs px-2 py-1 rounded ${
            img.source === 'existing' ? 'bg-green-500' : img.source === 'generated' ? 'bg-purple-500' : 'bg-blue-500'
          }`}>
            {img.source === 'existing' ? 'Існуюче' : img.source === 'generated' ? 'Згенероване' : 'Завантажене'}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {safeImages.length > 1 && (
        <div className="mt-3 p-2 bg-gray-50 rounded-lg">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {safeImages.map((it, idx) => (
              <button
                key={it.id}
                className={`relative flex-shrink-0 w-20 h-16 rounded border-2 overflow-hidden transition-all ${
                  idx === current ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setCurrent(idx)}
                draggable={!!onReorder}
                onDragStart={() => onThumbDragStart(idx)}
                onDragOver={(e) => onReorder && e.preventDefault()}
                onDrop={() => onReorder && onThumbDrop(idx)}
                title={it.title || ''}
              >
                <img
                  src={it?.url || '/api/placeholder/100/80?text=IMG'}
                  alt={it?.title || `thumb ${idx + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/api/placeholder/100/80?text=IMG'; }}
                />
                {it.isMain && (
                  <div className="absolute top-1 left-1 bg-yellow-500 text-white rounded-full p-0.5">
                    <Star className="h-3 w-3" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Zoom lightbox */}
      <ImageLightbox
        images={safeImages.map(s => ({ url: s?.url || '/api/placeholder/800/450?text=No+Image', title: s?.title }))}
        currentIndex={current}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={(i) => setCurrent(i)}
      />
    </div>
  );
};

export default GalleryWithThumbnails;

