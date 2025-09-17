"use client";

import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { ChatInput } from "./ChatInput";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import unifiedStyles from '@/components/ChatBot/styles/chatbot-unified.module.css';
import { Bot, Power, Loader2, X, Trash2, MoreVertical } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useChat } from "./hooks";
import { clientRefreshToken } from '@/app/api/(helpers)/common';
import { ChatMessage } from "./ChatMessage";
import { AssistantResponseSkeleton } from "./AssistantResponseSkeleton";
import { toast } from "@/hooks/use-toast";

import { CalendarDateSelector } from "./CalendarDateSelector";
import { ChunkSelector } from "./ChunkSelector";
import { FileUpload } from "./FileUpload";
import { useI18n } from '@/contexts/I18nContext';
// Удаляем импорт useResizableChat

interface ChatDialogProps {
  onAuthError: () => void;
  useResizableSheet?: boolean; // Флаг, указывающий, используется ли ResizableSheet
}

export const ChatDialog = ({ onAuthError, useResizableSheet = false }: ChatDialogProps) => {
  const { formatDate } = useI18n();

  const {
    // Используем autoConnect=false, чтобы избежать бесконечного цикла
    sendMessage,
    sendFiles,
    cancelCurrentTask,
    inputValue,
    setInputValue,
    isLoading,
    isConnected,
    connect,
    isConnecting,
    isWaitingForAssistantResponse, // Добавляем состояние ожидания ответа ассистента
    isSkeletonHiding, // Добавляем состояние скрытия скелетона
    markMessageAsRendering,
    markMessageAsRendered,
    isMessageRendering,
    availableDates,
    currentDate,
    changeDate,
    createChunk: startNewChat, // Добавляем функцию для создания нового чата
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setMessages: _setMessages, // Kept for future use

    messages, // Kept for future use
    connectionError,
    availableChunks,
    currentChunk,
    selectChunk,
    deleteChunk,
    deleteAllChunks,
    deleteAllHistory,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    createSystemMessage: _createSystemMessage, // Kept for future use
    deleteMessage,
    disconnect,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    messages: _wsMessages // Kept for future use
  } = useChat({ onAuthError, autoConnect: true });

  // Создаем ref для чата
  const chatRef = useRef<HTMLDivElement>(null);

  // Добавляем дебаунсер для предотвращения слишком частых обновлений
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Функция для скролла к концу чата
  const scrollToBottom = useCallback(() => {
    console.log('Scrolling to bottom from ChatDialog');

    // Создаем и диспетчеризуем пользовательское событие для скролла
    window.dispatchEvent(new Event('scroll-chat-to-bottom'));

    // Метод 1: Прямой доступ к элементу viewport
    const chatArea = document.querySelector('#chat-scroll-area > [data-radix-scroll-area-viewport]');
    if (chatArea) {
      console.log('Found chat area, scrolling to bottom');
      chatArea.scrollTop = chatArea.scrollHeight;
    }

    // Метод 2: Поиск через все элементы с атрибутом data-radix-scroll-area-viewport
    const viewports = document.querySelectorAll('[data-radix-scroll-area-viewport]');
    viewports.forEach((viewport) => {
      const element = viewport as HTMLElement;
      element.scrollTop = element.scrollHeight;
    });

    // Метод 3: Скролл к последнему сообщению
    const messagesEnd = document.querySelector('[data-chat-messages-end]');
    if (messagesEnd) {
      messagesEnd.scrollIntoView({ behavior: 'smooth' });
    }

    // Добавляем задержку для гарантии скролла после обновления DOM
    setTimeout(() => {
      if (chatArea) {
        chatArea.scrollTop = chatArea.scrollHeight;
      }

      viewports.forEach((viewport) => {
        const element = viewport as HTMLElement;
        element.scrollTop = element.scrollHeight;
      });

      if (messagesEnd) {
        messagesEnd.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }, []);

  // Флаг для отслеживания начальной загрузки
  const isInitialLoad = useRef(true);

  // Загрузка последней активной даты и чанка при инициализации
  useEffect(() => {
    // Только при первой загрузке
    if (isInitialLoad.current) {
      isInitialLoad.current = false;

      try {
        console.log('Initializing chat with default parameters from localStorage');

        // Загружаем последнюю активную дату
        const lastActiveDate = localStorage.getItem('lastActiveDate');
        const lastActiveChunkId = localStorage.getItem('last_active_chunk');

        console.log(`Last active date: ${lastActiveDate || 'not found'}, last active chunk: ${lastActiveChunkId || 'not found'}`);

        // Если есть последняя активная дата и она отличается от текущей
        if (lastActiveDate && lastActiveDate !== currentDate) {
          console.log(`Loading last active date: ${lastActiveDate}`);

          // Изменяем дату и добавляем обработчик для загрузки чанка после изменения даты
          const onDateChanged = () => {
            // Удаляем обработчик, чтобы он сработал только один раз
            window.removeEventListener('date-changed', onDateChanged);

            // Даем небольшую задержку для загрузки чанков для новой даты
            setTimeout(() => {
              // Если есть последний активный чанк, загружаем его
              if (lastActiveChunkId) {
                console.log(`Loading last active chunk after date change: ${lastActiveChunkId}`);
                window.dispatchEvent(new CustomEvent('load-last-active-chunk', {
                  detail: { chunkId: lastActiveChunkId }
                }));
              }
            }, 300);
          };

          // Добавляем обработчик события изменения даты
          window.addEventListener('date-changed', onDateChanged);

          // Изменяем дату
          changeDate(lastActiveDate);
        } else {
          // Если дата не изменилась или не задана, сразу загружаем чанк
          if (lastActiveChunkId) {
            console.log(`Loading last active chunk directly: ${lastActiveChunkId}`);
            window.dispatchEvent(new CustomEvent('load-last-active-chunk', {
              detail: { chunkId: lastActiveChunkId }
            }));
          }
        }
      } catch (error) {
        console.error('Error loading last active date or chunk:', error);
      }
    }
  }, [currentDate, changeDate]);

  // Автоскроллинг при получении новых сообщений
  useEffect(() => {
    // Если есть сообщения, выполняем скроллинг
    if (messages && messages.length > 0) {
      console.log(`Auto-scrolling after messages update, messages count: ${messages.length}`);
      scrollToBottom();

      // Добавляем задержку для гарантии скролла после обновления DOM
      setTimeout(scrollToBottom, 100);
      setTimeout(scrollToBottom, 500);
    }
  }, [messages, scrollToBottom]);

  // Автоскроллинг при изменении состояния загрузки
  useEffect(() => {
    // Если началась загрузка, скроллим к индикатору загрузки
    if (isLoading) {
      console.log('Auto-scrolling after loading state change to true');
      scrollToBottom();

      // Добавляем задержку для гарантии скролла после обновления DOM
      setTimeout(scrollToBottom, 100);
    }
  }, [isLoading, scrollToBottom]);

  // Функция дебаунсера
  const debounce = useCallback((func: () => void, delay: number) => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      func();
      debounceTimeout.current = null;
    }, delay);
  }, []);

  // Обработчик нажатия клавиш
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (inputValue.trim() && !isLoading) {
      const message = inputValue.trim();
      setInputValue(''); // Clear the input field
      sendMessage(message);
      
      // Scroll to bottom after sending message
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  };

  // Обработчик отправки сообщения
  const handleSendMessage = () => {
    if (inputValue.trim() === '' || !isConnected || isLoading) return;
    sendMessage(inputValue);
    setInputValue(''); // Clear input field after sending message

    // Вызываем скролл после отправки сообщения
    scrollToBottom();

    // Добавляем задержку для гарантии скролла после обновления DOM
    setTimeout(scrollToBottom, 100);
    setTimeout(scrollToBottom, 500);

    // Добавляем задержку для гарантии скролла после обновления DOM
    setTimeout(scrollToBottom, 100);
    setTimeout(scrollToBottom, 500);
  };

  // Обработчик подключения/отключения с автоматическим рефрешем токенов
  const handleConnect = async () => {
    // Используем дебаунсер для предотвращения слишком частых подключений
    debounce(async () => {
      if (isConnected) {
        // Если уже подключены, отключаемся
        disconnect();
        toast({
          title: "Отключено",
          description: "Соединение с чатом закрыто",
          duration: 3000,
        });
      } else {
        // Если не подключены, сначала проверяем и обновляем токены
        console.log('[ChatDialog] Attempting connection with token refresh check...');

        try {
          // Показываем индикатор подготовки к подключению
          toast({
            title: "Подключение...",
            description: "Проверка и обновление токенов аутентификации...",
            duration: 2000,
          });

          // Пытаемся обновить токены перед подключением
          const tokenRefreshResponse = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (tokenRefreshResponse.ok) {
            const refreshData = await tokenRefreshResponse.json();
            console.log('[ChatDialog] Token refresh successful:', {
              success: refreshData.success,
              tokensVerified: refreshData.tokensVerified
            });

            toast({
              title: "Готово к подключению",
              description: "Токены обновлены, подключаемся к чату...",
              duration: 2000,
            });
          } else {
            console.warn('[ChatDialog] Token refresh failed, but attempting connection anyway');
          }
        } catch (error) {
          console.error('[ChatDialog] Error during token refresh:', error);
          // Продолжаем попытку подключения даже при ошибке рефреша
        }

        // Подключаемся к чату
        connect();
      }
    }, 300); // Задержка 300 мс
  };

  // Обработчик ручного обновления токена с двухэтапной индикацией
  const handleManualTokenRefresh = async () => {
    try {
      // ЭТАП 1: Показываем начало процесса обновления
      toast({
        title: "Token Refresh",
        description: "Requesting new tokens from server...",
        duration: 3000,
      });

      // Вызываем API рефреша
      const refreshResponse = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!refreshResponse.ok) {
        throw new Error(`Token refresh failed: ${refreshResponse.status}`);
      }

      const refreshData = await refreshResponse.json();

      if (!refreshData.success) {
        throw new Error('Token refresh was not successful');
      }

      // ЭТАП 2: Проверяем результат сохранения токенов
      if (refreshData.tokensVerified === true) {
        // Токены успешно обновлены и сохранены
        toast({
          title: "✅ Token Refresh Complete",
          description: "Tokens successfully refreshed and verified in storage",
          duration: 4000,
        });

        // Пробуем подключиться снова
        connect();
      } else {
        // Токены обновлены, но есть проблемы с сохранением
        toast({
          title: "⚠️ Token Refresh Warning",
          description: "Tokens refreshed but storage verification failed. Connection may be unstable.",
          duration: 6000,
          variant: "destructive",
        });

        // Все равно пробуем подключиться
        connect();
      }

    } catch (error) {
      console.error("Ошибка при обновлении токена:", error);

      // ЭТАП 2 - НЕУСПЕХ: Полная ошибка обновления
      toast({
        title: "❌ Token Refresh Failed",
        description: "Failed to refresh tokens. Please login again.",
        variant: "destructive",
        duration: 8000,
      });

      onAuthError();
    }
  };

  // Обработчик создания нового чата
  const handleNewChat = () => {
    startNewChat();
  };

  // Обработчик удаления чанка
  const handleDeleteChunk = (chunkId: string) => {
    deleteChunk(chunkId);
  };

  // Обработчик удаления всех чанков
  const handleDeleteAllChunks = () => {
    deleteAllChunks(currentDate);
  };

  // Обработчик удаления всей истории
  const handleDeleteAllHistory = () => {
    deleteAllHistory();
  };

  // Функция для форматирования даты
  const formatDateLocal = (date: string) => {
    try {
      const dateObj = new Date(date);
      return formatDate(dateObj, { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return date;
    }
  };

  // Мемоизированная функция для рендеринга сообщений
  const renderMessages = useMemo(() => {
    // Используем только сообщения из текущего чанка
    const currentMessages = currentChunk?.messages || [];

    // Фильтруем сообщения, чтобы отображать только сообщения пользователя и ассистента
    const filteredMessages = currentMessages.filter(msg => {
      // Пропускаем пустые сообщения
      if (!msg) return false;

      // Проверяем роль сообщения - отображаем только user и assistant
      if (msg.role !== 'user' && msg.role !== 'assistant') return false;

      // Проверяем тип сообщения - фильтруем системные сообщения
      if (msg.type === 'system_message') return false;

      // Проверяем содержимое сообщения
      const messageContent = msg.content || msg.message || "";
      if (!messageContent.trim() && !msg.image_url) return false;

      // Фильтруем системные сообщения о подключении и другие системные сообщения
      if (messageContent.includes('Connected to chat server') ||
          messageContent.includes('Connection established') ||
          messageContent.includes('User has joined') ||
          messageContent.includes('User has left') ||
          messageContent.includes('Connection closed') ||
          messageContent.includes('Обрабатываю ваш запрос') ||
          msg.user_name === 'System') return false;

      return true;
    });

    return filteredMessages.map((msg, index) => {
      // Обновляем сообщение с дополнительными свойствами
      const updatedMsg = {
        ...msg,
        isLastInGroup: index === filteredMessages.length - 1 || filteredMessages[index + 1]?.role !== msg.role,
        isFirstInGroup: index === 0 || filteredMessages[index - 1]?.role !== msg.role,
      };

      // Создаем уникальный ключ, используя ID сообщения, если он есть, или индекс
      // Добавляем timestamp для обеспечения уникальности даже при повторной обработке того же сообщения
      const uniqueKey = msg.id
        ? `dialog-msg-${msg.id}-${index}`
        : `dialog-msg-${index}-${Date.now()}`;

      return (
        <ChatMessage
          key={uniqueKey}
          message={updatedMsg}
          onDelete={deleteMessage}
          markMessageAsRendering={markMessageAsRendering}
          markMessageAsRendered={markMessageAsRendered}
          isMessageRendering={isMessageRendering}
        />
      );
    }).filter(Boolean); // Удаляем null из результата
  }, [currentChunk?.messages, deleteMessage, markMessageAsRendering, markMessageAsRendered, isMessageRendering]);

  // Состояние для отображения боковой панели
  const [sidebarOpen] = React.useState(true);

  // Функция для рендеринга содержимого чата
  const renderChatContent = () => {
    return (
      <>
        <CardHeader
          className="flex flex-col space-y-4 border-b pb-4"
          role="banner"
          aria-label="Chat header"
        >
          {/* Первая строка: Заголовок и основные элементы управления */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Bot className="h-6 w-6 text-foreground flex-shrink-0" />
              <div className="min-w-0">
                <CardTitle className="text-lg font-semibold truncate">AI Assistant</CardTitle>
                <CardDescription className="text-sm text-muted-foreground truncate">
                  {isConnecting
                    ? 'Connecting...'
                    : isConnected
                      ? 'Connected'
                      : connectionError
                        ? `Connection error: ${connectionError}`
                        : 'Not connected - Click power button to connect'}
                </CardDescription>
              </div>
            </div>

            {/* Кнопка подключения - всегда видна */}
            <Button
              onClick={handleConnect}
              variant={isConnected ? "outline" : "default"}
              className="flex items-center gap-2 flex-shrink-0"
              aria-label={isConnected ? "Disconnect from chat" : "Connect to chat"}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Connecting...</span>
                </>
              ) : (
                <>
                  <Power className={`h-4 w-4 ${isConnected ? "text-green-500" : "text-red-500"}`} />
                  <span className="hidden sm:inline">{isConnected ? 'Connected' : 'Connect'}</span>
                </>
              )}
            </Button>
          </div>

          {/* Вторая строка: Дополнительные элементы управления (на мобильных переносятся) */}
          {availableDates.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 justify-start">
              <CalendarDateSelector
                availableDates={availableDates}
                currentDate={currentDate}
                onDateChange={changeDate}
                formatDate={formatDate}
                onDeleteAllDates={handleDeleteAllHistory}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDeleteAllChunks}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Удалить все чаты за {formatDateLocal(currentDate || '')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDeleteAllHistory}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Удалить всю историю</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </CardHeader>

        {/* Добавляем сообщение об ошибке, если есть проблемы с подключением */}
        {!isConnected && !isConnecting && connectionError && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-md m-4">
            <p className="text-sm text-red-600 dark:text-red-400 mb-2">
              {connectionError}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualTokenRefresh}
              className="mx-auto"
            >
              Обновить токен
            </Button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden h-[calc(100vh-200px)]">
          {/* Боковая панель с чанками - на мобильных сверху, на десктопе слева */}
          {sidebarOpen && (
            <div className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r p-2 max-h-48 lg:max-h-none overflow-y-auto lg:overflow-y-visible">
              <ChunkSelector
                chunks={availableChunks}
                currentChunk={currentChunk}
                onSelectChunk={selectChunk}
                onDeleteChunk={handleDeleteChunk}
                onStartNewChat={handleNewChat}
                onDeleteAllChunks={handleDeleteAllChunks}
              />
            </div>
          )}

          {/* Основной контент */}
          <CardContent className="flex-1 p-0 relative z-[50] overflow-hidden min-h-0">
            <ScrollArea className="h-full overflow-auto">
              <div className="p-4">
                <div
                  className="flex flex-col gap-4 relative z-[51]"
                  role="log"
                  aria-label="Chat messages"
                >
                  {renderMessages}
                  {/* Показываем скелетон ответа ассистента, когда ожидаем ответ */}
                  {isWaitingForAssistantResponse && (
                    <div id="assistant-skeleton-container">
                      <AssistantResponseSkeleton
                        avatarUrl="/bot-avatar.png"
                        showCancelButton={true}
                        onCancel={cancelCurrentTask}
                        timeout={40000} // 40 секунд
                        isHiding={isSkeletonHiding} // Передаем состояние скрытия для плавной анимации
                        key={`skeleton-${Date.now()}`} // Добавляем уникальный ключ, чтобы React пересоздавал компонент при каждом новом запросе
                      />
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </div>

        <CardFooter className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-0 p-4">
          <div className="w-full">
            <ChatInput
              value={inputValue}
              onChange={(e) => setInputValue(typeof e === 'string' ? e : e.target.value)}
              onSubmit={handleSubmit}
              onKeyDown={handleKeyDown}
              disabled={!isConnected}
              isLoading={isLoading}
              onCancel={cancelCurrentTask}
              onFilesSelected={sendFiles}
            />
          </div>
        </CardFooter>
      </>
    );
  };

  // Рендерим содержимое чата
  if (useResizableSheet) {
    return renderChatContent();
  }

  // Для использования внутри ResizableChatWrapper
  return (
    <Card
      ref={chatRef}
      className="flex flex-col border-0 p-5 z-[40] transition-all duration-200 overflow-hidden h-full w-full m-2 chatbot-container"
    >
      {renderChatContent()}
    </Card>
  );
};
