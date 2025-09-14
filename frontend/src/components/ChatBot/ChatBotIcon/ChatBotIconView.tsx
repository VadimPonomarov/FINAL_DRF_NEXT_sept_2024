"use client";

import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { ChatDialog } from "../ChatDialog/index";
import { ResizableChatWrapper } from "../ResizableChatWrapper";
import SimpleScrollButtons from "../SimpleScrollButtons";
import styles from './styles.module.css';

interface ChatBotIconViewProps {
  isOpen: boolean;
  onOpenChat: () => void;
  onCloseChat: () => void;
  onBackdropClick: (e: React.MouseEvent) => void;
  onSaveSize: () => void;
  onAuthError: () => void;
}

export const ChatBotIconView: React.FC<ChatBotIconViewProps> = ({
  isOpen,
  onOpenChat,
  // onCloseChat, // Не используется
  onBackdropClick,
  onSaveSize,
  onAuthError
}) => {
  return (
    <>
      <div className="fixed bottom-6 right-6 z-[9999]">
        <Button
          variant="default"
          size="icon"
          className={`chat-button ${styles.chatButton} ${isOpen ? styles.chatButtonHidden : styles.chatButtonVisible}`}
          onClick={onOpenChat}
        >
          <MessageCircle className="h-7 w-7 text-primary-foreground" />
        </Button>
      </div>

      {isOpen && (
        <>
          <div
            className={styles.chatOverlay}
            onClick={onBackdropClick}
          >
            <ResizableChatWrapper>
              <ChatDialog onAuthError={onAuthError} useResizableSheet={false} />
            </ResizableChatWrapper>
          </div>
          <SimpleScrollButtons />
        </>
      )}
    </>
  );
};
