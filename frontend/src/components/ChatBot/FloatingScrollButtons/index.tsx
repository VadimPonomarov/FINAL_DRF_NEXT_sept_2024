"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronsUp, ChevronsDown } from "lucide-react";
import unifiedStyles from '@/components/ChatBot/styles/chatbot-unified.module.css';

const FloatingScrollButtons: React.FC = () => {
  // Функция для скролла вверх
  const scrollToTop = () => {
    const scrollArea = document.querySelector('#chat-scroll-area > [data-radix-scroll-area-viewport]') as HTMLElement;
    if (scrollArea) {
      scrollArea.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  // Функция для скролла вниз
  const scrollToBottom = () => {
    const messagesEnd = document.querySelector('[data-chat-messages-end]') as HTMLElement;
    if (messagesEnd) {
      messagesEnd.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={styles.floatingButtonsContainer}>
      {/* Кнопка скролла вверх */}
      <Button
        variant="secondary"
        size="icon"
        className={styles.floatingButton}
        onClick={scrollToTop}
        aria-label="Scroll to top"
      >
        <ChevronsUp className="h-6 w-6" />
      </Button>
      
      {/* Кнопка скролла вниз */}
      <Button
        variant="secondary"
        size="icon"
        className={styles.floatingButton}
        onClick={scrollToBottom}
        aria-label="Scroll to bottom"
      >
        <ChevronsDown className="h-6 w-6" />
      </Button>
    </div>
  );
};

export default FloatingScrollButtons;
