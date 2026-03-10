"use client";

import { useRef, useState, useEffect, useMemo } from 'react';
import { chatLogger } from '@/modules/chatbot/chat/logger';
import { ChatMessagesProps } from './types';
import { Message, MessageType } from '@/modules/chatbot/chat/chatTypes';
import { useChatContext } from '../providers/ChatContextProvider';

export const useChatMessagesLogic = (props: ChatMessagesProps) => {
  const { messages } = props;
  const isThinking = false; // Removed useAgentThinking hook

  // Get chat context hooks
  const {
    getMessageContext,
    getThreadInfo,
    getConversationThread
  } = useChatContext();

  // Состояние для активного треда
  const [activeThread, setActiveThread] = useState<string | null>(null);

  // Автоматическая прокрутка вниз при новых сообщениях
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [processedMessageIds] = useState<Set<string>>(new Set());

  // Get message contexts for all messages
  const messageContexts = useMemo(() => {
    // Создаем новый Map для контекстов
    const contexts = new Map();

    // Проверяем, что messages существует и является массивом
    if (!messages || !Array.isArray(messages)) {
      return contexts;
    }

    // Проходим по всем сообщениям
    messages.forEach(message => {
      if (message && message.id) {
        try {
          const context = getMessageContext(message.id);
          // Добавляем контекст в Map, даже если он null
          contexts.set(message.id, context);
        } catch (error) {
          console.error(`Error getting context for message ${message.id}:`, error);
        }
      }
    });
    return contexts;
  }, [messages, getMessageContext]);

  // Handle thread click
  const handleThreadClick = (threadId: string) => {
    setActiveThread(threadId);
    // Get thread messages and highlight them
    const threadMessages = getConversationThread(threadId);
    // We could highlight these messages or scroll to them
  };

  // Function to check if message is a welcome message
  const isWelcomeMessage = (message: Message): boolean => {
    if (!message) return false;

    const content = (message.content || message.message || '').toLowerCase();
    const isSystemMessage = message.role === 'system' || message.sender === 'system';

    return isSystemMessage && (
      content.includes('👋 hello,') ||
      (content.includes('hello,') && content.includes('ready to help')) ||
      content.includes('i\'m ready to help you') ||
      !!content.match(/hello,\s+[\w.@]+!\s+i'm ready to help/i)
    );
  };

  // Function to replace duplicate welcome messages
  const replaceDuplicateWelcomeMessages = (messages: Message[]): Message[] => {
    if (!messages || messages.length === 0) return messages;

    const result: Message[] = [];
    const seenWelcomeMessages = new Set<string>();
    let hasWelcomeMessage = false;

    // Process messages in order
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];

      if (isWelcomeMessage(message)) {
        // Create a unique key for this welcome message
        const welcomeKey = `${message.content || message.message || ''}`.trim();

        // Only add if we haven't seen this welcome message before
        if (!seenWelcomeMessages.has(welcomeKey) && !hasWelcomeMessage) {
          seenWelcomeMessages.add(welcomeKey);
          hasWelcomeMessage = true;

          // Ensure the welcome message has a timestamp
          const welcomeWithTimestamp = {
            ...message,
            timestamp: message.timestamp || new Date().toISOString()
          };
          result.push(welcomeWithTimestamp);
        }
        // Skip duplicate welcome messages
      } else {
        // Ensure all other messages have timestamps
        const messageWithTimestamp = {
          ...message,
          timestamp: message.timestamp || new Date().toISOString()
        };
        result.push(messageWithTimestamp);
      }
    }

    return result;
  };

  // Process messages to remove duplicate welcome messages
  const processedMessages = useMemo(() => {
    return replaceDuplicateWelcomeMessages(messages);
  }, [messages]);

  // Filtered messages based on active thread
  const filteredMessages = useMemo(() => {
    if (!activeThread) return processedMessages;
    return processedMessages.filter(message => {
      const context = message.id ? messageContexts.get(message.id) : null;
      return context?.conversationThread === activeThread;
    });
  }, [processedMessages, activeThread, messageContexts]);

  // Эффект для автоматической прокрутки вниз при новых сообщениях
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    };

    const timeoutId = setTimeout(scrollToBottom, 100);
    scrollToBottom();

    return () => clearTimeout(timeoutId);
  }, [processedMessages]);

  // Эффект для логирования сообщений о дате/времени
  useEffect(() => {
    processedMessages.forEach(msg => {
      if (!msg) return;

      const messageContent = msg.content || msg.message || "";

      if (messageContent && (
        messageContent.includes('Сегодня') ||
        messageContent.includes('Today is') ||
        messageContent.includes('Текущее время') ||
        messageContent.includes('Current time') ||
        messageContent.includes('Ваше местоположение') ||
        messageContent.includes('Your location') ||
        messageContent.includes('[datetime_response]') ||
        messageContent.includes('[location_response]') ||
        messageContent.includes('[agent_processed]')
      )) {
        chatLogger.debug("Datetime message found in messages array", { messageContent });
      }
    });
  }, [processedMessages]);

  // Дополнительный эффект для скролла при изменении размера окна и других событиях
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        console.log("Scrolling to bottom on event");
      }
    };

    window.addEventListener('resize', scrollToBottom);
    window.addEventListener('orientationchange', scrollToBottom);
    window.addEventListener('scroll-chat-to-bottom', scrollToBottom);

    scrollToBottom();

    return () => {
      window.removeEventListener('resize', scrollToBottom);
      window.removeEventListener('orientationchange', scrollToBottom);
      window.removeEventListener('scroll-chat-to-bottom', scrollToBottom);
    };
  }, []);

  return {
    filteredMessages,
    messagesEndRef,
    isThinking,
    processedMessageIds,
    messageContexts,
    handleThreadClick,
    activeThread
  };
};
