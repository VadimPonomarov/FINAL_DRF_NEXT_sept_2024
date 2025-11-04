/**
 * Types for ChatMessage component
 */
import { Message } from '@/modules/chatbot/chat/chatTypes';
import { MessageContext } from '@/modules/autoria/shared/types/messageContext';

export interface ChatMessageProps {
  message: Message;
  messageContext?: MessageContext;
  onDelete?: (messageId: string) => void;
  onThreadClick?: (threadId: string) => void;
  showContext?: boolean;
  markMessageAsRendering?: (messageId: string) => void;
  markMessageAsRendered?: (messageId: string) => void;
  isMessageRendering?: (messageId: string) => boolean;
}
