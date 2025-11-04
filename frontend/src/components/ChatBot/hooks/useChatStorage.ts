"use client";

import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/modules/autoria/shared/hooks/use-toast';
import { Message, ChatChunk } from '@/modules/chatbot/chat/chatTypes';
import {
  getTodayKey,
  getAvailableDates,
  getChunksForDate,
  getChunkById,
  createNewChunk,
  // saveChunk, // Не используется
  addMessageToChunk,
  removeMessageFromChunk,
  deleteChunk,
  deleteAllChunksForDate,
  deleteAllChatHistory,
  saveLastActiveChunk,
  getLastActiveChunk,
  // formatDateForDisplay // Не используется
} from '@/modules/chatbot/chat/chatStorage';
// import { chatLogger } from '@/modules/chatbot/chat/logger'; // Не используется

// Hook для проверки гидратации
const useIsHydrated = () => {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated;
};

/**
 * Custom hook for managing chat storage
 */
export const useChatStorage = () => {
  const [currentDate, setCurrentDate] = useState<string>(getTodayKey());
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableChunks, setAvailableChunks] = useState<ChatChunk[]>([]);
  const [currentChunk, setCurrentChunk] = useState<ChatChunk | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const { toast } = useToast();
  const isHydrated = useIsHydrated();

  // Load available dates on mount
  useEffect(() => {
    const dates = getAvailableDates();
    setAvailableDates(dates);

    // If today's date is not in the list, add it
    const today = getTodayKey();
    if (!dates.includes(today)) {
      setAvailableDates([...dates, today]);
    }
  }, []);

  // Load chunks for current date
  useEffect(() => {
    const chunks = getChunksForDate(currentDate);
    setAvailableChunks(chunks);

    // If there are chunks for the current date, select the most recent one
    if (chunks.length > 0) {
      // Сортируем чанки по времени последнего обновления (от новых к старым)
      const sortedChunks = [...chunks].sort((a, b) => {
        const dateA = new Date(a.lastUpdated || 0).getTime();
        const dateB = new Date(b.lastUpdated || 0).getTime();
        return dateB - dateA; // Сортировка по убыванию (сначала самые новые)
      });

      // Выбираем самый последний чанк (с максимальным временем последнего обновления)
      const mostRecentChunk = sortedChunks[0];
      console.log(`Selected most recent chunk for date ${currentDate}: ${mostRecentChunk.id} (last updated: ${mostRecentChunk.lastUpdated})`);

      // Сохраняем этот чанк как последний активный
      saveLastActiveChunk(mostRecentChunk.id);

      setCurrentChunk(mostRecentChunk);

      // Debug: log message timestamps
      console.log('Loading most recent chunk messages with timestamps:', mostRecentChunk.messages.map(msg => ({
        id: msg.id,
        content: (msg.content || msg.message || '').substring(0, 50),
        timestamp: msg.timestamp
      })));

      setMessages(mostRecentChunk.messages);
    } else {
      // Don't create a new chunk automatically
      setCurrentChunk(null);
      setMessages([]);
    }
  }, [currentDate]);

  // Load last active chunk on initialization
  useEffect(() => {
    // Get the last active chunk ID
    const lastActiveChunkId = getLastActiveChunk();
    console.log('Last active chunk ID from localStorage:', lastActiveChunkId);

    if (lastActiveChunkId) {
      // Try to get the chunk by ID
      const lastActiveChunk = getChunkById(lastActiveChunkId);
      console.log('Last active chunk from storage:', lastActiveChunk);

      if (lastActiveChunk) {
        console.log(`Loading last active chunk: ${lastActiveChunkId}`);

        // If the chunk's date is different from the current date, update it
        if (lastActiveChunk.date !== currentDate) {
          setCurrentDate(lastActiveChunk.date);
        }

        // Set the current chunk and messages
        setCurrentChunk(lastActiveChunk);

        // Debug: log message timestamps
        console.log('Loading messages with timestamps:', lastActiveChunk.messages.map(msg => ({
          id: msg.id,
          content: (msg.content || msg.message || '').substring(0, 50),
          timestamp: msg.timestamp
        })));

        setMessages(lastActiveChunk.messages);

        // Update available chunks for the chunk's date
        const chunksForDate = getChunksForDate(lastActiveChunk.date);
        setAvailableChunks(chunksForDate);

        // Dispatch event to notify other components that the last active chunk has been loaded
        window.dispatchEvent(new CustomEvent('last-active-chunk-loaded', {
          detail: { chunkId: lastActiveChunk.id }
        }));
      }
    }
  }, []); // Empty dependency array means this runs only once on mount

  // Function to change the current date
  const changeDate = useCallback((date: string) => {
    // Убедимся, что дата в формате YYYY-MM-DD
    let formattedDate = date;

    // Если дата не в формате YYYY-MM-DD, преобразуем ее
    if (date && !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      try {
        const dateObj = new Date(date);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        formattedDate = `${year}-${month}-${day}`;
        console.log(`Formatted date from ${date} to ${formattedDate}`);
      } catch (error) {
        console.error('Error formatting date:', error);
      }
    }

    console.log(`Changing date to ${formattedDate}. This will trigger loading the most recent chunk for this date.`);

    // Сохраняем последнюю активную дату в localStorage (только после гидратации)
    if (isHydrated) {
      try {
        localStorage.setItem('lastActiveDate', formattedDate);
        console.log('Saved last active date to local storage:', formattedDate);
      } catch (error) {
        console.error('Error saving last active date:', error);
      }
    }

    // Изменяем текущую дату, что вызовет эффект загрузки чанков для этой даты
    setCurrentDate(formattedDate);

    // Диспетчеризуем событие изменения даты
    window.dispatchEvent(new Event('date-changed'));
  }, [isHydrated]);

  // Function to format date for display (YYYY-MM-DD -> DD.MM.YYYY)
  const formatDate = useCallback((dateStr: string | undefined): string => {
    if (!dateStr) {
      console.warn("Attempted to format undefined date");
      return "Invalid date";
    }

    try {
      const parts = dateStr.split('-');
      if (parts.length !== 3) {
        console.warn(`Invalid date format: ${dateStr}`);
        return dateStr; // Return original string if it's not in expected format
      }

      const [year, month, day] = parts;
      return `${day}.${month}.${year}`;
    } catch (error) {
      console.error("Error formatting date", error);
      return dateStr || "Invalid date"; // Return original string or fallback
    }
  }, []);

  // Function to create a new chunk
  const createChunk = useCallback((initialMessages: Message[] = []): ChatChunk => {
    // Получаем текущую дату
    const todayKey = getTodayKey();

    // Если текущая дата отличается от сегодняшней, меняем ее
    if (currentDate !== todayKey) {
      console.log(`Changing date from ${currentDate} to today's date ${todayKey} for new chunk`);
      setCurrentDate(todayKey);

      // Сохраняем последнюю активную дату в localStorage (только после гидратации)
      if (isHydrated) {
        try {
          localStorage.setItem('lastActiveDate', todayKey);
          console.log('Saved last active date to local storage:', todayKey);
        } catch (error) {
          console.error('Error saving last active date:', error);
        }
      }

      // Диспетчеризуем событие изменения даты
      window.dispatchEvent(new Event('date-changed'));

      // Загружаем чанки для новой даты
      const chunks = getChunksForDate(todayKey);
      setAvailableChunks(chunks);
    }

    // Создаем новый чанк
    const newChunk = createNewChunk(initialMessages);

    // Save this as the last active chunk
    saveLastActiveChunk(newChunk.id);

    setCurrentChunk(newChunk);
    setMessages(newChunk.messages);

    // Update available chunks
    setAvailableChunks(prev => [newChunk, ...prev]);

    return newChunk;
  }, [currentDate, isHydrated]);

  // Function to select a chunk
  const selectChunk = useCallback((chunkId: string) => {
    const chunk = getChunkById(chunkId);
    if (chunk) {
      console.log(`Selecting chunk ${chunkId} with ${chunk.messages.length} messages`);

      // Save this as the last active chunk
      saveLastActiveChunk(chunkId);

      setCurrentChunk(chunk);
      setMessages(chunk.messages);

      // If the chunk's date is different from the current date, update it
      if (chunk.date !== currentDate) {
        setCurrentDate(chunk.date);
      }
    } else {
      console.error(`Chunk ${chunkId} not found`);
      toast({
        title: "Error",
        description: "Could not find the selected chat",
        variant: "destructive",
        duration: 3000
      });
    }
  }, [currentDate, toast]);

  // Function to add a message to the current chunk
  const addMessage = useCallback((message: Message) => {
    // Фильтруем системные сообщения
    if (message.type === 'system_message') {
      console.warn("Skipping system message:", message);
      return;
    }

    // Фильтруем сообщения по содержимому
    const messageContent = message.content || message.message || "";
    if (messageContent.includes('Connected to chat server') ||
        messageContent.includes('Connection established') ||
        messageContent.includes('User has joined') ||
        messageContent.includes('User has left') ||
        messageContent.includes('Connection closed') ||
        messageContent.includes('Обрабатываю ваш запрос') ||
        message.user_name === 'System') {
      console.warn("Skipping system-like message:", messageContent);
      return;
    }

    // Никакой дополнительной фильтрации сообщений
    if (!currentChunk) {
      // Only create a new chunk if this is a user message
      if (message.role === 'user') {
        console.warn("No current chunk, creating a new one for user message...");

        // Create a new chunk
        const newChunk = createNewChunk();
        setCurrentChunk(newChunk);
        setMessages(newChunk.messages);
        setAvailableChunks(prev => [newChunk, ...prev]);

        // Add message to the new chunk
        const success = addMessageToChunk(newChunk.id, message);

        if (success) {
          // Update the new chunk
          const updatedChunk = getChunkById(newChunk.id);
          if (updatedChunk) {
            setCurrentChunk(updatedChunk);
            setMessages(updatedChunk.messages);
          }
        }
      } else {
        console.warn("No current chunk and not a user message, skipping...");
      }
      return;
    }

    // Add message to the chunk
    const success = addMessageToChunk(currentChunk.id, message);

    if (success) {
      // Update the current chunk
      const updatedChunk = getChunkById(currentChunk.id);
      if (updatedChunk) {
        setCurrentChunk(updatedChunk);
        setMessages(updatedChunk.messages);

        // Update the chunk in the available chunks list
        setAvailableChunks(prev =>
          prev.map(chunk => chunk.id === updatedChunk.id ? updatedChunk : chunk)
        );
      }
    }
  }, [currentChunk]);

  // Function to delete a message from the current chunk
  const deleteMessage = useCallback((messageId: string) => {
    if (!currentChunk) {
      console.error("Cannot delete message: no current chunk");
      return;
    }

    // Remove message from the chunk
    const success = removeMessageFromChunk(currentChunk.id, messageId);

    if (success) {
      // Update the current chunk
      const updatedChunk = getChunkById(currentChunk.id);
      if (updatedChunk) {
        setCurrentChunk(updatedChunk);
        setMessages(updatedChunk.messages);

        // Update the chunk in the available chunks list
        setAvailableChunks(prev =>
          prev.map(chunk => chunk.id === updatedChunk.id ? updatedChunk : chunk)
        );

        toast({
          title: "Message deleted",
          description: "The message was successfully deleted",
          duration: 3000
        });
      }
    }
  }, [currentChunk, toast]);

  // Function to delete the current chunk
  const deleteCurrentChunk = useCallback(() => {
    if (!currentChunk) {
      console.error("Cannot delete chunk: no current chunk");
      return;
    }

    const chunkId = currentChunk.id;

    // Delete the chunk
    const success = deleteChunk(chunkId);

    if (success) {
      // Update available chunks
      const updatedChunks = availableChunks.filter(chunk => chunk.id !== chunkId);
      setAvailableChunks(updatedChunks);

      // If there are other chunks, select the first one, otherwise set current chunk to null
      if (updatedChunks.length > 0) {
        setCurrentChunk(updatedChunks[0]);
        setMessages(updatedChunks[0].messages);
      } else {
        // Don't create a new chunk automatically
        setCurrentChunk(null);
        setMessages([]);
      }

      toast({
        title: "Chat deleted",
        description: "The chat was successfully deleted",
        duration: 3000
      });
    }
  }, [currentChunk, availableChunks, toast]);

  // Function to delete all chunks for the current date
  const deleteAllChunksForCurrentDate = useCallback(() => {
    // Delete all chunks for the current date
    const success = deleteAllChunksForDate(currentDate);

    if (success) {
      // Don't create a new chunk automatically
      setCurrentChunk(null);
      setMessages([]);
      setAvailableChunks([]);

      toast({
        title: "All chats deleted",
        description: `All chats for ${formatDate(currentDate)} were deleted`,
        duration: 3000
      });
    }
  }, [currentDate, formatDate, toast]);

  // Function to delete all chat history
  const deleteAllHistory = useCallback(() => {
    // Delete all chat history
    const success = deleteAllChatHistory();

    if (success) {
      // Don't create a new chunk automatically
      setCurrentChunk(null);
      setMessages([]);
      setAvailableChunks([]);
      setAvailableDates([getTodayKey()]);

      toast({
        title: "All history deleted",
        description: "All chat history was deleted",
        duration: 3000
      });
    }
  }, [toast]);

  return {
    currentDate,
    currentChunk,
    availableDates,
    availableChunks,
    messages,
    setMessages,
    changeDate,
    formatDate,
    createChunk,
    selectChunk,
    deleteCurrentChunk,
    addMessage,
    deleteMessage,
    deleteAllChunksForCurrentDate,
    deleteAllHistory
  };
};
