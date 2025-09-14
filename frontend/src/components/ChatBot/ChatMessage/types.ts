/**
 * Types for ChatMessage component
 */
import { Message } from '@/utils/chat/chatTypes';
import { MessageContext } from '@/types/messageContext';

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
