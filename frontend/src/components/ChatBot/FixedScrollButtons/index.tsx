"use client";

import React, { useEffect, useState } from 'react';
import unifiedStyles from '@/components/ChatBot/styles/chatbot-unified.module.css';

const FixedScrollButtons: React.FC = () => {
  const [showButtons, setShowButtons] = useState(true);

  // Функция для скролла вверх
  const scrollToTop = () => {
    console.log('Scrolling to top');
    const chatArea = document.querySelector('#chat-scroll-area > [data-radix-scroll-area-viewport]');
    if (chatArea) {
      console.log('Found chat area, scrolling to top');
      chatArea.scrollTop = 0;
    } else {
      console.log('Chat area not found');
    }
  };

  // Функция для скролла вниз
  const scrollToBottom = () => {
    console.log('Scrolling to bottom from FixedScrollButtons');

    // Создаем и диспетчеризуем пользовательское событие для скролла
    window.dispatchEvent(new Event('scroll-chat-to-bottom'));

    // Для надежности также используем прямой скролл
    const messagesEnd = document.querySelector('[data-chat-messages-end]');
    if (messagesEnd) {
      console.log('Found messages end, scrolling into view');
      messagesEnd.scrollIntoView({ behavior: 'smooth' });
    }

    // Альтернативный способ скролла вниз
    const chatArea = document.querySelector('#chat-scroll-area > [data-radix-scroll-area-viewport]');
    if (chatArea) {
      console.log('Found chat area, scrolling to bottom');
      chatArea.scrollTop = chatArea.scrollHeight;
    }

    // Добавляем задержку для гарантии скролла после обновления DOM
    setTimeout(() => {
      if (messagesEnd) {
        messagesEnd.scrollIntoView({ behavior: 'smooth' });
      }
      if (chatArea) {
        chatArea.scrollTop = chatArea.scrollHeight;
      }
    }, 100);
  };

  // Проверяем наличие элементов чата при монтировании
  useEffect(() => {
    const checkElements = () => {
      const chatArea = document.querySelector('#chat-scroll-area');
      console.log('Chat area exists:', !!chatArea);

      const viewport = document.querySelector('#chat-scroll-area > [data-radix-scroll-area-viewport]');
      console.log('Viewport exists:', !!viewport);

      const messagesEnd = document.querySelector('[data-chat-messages-end]');
      console.log('Messages end exists:', !!messagesEnd);
    };

    // Проверяем сразу и через секунду (для уверенности)
    checkElements();
    setTimeout(checkElements, 1000);
  }, []);

  return (
    <div className={unifiedStyles.chatMessage}>
      <button
        className={unifiedStyles.scrollButton}
        onClick={scrollToTop}
        title="Scroll to top"
      >
        ↑
      </button>
      <button
        className={unifiedStyles.scrollButton}
        onClick={scrollToBottom}
        title="Scroll to bottom"
      >
        ↓
      </button>
    </div>
  );
};

export default FixedScrollButtons;
