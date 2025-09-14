"use client";

import React, { useState, useEffect } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import styles from './styles.module.css';

interface ThinkingSkeletonProps {
  timeout?: number; // Время в миллисекундах, после которого будет показан текст
  showCancelButton?: boolean;
  onCancel?: () => void;
}

export const ThinkingSkeleton: React.FC<ThinkingSkeletonProps> = ({
  timeout = 3000, // По умолчанию 3 секунды
  showCancelButton = true,
  onCancel
}) => {
  const [showThinkingText, setShowThinkingText] = useState(false);

  useEffect(() => {
    // Устанавливаем таймер для отображения текста
    const timer = setTimeout(() => {
      setShowThinkingText(true);
    }, timeout);

    // Очищаем таймер при размонтировании компонента
    return () => clearTimeout(timer);
  }, [timeout]);

  return (
    <div className={styles.container}>
      <div className={styles.skeletonWrapper}>
        <Avatar className="bg-black">
          <AvatarFallback className="bg-black">
            <Bot className="h-4 w-4 text-white" />
          </AvatarFallback>
        </Avatar>

        <div className={styles.contentWrapper}>
          <Skeleton className="h-4 w-24 mb-2" />
          <div className={styles.thinkingContent}>
            <Skeleton className="h-16 w-[80%] rounded-lg" />

            {showThinkingText && (
              <div className={styles.thinkingText}>
                Агент обрабатывает ваш запрос...
              </div>
            )}
          </div>
        </div>

        {showCancelButton && onCancel && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className={styles.cancelButton}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
