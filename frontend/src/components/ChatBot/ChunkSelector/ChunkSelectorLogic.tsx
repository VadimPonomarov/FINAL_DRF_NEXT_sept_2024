"use client";

import { useMemo } from 'react';
import { ChunkSelectorProps } from './types';

export const useChunkSelectorLogic = (props: ChunkSelectorProps) => {
  const { chunks, /* currentChunk, */ onSelectChunk, onDeleteChunk } = props;

  // Сортируем чанки в порядке от новых к старым
  const sortedChunks = useMemo(() => {
    return [...chunks].sort((a, b) => {
      // Получаем время последнего сообщения в каждом чанке
      const aLastMessage = a.messages.length > 0 ? a.messages[a.messages.length - 1] : null;
      const bLastMessage = b.messages.length > 0 ? b.messages[b.messages.length - 1] : null;

      const aTimestamp = aLastMessage?.timestamp ? new Date(aLastMessage.timestamp).getTime() : 0;
      const bTimestamp = bLastMessage?.timestamp ? new Date(bLastMessage.timestamp).getTime() : 0;

      // Сортируем по убыванию (новые сверху)
      return bTimestamp - aTimestamp;
    });
  }, [chunks]);

  // Обработчик выбора чанка
  const handleSelectChunk = (chunkId: string) => {
    onSelectChunk(chunkId);
  };

  // Обработчик удаления чанка
  const handleDeleteChunk = (chunkId: string) => {
    onDeleteChunk(chunkId);
  };

  return {
    sortedChunks,
    handleSelectChunk,
    handleDeleteChunk
  };
};
