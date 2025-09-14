"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronsUp, ChevronsDown } from "lucide-react";
import styles from './styles.module.css';

const ChatInputScrollButtons: React.FC = () => {
  // Функция для скролла вверх
  const scrollToTop = () => {
    console.log('Scrolling to top');
    
    // Метод 1: Прямой доступ к элементу viewport
    const chatArea = document.querySelector('#chat-scroll-area > [data-radix-scroll-area-viewport]');
    if (chatArea) {
      console.log('Found chat area, scrolling to top');
      chatArea.scrollTop = 0;
    }
    
    // Метод 2: Поиск через все элементы с атрибутом data-radix-scroll-area-viewport
    const viewports = document.querySelectorAll('[data-radix-scroll-area-viewport]');
    viewports.forEach((viewport) => {
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
      console.log('Found messages end, scrolling into view');
      messagesEnd.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={styles.container}>
      <Button
        type="button"
        onClick={scrollToTop}
        className={styles.scrollButton}
        aria-label="Scroll to top"
      >
        <ChevronsUp className={styles.icon} />
      </Button>
      
      <Button
        type="button"
        onClick={scrollToBottom}
        className={styles.scrollButton}
        aria-label="Scroll to bottom"
      >
        <ChevronsDown className={styles.icon} />
      </Button>
    </div>
  );
};

export default ChatInputScrollButtons;
