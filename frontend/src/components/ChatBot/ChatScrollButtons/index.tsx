"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, ChevronsUp, ChevronsDown } from "lucide-react";
import unifiedStyles from '@/components/ChatBot/styles/chatbot-unified.module.css';

const ChatScrollButtons: React.FC = () => {
  const [showScrollUp, setShowScrollUp] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [scrollArea, setScrollArea] = useState<HTMLElement | null>(null);
  const [messagesEnd, setMessagesEnd] = useState<HTMLElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0); // Прогресс скролла (0-100)
  const threshold = 100; // Порог прокрутки для показа кнопок (в пикселях)

  // Функция для проверки позиции скролла и обновления состояния кнопок
  const checkScrollPosition = useCallback(() => {
    if (!scrollArea) return;

    // Рассчитываем прогресс скролла (0-100%)
    const totalScrollHeight = scrollArea.scrollHeight - scrollArea.clientHeight;
    const currentProgress = totalScrollHeight > 0
      ? Math.round((scrollArea.scrollTop / totalScrollHeight) * 100)
      : 0;
    setScrollProgress(currentProgress);

    // Показываем кнопку "вверх", если прокрутили вниз больше порогового значения
    setShowScrollUp(scrollArea.scrollTop > threshold);

    // Показываем кнопку "вниз", если не достигли конца прокрутки
    const isAtBottom =
      scrollArea.scrollHeight - scrollArea.scrollTop - scrollArea.clientHeight < threshold;
    setShowScrollDown(!isAtBottom);
  }, [scrollArea, threshold]);

  // Инициализация DOM-элементов
  useEffect(() => {
    // Функция для поиска элементов в DOM
    const findElements = () => {
      const scrollAreaElement = document.querySelector('#chat-scroll-area > [data-radix-scroll-area-viewport]') as HTMLElement;
      const messagesEndElement = document.querySelector('[data-chat-messages-end]') as HTMLElement;

      if (scrollAreaElement) {
        setScrollArea(scrollAreaElement);
      }

      if (messagesEndElement) {
        setMessagesEnd(messagesEndElement);
      }

      // Если элементы не найдены, пробуем еще раз через некоторое время
      if (!scrollAreaElement || !messagesEndElement) {
        setTimeout(findElements, 500);
      }
    };

    // Запускаем поиск элементов
    findElements();

    // Также запускаем поиск при изменении размера окна
    const handleResize = () => {
      findElements();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Добавляем обработчики событий после получения DOM-элементов
  useEffect(() => {
    if (!scrollArea) return;

    // Инициализация состояния кнопок
    checkScrollPosition();

    // Добавляем обработчик события скролла
    scrollArea.addEventListener('scroll', checkScrollPosition);

    // Добавляем обработчик события изменения размера окна
    window.addEventListener('resize', checkScrollPosition);

    // Добавляем обработчик пользовательского события скролла
    window.addEventListener('scroll-chat-to-bottom', checkScrollPosition);

    // Удаляем обработчики при размонтировании
    return () => {
      scrollArea.removeEventListener('scroll', checkScrollPosition);
      window.removeEventListener('resize', checkScrollPosition);
      window.removeEventListener('scroll-chat-to-bottom', checkScrollPosition);
    };
  }, [scrollArea, checkScrollPosition]);

  // Функция для скролла вверх
  const scrollToTop = () => {
    if (scrollArea) {
      scrollArea.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  // Функция для скролла вниз
  const scrollToBottom = () => {
    if (messagesEnd) {
      messagesEnd.scrollIntoView({ behavior: 'smooth' });

      // Обновляем состояние кнопок после скролла
      setTimeout(checkScrollPosition, 300);
    }
  };

  // Всегда показываем кнопки скролла
  return (
    <div className={unifiedStyles.scrollButtons}>
      {/* Кнопка скролла вверх */}
      <Button
        variant="secondary"
        size="icon"
        className={unifiedStyles.scrollButton}
        onClick={scrollToTop}
        aria-label="Scroll to top"
      >
        <ChevronsUp className="h-6 w-6" />
      </Button>

      {/* Кнопка скролла вниз */}
      <Button
        variant="secondary"
        size="icon"
        className={unifiedStyles.scrollButton}
        onClick={scrollToBottom}
        aria-label="Scroll to bottom"
      >
        <ChevronsDown className="h-6 w-6" />
      </Button>
    </div>
  );
};

export default ChatScrollButtons;
