/**
 * Types for ChatMessages component
 */
import { Message } from "@/utils/chat/chatTypes";
import { MessageContext } from "@/types/messageContext";

export interface ChatMessagesProps {
  messages: Message[];
  isWaitingForResponse: boolean;
  onCancel: () => void;
  onDeleteMessage?: (messageId: string) => void;
  messageContexts?: Map<string, MessageContext>;
  onThreadClick?: (threadId: string | null) => void;
  activeThread?: string | null;
}
