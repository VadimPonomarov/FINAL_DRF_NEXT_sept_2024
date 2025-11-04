/**
 * Types for ChatMessages component
 */
import { Message } from "@/modules/chatbot/chat/chatTypes";
import { MessageContext } from "@/modules/autoria/shared/types/messageContext";

export interface ChatMessagesProps {
  messages: Message[];
  isWaitingForResponse: boolean;
  onCancel: () => void;
  onDeleteMessage?: (messageId: string) => void;
  messageContexts?: Map<string, MessageContext>;
  onThreadClick?: (threadId: string | null) => void;
  activeThread?: string | null;
}
