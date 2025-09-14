"use client";

import React, { useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import SubmitButton from "./SubmitButton";
import ChatInputScrollButtons from "./ChatInputScrollButtons";
import { FileUpload } from "./FileUpload";

interface ChatInputProps {
  value: string;
  onChange: (value: React.ChangeEvent<HTMLInputElement> | string) => void;
  onSubmit: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  isLoading?: boolean;
  onCancel?: () => void;
  onFilesSelected?: (files: File[], message?: string) => Promise<void>;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSubmit,
  onKeyDown,
  disabled = false,
  isLoading = false,
  onCancel,
  onFilesSelected
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Функция для скролла к концу чата
  const scrollToBottom = () => {
    console.log('Scrolling to bottom from ChatInput');

    // Метод 1: Прямой доступ к элементу viewport
    const chatArea = document.querySelector('#chat-scroll-area > [data-radix-scroll-area-viewport]');
    if (chatArea) {
      console.log('Found chat area, scrolling to bottom');
      chatArea.scrollTop = chatArea.scrollHeight;
    } else {
      console.log('Chat area not found (method 1)');
    }

    // Метод 2: Поиск через все элементы с атрибутом data-radix-scroll-area-viewport
    const viewports = document.querySelectorAll('[data-radix-scroll-area-viewport]');
    console.log('Found viewports:', viewports.length);
    viewports.forEach((viewport, index) => {
      console.log(`Scrolling viewport ${index} to bottom`);
      const element = viewport as HTMLElement;
      element.scrollTop = element.scrollHeight;
    });

    // Метод 3: Скролл к последнему сообщению
    const messagesEnd = document.querySelector('[data-chat-messages-end]');
    if (messagesEnd) {
      console.log('Found messages end, scrolling into view');
      messagesEnd.scrollIntoView({ behavior: 'smooth' });
    } else {
      console.log('Messages end not found');
    }

    // Добавляем задержку для гарантии скролла после обновления DOM
    setTimeout(() => {
      // Повторяем все методы скролла
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
  };

  // Автоматический скролл при фокусе на поле ввода
  useEffect(() => {
    const handleFocus = () => {
      scrollToBottom();
    };

    const inputElement = inputRef.current;
    if (inputElement) {
      inputElement.addEventListener('focus', handleFocus);
      return () => {
        inputElement.removeEventListener('focus', handleFocus);
      };
    }
  }, []);

  // Обработчик изменения текста с автоматическим скроллом
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e);
    // Вызываем скролл с небольшой задержкой, чтобы DOM успел обновиться
    setTimeout(() => {
      scrollToBottom();
      // Прямой скролл для надежности
      const scrollArea = document.querySelector('#chat-scroll-area > [data-radix-scroll-area-viewport]');
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    }, 10);
  };
  return (
    <div className="flex items-center gap-2 w-full relative">
      {onFilesSelected && (
        <FileUpload
          onFilesSelected={onFilesSelected}
          disabled={disabled || isLoading}
        />
      )}
      <div className="flex-1 flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            placeholder="Type your message..."
            value={value}
            onChange={handleChange}
            onKeyDown={onKeyDown}
            disabled={disabled || isLoading}
            className="w-full"
            onFocus={scrollToBottom}
          />
        </div>
        <SubmitButton
          onClick={onSubmit}
          disabled={disabled || isLoading || value.trim() === ""}
          isLoading={isLoading}
        />
      </div>
      {isLoading && onCancel && (
        <Button
          onClick={onCancel}
          variant="outline"
          className="rounded-full p-2 h-10 w-10 bg-background hover:bg-background"
          title="Cancel current response"
        >
          <X className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};
