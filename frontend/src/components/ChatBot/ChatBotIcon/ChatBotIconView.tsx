"use client";

import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { ChatDialog } from "../ChatDialog";
import ImprovedResizableWrapper from "@/components/All/ResizableWrapper/ImprovedResizableWrapper";
import SimpleScrollButtons from "../SimpleScrollButtons";
import unifiedStyles from '@/components/ChatBot/styles/chatbot-unified.module.css';

interface ChatBotIconViewProps {
  isOpen: boolean;
  onOpenChat: () => void;
  onCloseChat: () => void;
  onBackdropClick: (e: React.MouseEvent) => void;
  onSaveSize: () => void;
  onAuthError: () => void;
  onResizeStart?: () => void;
  onResizeEnd?: (size: { width: number; height: number }) => void;
  chatState?: any;
}

export const ChatBotIconView: React.FC<ChatBotIconViewProps> = ({
  isOpen,
  onOpenChat,
  // onCloseChat, // Не используется
  onBackdropClick,
  onSaveSize,
  onAuthError,
  onResizeStart,
  onResizeEnd,
  chatState
}) => {
  return (
    <>
      <div className="fixed bottom-6 right-6 z-[9999]">
        <Button
          variant="default"
          size="icon"
          className={`chat-button ${unifiedStyles.chatBotIcon} ${isOpen ? unifiedStyles.hidden : unifiedStyles.visible}`}
          onClick={onOpenChat}
        >
          <MessageCircle className="h-7 w-7 text-primary-foreground" />
        </Button>
      </div>

      {isOpen && (
        <>
          <div
            className={unifiedStyles.chatDialogOverlay}
            onClick={onBackdropClick}
          >
            <ImprovedResizableWrapper
              storageKey="chat-dialog"
              className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col"
              defaultWidth={900}
              defaultHeight={700}
              minWidth={320}
              minHeight={450}
              centered={true}
              resizeTimeout={2000}
              onResizeStart={onResizeStart}
              onResizeEnd={onResizeEnd}
            >
              <ChatDialog onAuthError={onAuthError} useResizableSheet={false} />
            </ImprovedResizableWrapper>
          </div>
          <SimpleScrollButtons />
        </>
      )}
    </>
  );
};
