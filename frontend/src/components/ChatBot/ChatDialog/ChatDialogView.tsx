"use client";

import React, { useRef, useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Message, ChatChunk } from "@/utils/chat/chatTypes";
import { Bot } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatHeader } from "../ChatHeader";
import { CalendarDateSelector } from "../CalendarDateSelector";
import { ChunkSelector } from "../ChunkSelector";
import { ChatMessages } from "../ChatMessages";
import { ChatInput } from "../ChatInput";
import FloatingScrollButtons from "../FloatingScrollButtons";
import FixedScrollButtons from "../FixedScrollButtons";
import unifiedStyles from '@/components/ChatBot/styles/chatbot-unified.module.css';

interface ChatDialogViewProps {
  messages: Message[];
  inputValue: string;
  isLoading: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  availableDates: string[];
  currentDate: string;
  availableChunks: ChatChunk[];
  currentChunk: ChatChunk | null;
  onSendMessage: () => void;
  onInputChange: (value: React.ChangeEvent<HTMLInputElement> | string) => void;
  onConnect: () => void;
  onCancelTask: () => void;
  onDateChange: (date: string) => void;
  onChunkSelect: (chunkId: string) => void;
  onChunkDelete: (chunkId: string) => void;
  onDeleteAllChunks: () => void;
  onDeleteAllHistory: () => void;
  onNewChat: () => void;
  onDeleteMessage: (messageId: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onTokenRefresh: () => Promise<boolean>;
}

export const ChatDialogView: React.FC<ChatDialogViewProps> = ({
  messages,
  inputValue,
  isLoading,
  isConnected,
  isConnecting,
  connectionError,
  availableDates,
  currentDate,
  availableChunks,
  currentChunk,
  onSendMessage,
  onInputChange,
  onConnect,
  onCancelTask,
  onDateChange,
  onChunkSelect,
  onChunkDelete,
  onDeleteAllChunks,
  onDeleteAllHistory,
  onNewChat,
  onDeleteMessage,
  onKeyDown,
  onTokenRefresh
}) => {
  return (
    <Card className={unifiedStyles.chatDialog}>
      <CardHeader className={unifiedStyles.chatDialogHeader}>
        <div className="flex items-center gap-3">
          <Bot className="h-6 w-6" />
          <div>
            <CardTitle className="text-lg font-semibold">AI Assistant</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {isConnecting
                ? 'Connecting...'
                : isConnected
                  ? 'Connected'
                  : connectionError
                    ? `Connection error: ${connectionError}`
                    : 'Not connected - Click power button to connect'}
            </CardDescription>
          </div>
        </div>
        <div className={unifiedStyles.chatDialogControls}>
          <ChatHeader
            isConnected={isConnected}
            isConnecting={isConnecting}
            onConnect={onConnect}
            onRefreshToken={onTokenRefresh}
            title={currentChunk?.title || 'Chat'}
            onNewChat={onNewChat}
            onDeleteHistory={onDeleteAllHistory}
          />
        </div>
      </CardHeader>

      <CalendarDateSelector
        availableDates={availableDates}
        currentDate={currentDate}
        onDateChange={onDateChange}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 border-r p-2">
          <ChunkSelector
            chunks={availableChunks}
            currentChunk={currentChunk}
            onSelectChunk={onChunkSelect}
            onDeleteChunk={onChunkDelete}
            onStartNewChat={onNewChat}
            onDeleteAllChunks={onDeleteAllChunks}
          />
        </div>

        <CardContent className={unifiedStyles.chatMessages}>
          <div className={unifiedStyles.chatScrollArea}>
            <ScrollArea className="h-full pr-4" id="chat-scroll-area">
              <ChatMessages
                messages={messages}
                isWaitingForResponse={isLoading}
                onCancel={onCancelTask}
                onDeleteMessage={onDeleteMessage}
              />
            </ScrollArea>
          </div>
        </CardContent>
      </div>

      <div className={unifiedStyles.chatInput}>
        <ChatInput
          value={inputValue}
          onChange={onInputChange}
          onSubmit={onSendMessage}
          onKeyDown={onKeyDown}
          disabled={!isConnected}
          isLoading={isLoading}
          onCancel={onCancelTask}
        />
      </div>
      <FixedScrollButtons />
    </Card>
  );
};
