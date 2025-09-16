"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Trash2, MessageSquare, Plus, MoreVertical } from 'lucide-react';
import { ChatChunk } from '@/utils/chat/chatTypes';
import unifiedStyles from '@/components/ChatBot/styles/chatbot-unified.module.css';

interface ChunkSelectorViewProps {
  chunks: ChatChunk[];
  currentChunk: ChatChunk | null;
  onSelectChunk: (chunkId: string) => void;
  onDeleteChunk: (chunkId: string) => void;
  onStartNewChat: () => void;
  onDeleteAllChunks: () => void;
}

export const ChunkSelectorView: React.FC<ChunkSelectorViewProps> = ({
  chunks,
  currentChunk,
  onSelectChunk,
  onDeleteChunk,
  onStartNewChat,
  onDeleteAllChunks
}) => {
  return (
    <div className={styles.container}>
      <div className={unifiedStyles.chatDialogHeader}>
        <h3 className={unifiedStyles.chatDialogTitle}>Чаты</h3>
        <div className={styles.controls}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onStartNewChat}
            title="Новый чат"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDeleteAllChunks}>
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Удалить все чаты</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ScrollArea className={styles.chunkList}>
        <div className="space-y-1 px-1">
          {chunks.length === 0 ? (
            <div className={styles.emptyState}>
              Нет доступных чатов
            </div>
          ) : (
            chunks.map((chunk) => (
              <div
                key={chunk.id}
                className={`${styles.chunkItem} ${
                  currentChunk?.id === chunk.id
                    ? styles.chunkItemActive
                    : styles.chunkItemInactive
                }`}
              >
                <button
                  className={styles.chunkButton}
                  onClick={() => onSelectChunk(chunk.id)}
                  title={chunk.title}
                >
                  <div className={styles.chunkContent}>
                    <span className={styles.chunkTitle}>{chunk.title || 'Новый чат'}</span>
                  </div>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={styles.deleteButton}
                  onClick={() => onDeleteChunk(chunk.id)}
                  title="Удалить чат"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
