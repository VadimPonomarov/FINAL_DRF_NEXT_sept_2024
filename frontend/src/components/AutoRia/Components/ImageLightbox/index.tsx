"use client";

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight } from 'lucide-react';

export type LightboxImage = {
  url: string;
  title?: string;
  alt?: string;
};

interface ImageLightboxProps {
  images: LightboxImage[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (index: number) => void;
}

const clampIndex = (idx: number, total: number) => {
  if (total <= 0) return 0;
  if (idx < 0) return total - 1;
  if (idx >= total) return 0;
  return idx;
};

const ImageLightbox: React.FC<ImageLightboxProps> = ({ images, currentIndex, isOpen, onClose, onNavigate }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const img = images[currentIndex];

  useEffect(() => {
    // Reset view when index/open changes
    setZoom(1);
    setRotation(0);
    setPos({ x: 0, y: 0 });
  }, [currentIndex, isOpen]);

  const prev = () => onNavigate?.(clampIndex(currentIndex - 1, images.length));
  const next = () => onNavigate?.(clampIndex(currentIndex + 1, images.length));

  const onMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setDragging(true);
    setDragStart({ x: e.clientX - pos.x, y: e.clientY - pos.y });
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging || zoom <= 1) return;
    setPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const onMouseUp = () => setDragging(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === '+') setZoom(z => Math.min(z * 1.2, 5));
      if (e.key === '-') setZoom(z => Math.max(z / 1.2, 0.5));
      if (e.key.toLowerCase() === 'r') setRotation(r => (r + 90) % 360);
    };
    if (isOpen) {
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
  }, [isOpen, currentIndex]);

  if (!isOpen || !img) return null;

  const safeUrl = img.url || '/api/placeholder/800/450?text=No+Image';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95">
        {/* Top controls */}
        <div className="absolute top-4 left-4 right-4 z-50 flex justify-between items-center pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <Button variant="secondary" size="sm" onClick={() => setZoom(z => Math.max(z / 1.2, 0.5))} className="bg-black/50 hover:bg-black/70 text-white border-white/20">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-white text-sm bg-black/50 px-2 py-1 rounded">{Math.round(zoom * 100)}%</span>
            <Button variant="secondary" size="sm" onClick={() => setZoom(z => Math.min(z * 1.2, 5))} className="bg-black/50 hover:bg-black/70 text-white border-white/20">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setRotation(r => (r + 90) % 360)} className="bg-black/50 hover:bg-black/70 text-white border-white/20">
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="pointer-events-auto">
            <Button variant="secondary" size="sm" onClick={onClose} className="bg-black/50 hover:bg-black/70 text-white border-white/20">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Nav arrows */}
        {images.length > 1 && (
          <>
            <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-black/50 hover:bg-black/70 text-white border-white/20">
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-4 top-1/2 -translate-y-1/2 z-50 bg-black/50 hover:bg-black/70 text-white border-white/20">
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}

        {/* Image */}
        <div
          className="w-full h-full flex items-center justify-center overflow-hidden cursor-move"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <img
            src={safeUrl}
            alt={img.alt || img.title || 'Image'}
            className="max-w-none max-h-none object-contain transition-transform duration-200"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg) translate(${pos.x / zoom}px, ${pos.y / zoom}px)`,
              cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'default'
            }}
            draggable={false}
          />
        </div>

        {/* Title */}
        {img.title && (
          <div className="absolute bottom-4 left-0 right-0 text-center z-50">
            <span className="inline-block bg-black/50 text-white px-3 py-1 rounded text-sm">
              {img.title}
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImageLightbox;

