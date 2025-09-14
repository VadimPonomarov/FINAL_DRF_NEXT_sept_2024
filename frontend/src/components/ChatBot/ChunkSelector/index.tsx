"use client";

import React from 'react';
import { ChunkSelectorView } from './ChunkSelectorView';
import { useChunkSelectorLogic } from './ChunkSelectorLogic';
import { ChunkSelectorProps } from './types';

export const ChunkSelector: React.FC<ChunkSelectorProps> = (props) => {
  const {
    sortedChunks,
    handleSelectChunk,
    handleDeleteChunk
  } = useChunkSelectorLogic(props);

  return (
    <ChunkSelectorView
      chunks={sortedChunks}
      currentChunk={props.currentChunk}
      onSelectChunk={handleSelectChunk}
      onDeleteChunk={handleDeleteChunk}
      onStartNewChat={props.onStartNewChat}
      onDeleteAllChunks={props.onDeleteAllChunks}
    />
  );
};

export * from './types';
