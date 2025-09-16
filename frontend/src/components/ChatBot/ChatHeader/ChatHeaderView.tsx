"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Bot, Power, Loader2, Plus, Trash2, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

import unifiedStyles from '@/components/ChatBot/styles/chatbot-unified.module.css';

interface ChatHeaderViewProps {
  isConnected: boolean;
  isConnecting: boolean;
  title: string;
  onConnect: () => void;
  onRefreshToken: () => void;
  onNewChat?: () => void;
  onDeleteHistory?: () => void;
}

export const ChatHeaderView: React.FC<ChatHeaderViewProps> = ({
  isConnected,
  isConnecting,
  title,
  onConnect,
  onRefreshToken,
  onNewChat,
  onDeleteHistory
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.titleContainer}>
        <div className={styles.iconContainer}>
          <Bot className="h-6 w-6" />
        </div>
        <div>
          <h2 className={unifiedStyles.chatDialogTitle}>{title}</h2>
          <p className={styles.subtitle}>
            {isConnecting
              ? 'Connecting...'
              : isConnected
                ? 'Connected'
                : 'Not connected - Click Connect button'}
          </p>
        </div>
      </div>
      <div className={styles.controlsContainer}>


        {!isConnected && !isConnecting && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefreshToken}
            className="text-xs"
          >
            Refresh Token
          </Button>
        )}
        <Button
          onClick={onConnect}
          variant={isConnected ? "outline" : "default"}
          className={styles.connectButton}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <Power className={isConnected ? styles.iconGreen : styles.iconRed} />
              <span>{isConnected ? 'Connected' : 'Connect'}</span>
            </>
          )}
        </Button>

        {onNewChat && onDeleteHistory && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onNewChat}>
                <Plus className="mr-2 h-4 w-4" />
                <span>New Chat</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDeleteHistory}>
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete All History</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};
