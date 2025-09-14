/**
 * Types for ChunkSelector component
 */
import { ChatChunk } from '@/utils/chat/chatTypes';

export interface ChunkSelectorProps {
  chunks: ChatChunk[];
  currentChunk: ChatChunk | null;
  onSelectChunk: (chunkId: string) => void;
  onDeleteChunk: (chunkId: string) => void;
  onStartNewChat: () => void;
  onDeleteAllChunks: () => void;
}
