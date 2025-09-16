"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { X } from "lucide-react";
import { ChatMessage } from "../ChatMessage";
import { ThinkingSkeleton } from "../ThinkingSkeleton";
import { Message, MessageRole } from "@/utils/chat/chatTypes";
import { MessageContext } from "@/types/messageContext";
import unifiedStyles from '@/components/ChatBot/styles/chatbot-unified.module.css';

interface ChatMessagesViewProps {
  messages: Array<Message>;
  isWaitingForResponse: boolean;
  onCancel: () => void;
  onDeleteMessage?: (messageId: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  messageContexts?: Map<string, MessageContext>;
  onThreadClick?: (threadId: string | null) => void;
  activeThread?: string | null;
}

export const ChatMessagesView: React.FC<ChatMessagesViewProps> = ({
  messages,
  isWaitingForResponse,
  onCancel,
  onDeleteMessage,
  messagesEndRef,
  messageContexts,
  onThreadClick,
  activeThread
}) => {
  return (
    <div className={styles.container}>
      {activeThread && (
        <div className="sticky top-0 z-10 bg-background p-2 mb-2 border-b flex items-center justify-between">
          <span>Viewing Thread: {activeThread}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onThreadClick?.(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {messages.length === 0 && (
        <div className={styles.emptyState}>
          <p>No messages yet. Start a conversation!</p>
        </div>
      )}

      {messages.map((message, index) => {
        const messageContext = message.id && messageContexts 
          ? messageContexts.get(message.id) 
          : undefined;
          
        return (
          <ChatMessage
            key={`msg-${message.id || index}`}
            message={message}
            onDelete={onDeleteMessage}
            messageContext={messageContext}
            onThreadClick={onThreadClick}
            showContext={true}
          />
        );
      })}

      {isWaitingForResponse && (
        <ThinkingSkeleton
          timeout={3000}
          showCancelButton={true}
          onCancel={onCancel}
        />
      )}

      <div ref={messagesEndRef} data-chat-messages-end />
    </div>
  );
};
