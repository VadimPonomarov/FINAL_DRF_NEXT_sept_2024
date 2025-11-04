"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/modules/autoria/shared/hooks/use-toast';
import { Message, UseChatProps, UseChatReturn, WebSocketMessage } from "@/modules/chatbot/chat/chatTypes";
import { useChatWebSocket } from "./useChatWebSocket";
import { useChatMessageProcessor } from "./useChatMessageProcessor";
import { useChatStorage } from './useChatStorage';
import { useChatContext } from '../providers/ChatContextProvider';

/**
 * Main chat hook that combines storage, WebSocket, and message processing functionality
 */
export const useChat = ({ onAuthError, autoConnect = true }: UseChatProps = {}): UseChatReturn => {
  // State
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const hasAttemptedConnection = useRef(false);

  // Hooks
  const { toast } = useToast();

  // Chat storage hook
  const {
    currentDate,
    currentChunk,
    availableDates,
    availableChunks,
    messages,
    setMessages: _setMessages, // Kept for future use
    changeDate,
    formatDate,
    createChunk,
    selectChunk: selectStorageChunk,
    deleteCurrentChunk,
    addMessage,
    deleteMessage,
    deleteAllChunksForCurrentDate,
    deleteAllHistory
  } = useChatStorage();

  // Message processor hook
  const {
    processMessage,
    processMessages,
    filterMessages,
    createUserMessage,
    createSystemMessage: _createSystemMessage, // Kept for future use
    isProcessed,
    markAsProcessed,
    clearProcessedMessages
  } = useChatMessageProcessor();
  // Chat context hook
  const {
    addMessage: addMessageContext,
    getMessageContext,
    getThreadInfo,
    getRelatedMessages,
    getConversationThread,
    getContextWindow
  } = useChatContext();

  // State for tracking when we're waiting for assistant response
  const [isWaitingForAssistantResponse, setIsWaitingForAssistantResponse] = useState(false);

  // State for tracking message rendering status
  const [renderingMessages, setRenderingMessages] = useState<Set<string>>(new Set());
  const [lastAssistantMessageId, setLastAssistantMessageId] = useState<string | null>(null);
  const [isSkeletonHiding, setIsSkeletonHiding] = useState(false);



  // Functions for managing message rendering state
  const markMessageAsRendering = useCallback((messageId: string) => {
    setRenderingMessages(prev => new Set(prev).add(messageId));
  }, []);

  const markMessageAsRendered = useCallback((messageId: string) => {
    setRenderingMessages(prev => {
      const newSet = new Set(prev);
      newSet.delete(messageId);
      return newSet;
    });

    // If this is the last assistant message and it's fully rendered, start hiding skeleton
    if (messageId === lastAssistantMessageId && isWaitingForAssistantResponse) {
      console.log('[useChat] Last assistant message fully rendered - starting skeleton hide transition');

      // Начинаем плавное скрытие скелетона
      setIsSkeletonHiding(true);

      // Полностью скрываем скелетон через время анимации
      setTimeout(() => {
        setIsWaitingForAssistantResponse(false);
        setIsSkeletonHiding(false);
        clearTimeout((window as any).skeletonTimeout);
        console.log('[useChat] Skeleton fully hidden');
      }, 500); // Время должно совпадать с длительностью CSS анимации
    }
  }, [lastAssistantMessageId, isWaitingForAssistantResponse]);

  const isMessageRendering = useCallback((messageId: string) => {
    return renderingMessages.has(messageId);
  }, [renderingMessages]);

  // WebSocket hook
  const {
    isConnected,
    isConnecting,
    isWaitingForResponse,
    connect: wsConnect,
    disconnect: wsDisconnect,
    sendMessage: wsSendMessage,
    sendFiles: wsSendFiles,
    sendChatHistory: wsSendChatHistory,
    cancelCurrentTask,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    messages: _wsMessages // Kept for future use
  } = useChatWebSocket({
    channelId: currentChunk?.id || "default",
    onAuthError,
    // Мы больше не будем использовать onResponseEnd для скрытия скелетона
    // Вместо этого мы будем отслеживать получение полного ответа в другом месте
    onMessageReceived: (message) => {
      // Process incoming WebSocket messages
      const processedMsg = processMessage(message, currentChunk?.id);
      if (processedMsg && !isProcessed(processedMsg)) {
        // Only add messages that belong to the current chunk
        if (!processedMsg.chunk_id || processedMsg.chunk_id === currentChunk?.id) {
          markAsProcessed(processedMsg);

          // Update context tracking
          addMessageContext(processedMsg as any);

          // Get message context
          const context = getMessageContext(processedMsg.id || '');
          if (context) {
            // Extend the message with context info
            (processedMsg as any).thread = context.conversationThread;
            if (context.references.length > 0) {
              (processedMsg as any).inReplyTo = context.references[0];
              (processedMsg as any).references = context.references;
            }
          }

          // Отслеживаем получение сообщений от ассистента
          if (processedMsg.role === 'assistant') {
            console.log('[useChat] Received assistant message at', new Date().toISOString());

            // Проверяем, является ли это финальным сообщением (содержит полный ответ)
            const isFinalMessage = processedMsg.type === 'message' &&
                                 processedMsg.message &&
                                 processedMsg.message.trim().length > 0;

            // Проверяем, есть ли ошибка
            const hasError = processedMsg.type === 'error' ||
                           (processedMsg.message && processedMsg.message.toLowerCase().includes('ошибка'));

            if (isFinalMessage || hasError) {
              console.log('[useChat] Final assistant message or error received');

              // Отмечаем это сообщение как последнее от ассистента
              if (processedMsg.id) {
                setLastAssistantMessageId(processedMsg.id);
                // Отмечаем сообщение как рендерящееся
                markMessageAsRendering(processedMsg.id);
              }

              // Очищаем таймаут скелетона
              clearTimeout((window as any).skeletonTimeout);

              // НЕ скрываем скелетон здесь - он скроется когда сообщение полностью отрендерится
            } else {
              console.log('[useChat] Partial assistant message - keeping skeleton visible');
            }
          }

          // Логируем получение response_end и скрываем скелетон
          if (processedMsg.type === 'response_end') {
            console.log('[useChat] Received response_end at', new Date().toISOString());
            // ГАРАНТИРОВАННО скрываем скелетон при завершении ответа
            console.log('[useChat] Hiding skeleton on response_end');
            clearTimeout((window as any).skeletonTimeout);
            setIsWaitingForAssistantResponse(false);
          }

          // Дополнительная проверка для скрытия скелетона при ошибках
          if (processedMsg.type === 'error' || processedMsg.type === 'connection_error') {
            console.log('[useChat] Error received - hiding skeleton');
            clearTimeout((window as any).skeletonTimeout);
            setIsWaitingForAssistantResponse(false);
          }

          // Add message to chunk
          addMessage(processedMsg);
          console.log(`Added message to chunk ${currentChunk?.id}:`, processedMsg);

          // Проверяем, нужно ли скрыть скелетон на основе истории после добавления сообщения
          if (processedMsg.role === 'assistant' && isWaitingForAssistantResponse) {
            console.log('[useChat] Assistant message added - checking if skeleton should be hidden based on history');

            // Небольшая задержка для обновления истории сообщений
            setTimeout(() => {
              if (shouldHideSkeletonBasedOnHistory()) {
                console.log('[useChat] Hiding skeleton due to assistant message in history');
                setIsSkeletonHiding(true);

                setTimeout(() => {
                  setIsWaitingForAssistantResponse(false);
                  setIsSkeletonHiding(false);
                  clearTimeout((window as any).skeletonTimeout);
                  console.log('[useChat] Skeleton hidden based on history');
                }, 500);
              }
            }, 100);
          }

          // Get context window for better understanding
          const contextWindow = getContextWindow(processedMsg.id || '', 5);
          console.log('Message context window:', contextWindow);

          // Автоматический скролл при получении нового сообщения
          const scrollToBottom = () => {
            console.log('Auto-scrolling after receiving message');

            // Создаем и диспетчеризуем пользовательское событие для скролла
            window.dispatchEvent(new Event('scroll-chat-to-bottom'));

            // Для надежности также используем прямой скролл
            const messagesEnd = document.querySelector('[data-chat-messages-end]');
            if (messagesEnd) {
              messagesEnd.scrollIntoView({ behavior: 'smooth' });
            }

            // Дополнительный способ скролла для надежности
            const scrollArea = document.querySelector('#chat-scroll-area > [data-radix-scroll-area-viewport]');
            if (scrollArea) {
              scrollArea.scrollTop = scrollArea.scrollHeight;
            }
          };

          // Вызываем скролл сразу и с небольшой задержкой для надежности
          scrollToBottom();
          setTimeout(scrollToBottom, 100);
          setTimeout(scrollToBottom, 500);
        } else {
          console.log(`Skipping message for chunk ${processedMsg.chunk_id}, current chunk is ${currentChunk?.id}`);
        }
      }
    }
  });

  // Auto-connect to WebSocket when the component mounts
  useEffect(() => {
    if (autoConnect && !isConnected && !isConnecting && !hasAttemptedConnection.current && currentChunk?.id) {
      console.log("Auto-connecting to WebSocket...");
      // Подключаемся к WebSocket с флагом isNewChat=false, чтобы не отправлять приветственное сообщение
      wsConnect(currentChunk.id, false); // false означает, что это не новый чат
      hasAttemptedConnection.current = true;
    }
  }, [autoConnect, isConnected, isConnecting, wsConnect, currentChunk]);

  // Disconnect only when the component unmounts
  useEffect(() => {
    return () => {
      if (isConnected) {
        console.log("Disconnecting from WebSocket on unmount...");
        wsDisconnect();
      }
    };
  }, [isConnected, wsDisconnect]);

  // Auto-connect when entering a chat with history chunk and disconnect when leaving
  const previousChunkRef = useRef<string | null>(null);
  useEffect(() => {
    // If current chunk changed and we have a chunk
    if (currentChunk?.id && previousChunkRef.current !== currentChunk.id) {
      // If we're coming from another chunk, disconnect first
      if (previousChunkRef.current && isConnected) {
        console.log(`Disconnecting from previous chunk ${previousChunkRef.current}...`);
        wsDisconnect();
      }

      // Only connect if we have a valid chunk and not already connecting
      if (currentChunk.id && !isConnecting && !isConnected) {
        console.log(`Auto-connecting to chunk ${currentChunk.id}...`);
        wsConnect(currentChunk.id, false); // false означает, что это не новый чат
      }

      // Update the previous chunk ref
      previousChunkRef.current = currentChunk.id;
    }
  }, [currentChunk, wsConnect, wsDisconnect, isConnected, isConnecting]);

  // Listen for history-loaded event and ensure connection is established
  useEffect(() => {
    const handleHistoryLoaded = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log(`History loaded event received with ${customEvent.detail?.count} messages`);

      // Проверяем, нужно ли скрыть скелетон после загрузки истории
      if (isWaitingForAssistantResponse && shouldHideSkeletonBasedOnHistory()) {
        console.log('[useChat] Hiding skeleton after history loaded - last message is from assistant');
        setIsSkeletonHiding(true);

        setTimeout(() => {
          setIsWaitingForAssistantResponse(false);
          setIsSkeletonHiding(false);
          clearTimeout((window as any).skeletonTimeout);
        }, 500);
      }

      // Ensure we're connected to the current chunk only if we have a valid chunk
      if (currentChunk?.id && !isConnected && !isConnecting) {
        console.log(`Auto-connecting after history loaded for chunk ${currentChunk.id}...`);
        wsConnect(currentChunk.id, false); // false означает, что это не новый чат
      } else {
        console.log(`Not auto-connecting after history loaded: no current chunk or already connected/connecting`);
      }
    };

    // Add event listener
    window.addEventListener('history-loaded', handleHistoryLoaded);

    // Clean up
    return () => {
      window.removeEventListener('history-loaded', handleHistoryLoaded);
    };
  }, [currentChunk, isConnected, isConnecting, wsConnect]);

  // Function to filter messages by current chunk
  const getCurrentChunkMessages = useCallback(() => {
    return filterMessages(messages, currentChunk?.id);
  }, [filterMessages, messages, currentChunk]);

  // Function to check if skeleton should be hidden based on chat history
  const shouldHideSkeletonBasedOnHistory = useCallback(() => {
    const currentMessages = getCurrentChunkMessages();
    if (currentMessages.length === 0) return false;

    // Получаем последнее сообщение
    const lastMessage = currentMessages[currentMessages.length - 1];

    // Скелетон должен скрываться только при получении финального ответа от ассистента
    // Не скрываем при ошибках, промежуточных сообщениях или системных сообщениях
    const shouldHide = lastMessage.role === 'assistant' &&
                      lastMessage.type !== 'error' &&
                      lastMessage.type !== 'connection_error' &&
                      lastMessage.type !== 'system_message' &&
                      !lastMessage.message?.includes('Запрос занял слишком много времени') &&
                      !lastMessage.message?.includes('An error occurred') &&
                      lastMessage.message?.trim().length > 0;

    if (shouldHide) {
      console.log('[useChat] shouldHideSkeletonBasedOnHistory: true - last message is a valid assistant response');
    } else if (lastMessage.role === 'assistant') {
      console.log('[useChat] shouldHideSkeletonBasedOnHistory: false - assistant message but not final response (error/system/empty)');
    }

    return shouldHide;
  }, [getCurrentChunkMessages]);

  // Effect to automatically hide skeleton when assistant message appears in history
  useEffect(() => {
    if (isWaitingForAssistantResponse && shouldHideSkeletonBasedOnHistory()) {
      console.log('[useChat] Auto-hiding skeleton based on chat history');

      // Начинаем плавное скрытие скелетона
      setIsSkeletonHiding(true);

      // Полностью скрываем скелетон через время анимации
      setTimeout(() => {
        setIsWaitingForAssistantResponse(false);
        setIsSkeletonHiding(false);
        clearTimeout((window as any).skeletonTimeout);
        console.log('[useChat] Skeleton auto-hidden based on history');
      }, 500);
    }
  }, [isWaitingForAssistantResponse, shouldHideSkeletonBasedOnHistory]);

  // Function to send a system message
  const sendSystemMessage = useCallback((message: Message) => {
    // Add chunk_id if it doesn't exist
    if (currentChunk && !message.chunk_id) {
      message.chunk_id = currentChunk.id;
    }

    // Add message to the list
    addMessage(message);
  }, [addMessage, currentChunk]);

  // Function to send a message
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

    try {
      setIsLoading(true);

      // Очищаем таймер скрытия скелетона
      clearTimeout((window as any).hideSkeletonTimer);

      // Reset skeleton states
      setIsSkeletonHiding(false);
      setLastAssistantMessageId(null);
      setRenderingMessages(new Set());

      // Set waiting for assistant response to true
      setIsWaitingForAssistantResponse(true);

      // Устанавливаем таймаут для скелетона (60 секунд)
      clearTimeout((window as any).skeletonTimeout);
      (window as any).skeletonTimeout = setTimeout(() => {
        console.log('[useChat] Skeleton timeout (60s) - hiding skeleton');
        setIsWaitingForAssistantResponse(false);
      }, 60000);

      // Create and add user message
      const userMessage = createUserMessage(message, currentChunk?.id);
      addMessage(userMessage);

      // Clear processed messages before sending new message
      clearProcessedMessages();

      // Send message via WebSocket
      await wsSendMessage(message);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
        duration: 3000
      });
      // Reset waiting state on error
      setIsWaitingForAssistantResponse(false);
    } finally {
      setIsLoading(false);
      // Note: We don't reset isWaitingForAssistantResponse here because we're still waiting for the assistant's response
    }
  }, [createUserMessage, addMessage, clearProcessedMessages, wsSendMessage, currentChunk, toast, setIsWaitingForAssistantResponse]);

  // Function to send files
  const sendFiles = useCallback(async (files: File[], message: string = '') => {
    try {
      setIsLoading(true);

      // Очищаем таймер скрытия скелетона
      clearTimeout((window as any).hideSkeletonTimer);

      // Reset skeleton states
      setIsSkeletonHiding(false);
      setLastAssistantMessageId(null);
      setRenderingMessages(new Set());

      // Set waiting for assistant response to true
      setIsWaitingForAssistantResponse(true);

      // Устанавливаем таймаут для скелетона (60 секунд)
      clearTimeout((window as any).skeletonTimeout);
      (window as any).skeletonTimeout = setTimeout(() => {
        console.log('[useChat] Skeleton timeout (60s) - hiding skeleton');
        setIsWaitingForAssistantResponse(false);
      }, 60000);

      // Clear processed messages before sending files
      clearProcessedMessages();

      // Send files via WebSocket
      await wsSendFiles(files, message);

      // Скроллим к концу чата после отправки файлов
      const scrollToBottom = () => {
        console.log('Scrolling to bottom after sending files');

        // Создаем и диспетчеризуем пользовательское событие для скролла
        window.dispatchEvent(new Event('scroll-chat-to-bottom'));

        // Для надежности также используем прямой скролл
        const messagesEnd = document.querySelector('[data-chat-messages-end]');
        if (messagesEnd) {
          messagesEnd.scrollIntoView({ behavior: 'smooth' });
        }

        // Дополнительный способ скролла для надежности
        const scrollArea = document.querySelector('#chat-scroll-area > [data-radix-scroll-area-viewport]');
        if (scrollArea) {
          scrollArea.scrollTop = scrollArea.scrollHeight;
        }
      };

      // Вызываем скролл сразу и с небольшой задержкой для надежности
      scrollToBottom();
      setTimeout(scrollToBottom, 100);
      setTimeout(scrollToBottom, 500);

    } catch (error) {
      console.error("Error sending files:", error);
      toast({
        title: "Error",
        description: "Failed to send files. Please try again.",
        variant: "destructive",
        duration: 3000
      });
      // Reset waiting state on error
      setIsWaitingForAssistantResponse(false);
    } finally {
      setIsLoading(false);
      // Note: We don't reset isWaitingForAssistantResponse here because we're still waiting for the assistant's response
    }
  }, [wsSendFiles, clearProcessedMessages, toast, setIsWaitingForAssistantResponse]);

  // Function to handle form submission
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (inputValue.trim() === "") return;

    const messageToSend = inputValue; // Store current input value

    // Функция для скролла к концу чата
    const scrollToBottom = () => {
      console.log('Scrolling to bottom from handleSubmit');

      // Создаем и диспетчеризуем пользовательское событие для скролла
      window.dispatchEvent(new Event('scroll-chat-to-bottom'));

      // Для надежности также используем прямой скролл
      const messagesEnd = document.querySelector('[data-chat-messages-end]');
      if (messagesEnd) {
        messagesEnd.scrollIntoView({ behavior: 'smooth' });
      }

      // Дополнительный способ скролла для надежности
      const scrollArea = document.querySelector('#chat-scroll-area > [data-radix-scroll-area-viewport]');
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    };

    try {
      // Скроллим перед отправкой сообщения
      scrollToBottom();

      await sendMessage(messageToSend); // Wait for the message to be sent
      setInputValue(""); // Clear input only after successful send

      // Скроллим после отправки сообщения
      scrollToBottom();

      // Добавляем задержку для гарантии скролла после обновления DOM
      setTimeout(scrollToBottom, 100);
      setTimeout(scrollToBottom, 500);
    } catch (error) {
      // Error is likely handled within sendMessage.
      // If input should be cleared even on error, this logic would need adjustment.
      console.error("handleSubmit: Error during sendMessage, input not cleared if sendMessage throws.", error);
    }
  }, [inputValue, sendMessage, setInputValue]); // Added setInputValue to dependencies

  // Function to start a new chat
  const startNewChat = useCallback(async () => {
    // Create a new chunk
    const newChunk = createChunk();

    // Clear processed messages
    clearProcessedMessages();

    try {
      // Ensure we're connected to the new chunk
      if (!isConnected && !isConnecting) {
        console.log(`Connecting to new chunk ${newChunk.id} before sending empty history...`);
        wsConnect(newChunk.id, true); // true означает, что это новый чат
      }

      // Send empty history with is_new_chat flag
      // Use a more reliable approach to ensure history is sent after connection
      const sendEmptyHistory = async () => {
        // If already connected, send immediately
        if (isConnected) {
          console.log(`Sending empty history for new chunk ${newChunk.id} immediately...`);
          wsSendChatHistory([], {
            is_new_chat: true,
            is_existing_chat: true, // Добавляем флаг, чтобы сервер не отправлял приветственное сообщение
            chunk_id: newChunk.id
          });
          return;
        }

        // Otherwise, wait for connection and retry
        console.log(`Waiting for connection to send empty history for new chunk ${newChunk.id}...`);
        let attempts = 0;
        const maxAttempts = 5;
        const checkAndSend = () => {
          attempts++;
          if (isConnected) {
            console.log(`Connected, sending empty history for new chunk ${newChunk.id} after ${attempts} attempts...`);
            wsSendChatHistory([], {
              is_new_chat: true,
              chunk_id: newChunk.id
            });
          } else if (attempts < maxAttempts) {
            console.log(`Not connected yet, retrying (attempt ${attempts}/${maxAttempts})...`);
            setTimeout(checkAndSend, 1000);
          } else {
            console.error(`Failed to send empty history after ${maxAttempts} attempts`);
          }
        };

        // Start checking
        setTimeout(checkAndSend, 500);
      };

      // Start the process of sending empty history
      sendEmptyHistory();

      toast({
        title: "Новый чат создан",
        description: "Вы можете начать новую беседу",
        duration: 3000
      });

      return true;
    } catch (error) {
      console.error("Error starting new chat:", error);
      toast({
        title: "Ошибка создания чата",
        description: "Не удалось создать новый чат",
        variant: "destructive",
        duration: 3000
      });
      return false;
    }
  }, [createChunk, clearProcessedMessages, wsSendChatHistory, toast, isConnected, wsConnect]);

  // Function to select a chunk
  const selectChunk = useCallback(async (chunkId: string) => {
    // Select chunk in storage
    selectStorageChunk(chunkId);

    // Save current chunk ID in localStorage for recovery
    localStorage.setItem('current_chunk_id', chunkId);
    console.log(`Saved current chunk ID: ${chunkId}`);

    // Clear processed messages
    clearProcessedMessages();

    try {
      // Get the chunk
      const chunk = currentChunk;

      if (chunk) {
        // Process messages for sending to server
        const historyMessages = processMessages(chunk.messages, chunkId) as unknown as WebSocketMessage[];

        // Ensure we're connected to the chunk
        if (!isConnected && !isConnecting) {
          console.log(`Connecting to chunk ${chunkId} before sending history...`);
          wsConnect(chunkId, false); // false означает, что это не новый чат
        }

        // Send history with is_existing_chat flag
        // Use a more reliable approach to ensure history is sent after connection
        const sendHistory = async () => {
          // If already connected, send immediately
          if (isConnected) {
            console.log(`Sending history for chunk ${chunkId} immediately...`);
            wsSendChatHistory(historyMessages, {
              chunk_id: chunkId,
              is_existing_chat: true
            });
            return;
          }

          // Otherwise, wait for connection and retry
          console.log(`Waiting for connection to send history for chunk ${chunkId}...`);
          let attempts = 0;
          const maxAttempts = 5;
          const checkAndSend = () => {
            attempts++;
            if (isConnected) {
              console.log(`Connected, sending history for chunk ${chunkId} after ${attempts} attempts...`);
              wsSendChatHistory(historyMessages, {
                chunk_id: chunkId,
                is_existing_chat: true
              });
            } else if (attempts < maxAttempts) {
              console.log(`Not connected yet, retrying (attempt ${attempts}/${maxAttempts})...`);
              setTimeout(checkAndSend, 1000);
            } else {
              console.error(`Failed to send history after ${maxAttempts} attempts`);
            }
          };

          // Start checking
          setTimeout(checkAndSend, 500);
        };

        // Start the process of sending history
        sendHistory();

        toast({
          title: "История загружена",
          description: `Загружен чат с ${historyMessages.length} сообщениями`,
          duration: 3000
        });
      }
    } catch (error) {
      console.error("Error selecting chunk:", error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить историю чата",
        variant: "destructive",
        duration: 3000
      });
    }
  }, [selectStorageChunk, clearProcessedMessages, wsSendChatHistory, processMessages, currentChunk, toast, isConnected, wsConnect]);

  // Listen for load-last-active-chunk event
  useEffect(() => {
    // Handler for loading last active chunk
    const handleLoadLastActiveChunk = (event: Event) => {
      const customEvent = event as CustomEvent;
      const chunkId = customEvent.detail?.chunkId;

      if (chunkId) {
        console.log(`Loading last active chunk: ${chunkId}`);
        // Проверяем, не является ли этот чанк уже текущим
        if (currentChunk?.id !== chunkId) {
          selectChunk(chunkId);
        } else {
          console.log(`Chunk ${chunkId} is already selected`);
          // Если чанк уже выбран, но соединение не установлено, устанавливаем его
          if (!isConnected && !isConnecting) {
            console.log(`Connecting to already selected chunk ${chunkId}...`);
            wsConnect(chunkId, false); // false означает, что это не новый чат
          }
        }
      }
    };

    // Add event listener
    window.addEventListener('load-last-active-chunk', handleLoadLastActiveChunk);

    // Clean up
    return () => {
      window.removeEventListener('load-last-active-chunk', handleLoadLastActiveChunk);
    };
  }, [selectChunk, currentChunk, isConnected, isConnecting, wsConnect]);

  // Auto-load last active chunk on initialization
  useEffect(() => {
    // Проверяем наличие последнего активного чата при инициализации
    if (!hasAttemptedConnection.current) {
      hasAttemptedConnection.current = true;

      const lastActiveChunkId = localStorage.getItem('last_active_chunk');
      if (lastActiveChunkId) {
        console.log(`Found last active chunk ${lastActiveChunkId} on initialization, triggering load...`);
        // Диспетчеризуем событие для загрузки последнего активного чата
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('load-last-active-chunk', {
            detail: { chunkId: lastActiveChunkId }
          }));
        }, 100); // Небольшая задержка для гарантии инициализации всех компонентов
      }
    }
  }, []); // Пустой массив зависимостей означает, что эффект запустится только один раз при монтировании

  // Старый обработчик skeleton-interrupt отключен
  // Теперь скелетон скрывается по новой логике - когда последнее сообщение от assistant
  useEffect(() => {
    console.log('[useChat] New skeleton logic active - skeleton hides when last message is from assistant');
  }, []);

  // Function to connect to WebSocket
  const connect = useCallback(async () => {
    if (currentChunk?.id && !isConnected && !isConnecting) {
      await wsConnect(currentChunk.id, false); // false означает, что это не новый чат
    } else if (isConnected || isConnecting) {
      console.log("Already connected or connecting to WebSocket");
    } else {
      console.log("Not connecting to WebSocket: no current chunk");
      toast({
        title: "Нет активного чата",
        description: "Создайте новый чат или выберите существующий",
        duration: 3000
      });
    }
  }, [wsConnect, currentChunk, toast, isConnected, isConnecting]);

  // Override cancelCurrentTask to reset isWaitingForAssistantResponse
  const cancelCurrentTaskWithReset = useCallback(() => {
    cancelCurrentTask();
    // Очищаем таймер скрытия скелетона
    clearTimeout((window as any).hideSkeletonTimer);
    // Сразу скрываем скелетон
    setIsWaitingForAssistantResponse(false);
  }, [cancelCurrentTask, setIsWaitingForAssistantResponse]);

  return {
    // State
    messages,
    inputValue,
    setInputValue,
    isLoading,
    isConnected,
    isConnecting,
    isWaitingForResponse,
    isWaitingForAssistantResponse, // Expose the new state
    isSkeletonHiding, // Expose skeleton hiding state
    connectionError: null,
    availableDates,
    currentDate,
    availableChunks,
    currentChunk,

    // Message operations
    sendMessage,
    sendFiles,
    sendSystemMessage,
    getCurrentChunkMessages,
    setMessages: _setMessages,

    // Connection operations
    connect,
    disconnect: wsDisconnect,
    cancelCurrentTask: cancelCurrentTaskWithReset,

    // Message rendering operations
    markMessageAsRendering,
    markMessageAsRendered,
    isMessageRendering,
    shouldHideSkeletonBasedOnHistory,

    // UI operations
    handleSubmit,

    // Date operations
    changeDate,
    formatDate,

    // Chunk operations
    createChunk,
    startNewChat,
    selectChunk,
    deleteCurrentChunk,
    deleteChunk: deleteCurrentChunk, // Для совместимости с интерфейсом

    // Deletion operations
    deleteMessage,
    deleteAllChunksForCurrentDate,
    deleteAllChunks: deleteAllChunksForCurrentDate, // Для совместимости с интерфейсом
    deleteAllHistory,

    // System operations
    createSystemMessage: _createSystemMessage
  };
};
