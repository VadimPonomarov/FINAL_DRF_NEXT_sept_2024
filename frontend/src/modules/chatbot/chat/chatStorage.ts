import { ChatChunk, DateEntry, Message } from "@/modules/chatbot/chat/chatTypes";

// Расширенный тип DateEntry с полем chunks
interface DateEntryWithChunks extends DateEntry {
  chunks: string[];
}

// Constants for localStorage
const CHAT_CHUNKS_PREFIX = "chat_chunks_";
const CHAT_DATES_KEY = "chat_dates";
const CHAT_CHUNKS_BY_DATE_PREFIX = "chat_chunks_by_date_";
const LAST_ACTIVE_CHUNK_KEY = "last_active_chunk";

/**
 * Генерирует уникальный идентификатор
 */
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

/**
 * Получает текущую дату в формате YYYY-MM-DD
 */
export const getTodayKey = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

/**
 * Форматирует дату для отображения (DD.MM.YYYY)
 */
export const formatDateForDisplay = (dateStr: string | undefined): string => {
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
};

/**
 * Создает заголовок чанка на основе временного диапазона
 */
export const createChunkTitle = (messages: Message[]): string => {
  if (messages.length === 0) {
    // Для пустого чата используем текущее время
    const now = new Date();
    const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return currentTime;
  }

  // Получаем время начала чата (первое сообщение)
  const firstMessage = messages[0];
  const firstTimestamp = firstMessage.timestamp ? new Date(firstMessage.timestamp) : new Date();
  const startTime = firstTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Получаем время последнего сообщения
  const lastMessage = messages[messages.length - 1];
  const lastTimestamp = lastMessage.timestamp ? new Date(lastMessage.timestamp) : new Date();
  const endTime = lastTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Возвращаем только диапазон времени
  return `${startTime}-${endTime}`;
};

/**
 * Получает список всех доступных дат
 */
export const getAvailableDates = (): string[] => {
  try {
    const datesStr = localStorage.getItem(CHAT_DATES_KEY);
    if (!datesStr) {
      return [];
    }

    const dates: DateEntryWithChunks[] = JSON.parse(datesStr);
    return dates.map(entry => entry.date).sort().reverse(); // Сортируем в обратном порядке (новые даты сверху)
  } catch (error) {
    console.error("Error loading available dates:", error);
    return [];
  }
};

/**
 * Получает список чанков для указанной даты
 */
export const getChunksForDate = (date: string): ChatChunk[] => {
  try {
    const key = `${CHAT_CHUNKS_BY_DATE_PREFIX}${date}`;
    const chunksIdsStr = localStorage.getItem(key);

    if (!chunksIdsStr) {
      return [];
    }

    const chunkIds: string[] = JSON.parse(chunksIdsStr);
    const chunks: ChatChunk[] = [];

    for (const chunkId of chunkIds) {
      const chunk = getChunkById(chunkId); // Используем getChunkById для фильтрации
      if (chunk) {
        chunks.push(chunk);
      }
    }

    // Сортируем чанки по времени последнего обновления (новые сверху)
    return chunks.sort((a, b) =>
      new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    );
  } catch (error) {
    console.error(`Error loading chunks for date ${date}:`, error);
    return [];
  }
};

/**
 * Получает чанк по его ID
 */
export const getChunkById = (chunkId: string): ChatChunk | null => {
  try {
    const chunkStr = localStorage.getItem(`${CHAT_CHUNKS_PREFIX}${chunkId}`);
    if (!chunkStr) {
      return null;
    }

    const chunk: ChatChunk = JSON.parse(chunkStr);

    // Фильтруем дублирующиеся welcome сообщения при загрузке
    const isWelcomeMessage = (msg: Message): boolean => {
      if (!msg) return false;
      const content = (msg.content || msg.message || '').toLowerCase();
      const isSystemMessage = msg.role === 'system' || msg.role === 'assistant';

      return isSystemMessage && (
        content.includes('👋 hello,') ||
        (content.includes('hello,') && content.includes('ready to help')) ||
        content.includes('i\'m ready to help you') ||
        !!content.match(/hello,\s+[\w.@]+!\s+i'm ready to help/i)
      );
    };

    // Удаляем дублирующиеся welcome сообщения, оставляем только первое
    const welcomeMessages = chunk.messages.filter(isWelcomeMessage);
    if (welcomeMessages.length > 1) {
      const firstWelcomeMessage = welcomeMessages[0];
      chunk.messages = chunk.messages.filter((msg: any) => {
        if (isWelcomeMessage(msg)) {
          return msg.id === firstWelcomeMessage.id;
        }
        return true;
      });
    }

    // Убеждаемся, что все сообщения имеют timestamps
    chunk.messages = chunk.messages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp || new Date().toISOString()
    }));

    return chunk;
  } catch (error) {
    console.error(`Error loading chunk ${chunkId}:`, error);
    return null;
  }
};

/**
 * Создает новый чанк
 */
export const createNewChunk = (initialMessages: Message[] = []): ChatChunk => {
  const now = new Date();
  const dateKey = getTodayKey();
  const chunkId = generateId();

  // Добавляем ID и timestamp к сообщениям, если их нет
  const messagesWithIds = initialMessages.map(msg => ({
    ...msg,
    id: msg.id || generateId(),
    timestamp: msg.timestamp || now.toISOString()
  }));

  const newChunk: ChatChunk = {
    id: chunkId,
    title: createChunkTitle(messagesWithIds) || "Новый чат",
    date: dateKey,
    lastUpdated: now.toISOString(),
    messages: messagesWithIds,
    preview: messagesWithIds.length > 0
      ? (messagesWithIds[0].content || messagesWithIds[0].message || "").substring(0, 50)
      : "Новый чат"
  };

  // Сохраняем чанк
  saveChunk(newChunk);

  // Добавляем чанк к списку чанков для текущей даты
  addChunkToDate(chunkId, dateKey);

  return newChunk;
};

/**
 * Сохраняет чанк в localStorage
 */
export const saveChunk = (chunk: ChatChunk): void => {
  try {
    // Обновляем время последнего обновления
    chunk.lastUpdated = new Date().toISOString();

    // Функция для проверки welcome сообщений
    const isWelcomeMessage = (msg: Message): boolean => {
      if (!msg) return false;
      const content = (msg.content || msg.message || '').toLowerCase();
      const isSystemMessage = msg.role === 'system' || msg.role === 'assistant';

      return isSystemMessage && (
        content.includes('👋 hello,') ||
        (content.includes('hello,') && content.includes('ready to help')) ||
        content.includes('i\'m ready to help you') ||
        !!content.match(/hello,\s+[\w.@]+!\s+i'm ready to help/i)
      );
    };

    // Фильтруем дублирующиеся welcome сообщения
    const welcomeMessages = chunk.messages.filter(isWelcomeMessage);
    console.log(`Found ${welcomeMessages.length} welcome messages in chunk`);

    // Фильтруем приветственные сообщения о загрузке истории
    const historyGreetingMessages = chunk.messages.filter((msg: any) => {
      const msgContent = msg.content || msg.message || "";
      return msg.role === 'assistant' && msgContent.includes('Я загрузил историю чата');
    });

    console.log(`Found ${historyGreetingMessages.length} history greeting messages in chunk`);

    // Начинаем с исходных сообщений
    let filteredMessages = [...chunk.messages];

    // Удаляем дублирующиеся welcome сообщения, оставляем только первое
    if (welcomeMessages.length > 1) {
      const firstWelcomeMessage = welcomeMessages[0];
      console.log(`Keeping first welcome message ID: ${firstWelcomeMessage.id}`);

      filteredMessages = filteredMessages.filter((msg: any) => {
        if (isWelcomeMessage(msg)) {
          return msg.id === firstWelcomeMessage.id;
        }
        return true;
      });

      console.log(`Removed ${welcomeMessages.length - 1} duplicate welcome messages`);
    }

    // Удаляем дублирующиеся приветственные сообщения о загрузке истории, оставляем только последнее
    if (historyGreetingMessages.length > 1) {
      const lastHistoryGreeting = historyGreetingMessages[historyGreetingMessages.length - 1];
      console.log(`Keeping last history greeting ID: ${lastHistoryGreeting.id}`);

      filteredMessages = filteredMessages.filter((msg: any) => {
        const msgContent = msg.content || msg.message || "";
        const isHistoryGreeting = msg.role === 'assistant' && msgContent.includes('Я загрузил историю чата');

        if (isHistoryGreeting) {
          return msg.id === lastHistoryGreeting.id;
        }
        return true;
      });

      console.log(`Removed ${historyGreetingMessages.length - 1} duplicate history greeting messages`);
    }

    // Обновляем сообщения в чанке
    chunk.messages = filteredMessages;

    // Обновляем заголовок и превью, если есть сообщения
    if (chunk.messages.length > 0) {
      chunk.title = createChunkTitle(chunk.messages);
      const firstMessage = chunk.messages[0];
      chunk.preview = (firstMessage.content || firstMessage.message || "").substring(0, 50);
    }

    // Сохраняем чанк
    localStorage.setItem(`${CHAT_CHUNKS_PREFIX}${chunk.id}`, JSON.stringify(chunk));

    console.log(`Chunk ${chunk.id} saved successfully with ${chunk.messages.length} messages`);
  } catch (error) {
    console.error(`Error saving chunk ${chunk.id}:`, error);
  }
};

/**
 * Добавляет сообщение в чанк
 */
export const addMessageToChunk = (chunkId: string, message: Message): boolean => {
  try {
    const chunk = getChunkById(chunkId);
    if (!chunk) {
      console.error(`Chunk ${chunkId} not found`);
      return false;
    }

    // Добавляем ID и timestamp к сообщению, если их нет
    const messageWithId = {
      ...message,
      id: message.id || generateId(),
      timestamp: message.timestamp || new Date().toISOString()
    };

    // Добавляем сообщение в чанк
    chunk.messages.push(messageWithId);

    // Сохраняем обновленный чанк
    saveChunk(chunk);

    return true;
  } catch (error) {
    console.error(`Error adding message to chunk ${chunkId}:`, error);
    return false;
  }
};

/**
 * Удаляет сообщение из чанка
 */
export const removeMessageFromChunk = (chunkId: string, messageId: string): boolean => {
  try {
    const chunk = getChunkById(chunkId);
    if (!chunk) {
      console.error(`Chunk ${chunkId} not found`);
      return false;
    }

    // Удаляем сообщение из чанка
    chunk.messages = chunk.messages.filter((msg: any) => msg.id !== messageId);

    // Сохраняем обновленный чанк
    saveChunk(chunk);

    return true;
  } catch (error) {
    console.error(`Error removing message from chunk ${chunkId}:`, error);
    return false;
  }
};

/**
 * Добавляет чанк к списку чанков для указанной даты
 */
export const addChunkToDate = (chunkId: string, dateKey: string): void => {
  try {
    // Получаем список всех дат
    const datesStr = localStorage.getItem(CHAT_DATES_KEY);
    let dates: DateEntryWithChunks[] = [];

    if (datesStr) {
      dates = JSON.parse(datesStr);
    }

    // Проверяем, есть ли уже такая дата
    let dateEntry = dates.find(entry => entry.date === dateKey);

    if (!dateEntry) {
      // Если даты нет, создаем новую
      dateEntry = {
        date: dateKey,
        label: dateKey, // Добавляем обязательное поле label
        chunks: []
      };
      dates.push(dateEntry);
    }

    // Проверяем, есть ли уже такой чанк
    if (!dateEntry.chunks.includes(chunkId)) {
      dateEntry.chunks.push(chunkId);
    }

    // Сохраняем обновленный список дат
    localStorage.setItem(CHAT_DATES_KEY, JSON.stringify(dates));

    // Обновляем список чанков для этой даты
    const key = `${CHAT_CHUNKS_BY_DATE_PREFIX}${dateKey}`;
    localStorage.setItem(key, JSON.stringify(dateEntry.chunks));

    console.log(`Chunk ${chunkId} added to date ${dateKey}`);
  } catch (error) {
    console.error(`Error adding chunk ${chunkId} to date ${dateKey}:`, error);
  }
};

/**
 * Удаляет чанк
 */
export const deleteChunk = (chunkId: string): boolean => {
  try {
    // Получаем чанк, чтобы узнать его дату
    const chunk = getChunkById(chunkId);
    if (!chunk) {
      console.error(`Chunk ${chunkId} not found`);
      return false;
    }

    const dateKey = chunk.date;

    // Удаляем чанк из списка чанков для этой даты
    const key = `${CHAT_CHUNKS_BY_DATE_PREFIX}${dateKey}`;
    const chunksIdsStr = localStorage.getItem(key);

    if (chunksIdsStr) {
      let chunkIds: string[] = JSON.parse(chunksIdsStr);
      chunkIds = chunkIds.filter(id => id !== chunkId);

      // Сохраняем обновленный список чанков для этой даты
      localStorage.setItem(key, JSON.stringify(chunkIds));

      // Обновляем список всех дат
      const datesStr = localStorage.getItem(CHAT_DATES_KEY);
      if (datesStr) {
        let dates: DateEntryWithChunks[] = JSON.parse(datesStr);

        // Находим нужную дату
        const dateEntry = dates.find(entry => entry.date === dateKey);
        if (dateEntry) {
          // Удаляем чанк из списка чанков для этой даты
          dateEntry.chunks = dateEntry.chunks.filter(id => id !== chunkId);

          // Если чанков больше нет, удаляем дату
          if (dateEntry.chunks.length === 0) {
            dates = dates.filter(entry => entry.date !== dateKey);
            localStorage.removeItem(key);
          }

          // Сохраняем обновленный список дат
          localStorage.setItem(CHAT_DATES_KEY, JSON.stringify(dates));
        }
      }
    }

    // Удаляем сам чанк
    localStorage.removeItem(`${CHAT_CHUNKS_PREFIX}${chunkId}`);

    console.log(`Chunk ${chunkId} deleted successfully`);
    return true;
  } catch (error) {
    console.error(`Error deleting chunk ${chunkId}:`, error);
    return false;
  }
};

/**
 * Удаляет все чанки для указанной даты
 */
export const deleteAllChunksForDate = (dateKey: string): boolean => {
  try {
    // Получаем список чанков для этой даты
    const key = `${CHAT_CHUNKS_BY_DATE_PREFIX}${dateKey}`;
    const chunksIdsStr = localStorage.getItem(key);

    if (chunksIdsStr) {
      const chunkIds: string[] = JSON.parse(chunksIdsStr);

      // Удаляем все чанки
      for (const chunkId of chunkIds) {
        localStorage.removeItem(`${CHAT_CHUNKS_PREFIX}${chunkId}`);
      }

      // Удаляем список чанков для этой даты
      localStorage.removeItem(key);

      // Обновляем список всех дат
      const datesStr = localStorage.getItem(CHAT_DATES_KEY);
      if (datesStr) {
        let dates: DateEntryWithChunks[] = JSON.parse(datesStr);

        // Удаляем дату из списка
        dates = dates.filter(entry => entry.date !== dateKey);

        // Сохраняем обновленный список дат
        localStorage.setItem(CHAT_DATES_KEY, JSON.stringify(dates));
      }

      console.log(`All chunks for date ${dateKey} deleted successfully`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error deleting all chunks for date ${dateKey}:`, error);
    return false;
  }
};

/**
 * Сохраняет ID последнего активного чата
 */
export const saveLastActiveChunk = (chunkId: string): void => {
  try {
    localStorage.setItem(LAST_ACTIVE_CHUNK_KEY, chunkId);
    console.log(`Saved last active chunk: ${chunkId}`);
  } catch (error) {
    console.error("Error saving last active chunk:", error);
  }
};

/**
 * Получает ID последнего активного чата
 */
export const getLastActiveChunk = (): string | null => {
  try {
    return localStorage.getItem(LAST_ACTIVE_CHUNK_KEY);
  } catch (error) {
    console.error("Error getting last active chunk:", error);
    return null;
  }
};

/**
 * Удаляет всю историю чатов
 */
export const deleteAllChatHistory = (): boolean => {
  try {
    // Получаем список всех дат
    const datesStr = localStorage.getItem(CHAT_DATES_KEY);

    if (datesStr) {
      const dates: DateEntryWithChunks[] = JSON.parse(datesStr);

      // Удаляем все чанки для всех дат
      for (const dateEntry of dates) {
        const key = `${CHAT_CHUNKS_BY_DATE_PREFIX}${dateEntry.date}`;
        const chunksIdsStr = localStorage.getItem(key);

        if (chunksIdsStr) {
          const chunkIds: string[] = JSON.parse(chunksIdsStr);

          // Удаляем все чанки
          for (const chunkId of chunkIds) {
            localStorage.removeItem(`${CHAT_CHUNKS_PREFIX}${chunkId}`);
          }

          // Удаляем список чанков для этой даты
          localStorage.removeItem(key);
        }
      }

      // Удаляем список всех дат
      localStorage.removeItem(CHAT_DATES_KEY);

      // Удаляем информацию о последнем активном чате
      localStorage.removeItem(LAST_ACTIVE_CHUNK_KEY);

      console.log("All chat history deleted successfully");
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error deleting all chat history:", error);
    return false;
  }
};
