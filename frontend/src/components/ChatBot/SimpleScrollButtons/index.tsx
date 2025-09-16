"use client";

import React from 'react';
import unifiedStyles from '@/components/ChatBot/styles/chatbot-unified.module.css';

const SimpleScrollButtons: React.FC = () => {
  // Функция для скролла вверх
  const scrollToTop = () => {
    console.log('Scrolling to top');

    // Метод 1: Прямой доступ к элементу viewport
    const chatArea = document.querySelector('#chat-scroll-area > [data-radix-scroll-area-viewport]');
    if (chatArea) {
      console.log('Found chat area, scrolling to top');
      chatArea.scrollTop = 0;
    } else {
      console.log('Chat area not found (method 1)');
    }

    // Метод 2: Поиск через все элементы с атрибутом data-radix-scroll-area-viewport
    const viewports = document.querySelectorAll('[data-radix-scroll-area-viewport]');
    console.log('Found viewports:', viewports.length);
    viewports.forEach((viewport, index) => {
      console.log(`Scrolling viewport ${index} to top`);
      (viewport as HTMLElement).scrollTop = 0;
    });
  };

  // Функция для скролла вниз
  const scrollToBottom = () => {
    console.log('Scrolling to bottom');

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
  };

  return (
    <div className={unifiedStyles.chatMessage}>
      <button
        className={unifiedStyles.scrollButton}
        onClick={scrollToTop}
      >
        ↑
      </button>
      <button
        className={unifiedStyles.scrollButton}
        onClick={scrollToBottom}
      >
        ↓
      </button>
    </div>
  );
};

export default SimpleScrollButtons;
