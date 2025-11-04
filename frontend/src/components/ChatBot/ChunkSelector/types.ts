/**
 * Types for ChunkSelector component
 */
import { ChatChunk } from '@/modules/chatbot/chat/chatTypes';

export interface ChunkSelectorProps {
  chunks: ChatChunk[];
  currentChunk: ChatChunk | null;
  onSelectChunk: (chunkId: string) => void;
  onDeleteChunk: (chunkId: string) => void;
  onStartNewChat: () => void;
  onDeleteAllChunks: () => void;
}
