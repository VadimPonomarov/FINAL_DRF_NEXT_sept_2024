"use client";

import { useEffect } from 'react';
import { getLastActiveChunk, saveLastActiveChunk } from '@/utils/chat/chatStorage';

/**
 * Hook для управления localStorage чат-бота
 * Сохраняет и загружает последний активный чат и размер окна
 */
export const useChatBotStorage = (isHydrated: boolean) => {
  
  // Загрузка последнего активного чата при открытии
  const loadLastActiveChunk = () => {
    const lastActiveChunkId = getLastActiveChunk();
    if (lastActiveChunkId) {
      console.log(`[useChatBotStorage] Loading last active chunk: ${lastActiveChunkId}`);
      window.dispatchEvent(new CustomEvent('load-last-active-chunk', {
        detail: { chunkId: lastActiveChunkId }
      }));
    } else {
      console.log('[useChatBotStorage] No last active chunk found');
    }
  };

  // Сохранение последнего активного чата при закрытии
  const saveCurrentChunk = () => {
    if (!isHydrated) return;

    const currentChunkId = localStorage.getItem('current_chunk_id');
    if (currentChunkId) {
      console.log(`[useChatBotStorage] Saving last active chunk: ${currentChunkId}`);
      saveLastActiveChunk(currentChunkId);
    }
  };

  // Сохранение размера окна
  const saveDialogSize = () => {
    if (!isHydrated) return;

    const resizableWrapper = document.querySelector('.resizable-wrapper');
    if (resizableWrapper) {
      const computedStyle = window.getComputedStyle(resizableWrapper);
      const wrapperWidth = computedStyle.width;
      const wrapperHeight = computedStyle.height;
      
      if (wrapperWidth && wrapperHeight) {
        const size = { 
          width: parseInt(wrapperWidth), 
          height: parseInt(wrapperHeight) 
        };
        localStorage.setItem('chatDialogSize', JSON.stringify(size));
        console.log(`[useChatBotStorage] Saved dialog size: ${size.width} x ${size.height}`);
      }
    }
  };

  return {
    loadLastActiveChunk,
    saveCurrentChunk,
    saveDialogSize
  };
};

