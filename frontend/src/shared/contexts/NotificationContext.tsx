"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

interface NotificationMessage {
  id: string;
  text: string;
  type: 'info' | 'success' | 'error' | 'warning';
  timestamp: number;
}

interface NotificationContextType {
  message: string | null; // Для обратной совместимости
  messages: NotificationMessage[];
  setNotification: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
  clearNotification: (id?: string) => void;
  clearAllNotifications: () => void;
  // Добавляем setMessage как алиас для setNotification для обратной совместимости
  setMessage: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Время отображения уведомления в миллисекундах
const NOTIFICATION_DURATION = 3000; // Сократили с 5 до 3 секунд
// Время дебаунса в миллисекундах
const DEBOUNCE_DURATION = 300; // Сократили с 500 до 300 мс
// Максимальное количество одновременно отображаемых уведомлений
const MAX_NOTIFICATIONS = 3;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<NotificationMessage[]>([]);
  const [message, setMessage] = useState<string | null>(null); // Для обратной совместимости
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messageCountRef = useRef<Record<string, number>>({});

  // Очищаем все уведомления
  const clearAllNotifications = useCallback(() => {
    setMessages([]);
    setMessage(null);
    messageCountRef.current = {};
  }, []);

  // Очищаем конкретное уведомление по ID
  const clearNotification = useCallback((id?: string) => {
    if (id) {
      setMessages(prev => prev.filter(msg => msg.id !== id));
    } else {
      setMessage(null);
    }
  }, []);

  // Генерируем уникальный ID для уведомления
  const generateId = useCallback(() => {
    return Math.random().toString(36).substring(2, 9);
  }, []);

  // Добавляем новое уведомление с дебаунсом и группировкой
  const setNotification = useCallback((newMessage: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    // Для обратной совместимости
    setMessage(newMessage);

    // Очищаем предыдущий таймер дебаунса
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Устанавливаем новый таймер дебаунса
    debounceTimerRef.current = setTimeout(() => {
      // Проверяем, есть ли уже такое сообщение
      const existingMessageIndex = messages.findIndex(msg => msg.text === newMessage && msg.type === type);

      if (existingMessageIndex >= 0) {
        // Если сообщение уже существует, обновляем его timestamp и увеличиваем счетчик
        const count = (messageCountRef.current[newMessage] || 1) + 1;
        messageCountRef.current[newMessage] = count;

        // Обновляем сообщение с новым timestamp и добавляем счетчик, если > 1
        setMessages(prev => {
          const updatedMessages = [...prev];
          updatedMessages[existingMessageIndex] = {
            ...updatedMessages[existingMessageIndex],
            text: count > 1 ? `${newMessage} (${count})` : newMessage,
            timestamp: Date.now()
          };
          return updatedMessages;
        });
      } else {
        // Если сообщения нет, добавляем новое
        messageCountRef.current[newMessage] = 1;

        // Добавляем новое сообщение и ограничиваем количество
        setMessages(prev => {
          const newMessages = [
            ...prev,
            {
              id: generateId(),
              text: newMessage,
              type,
              timestamp: Date.now()
            }
          ];

          // Ограничиваем количество сообщений
          return newMessages.slice(-MAX_NOTIFICATIONS);
        });
      }
    }, DEBOUNCE_DURATION);
  }, [messages, generateId]);

  // Автоматически удаляем устаревшие уведомления
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setMessages(prev => {
        return prev.filter(msg => now - msg.timestamp < NOTIFICATION_DURATION);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Очищаем таймеры при размонтировании
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Создаем контекст
  const contextValue = {
    message, // Для обратной совместимости
    messages,
    setNotification,
    clearNotification,
    clearAllNotifications,
    // Добавляем setMessage как алиас для setNotification для обратной совместимости
    setMessage: (msg: string) => setNotification(msg, 'info')
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}