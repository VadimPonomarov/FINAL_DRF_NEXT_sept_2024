"use client";

import { useState, useEffect } from 'react';

interface UseAgentThinkingReturn {
  isThinking: boolean;
  thinkingStartTime: Date | null;
  thinkingDuration: number; // в миллисекундах
}

/**
 * Хук для отслеживания состояния "думающего" агента
 */
export const useAgentThinking = (): UseAgentThinkingReturn => {
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingStartTime, setThinkingStartTime] = useState<Date | null>(null);
  const [thinkingDuration, setThinkingDuration] = useState(0);

  useEffect(() => {
    // Обработчик начала "думания" агента
    const handleThinkingStarted = (event: CustomEvent) => {
      const startTime = event.detail?.timestamp 
        ? new Date(event.detail.timestamp) 
        : new Date();
      
      setIsThinking(true);
      setThinkingStartTime(startTime);
      setThinkingDuration(0);
    };

    // Обработчик окончания "думания" агента
    const handleThinkingEnded = (event: CustomEvent) => {
      const endTime = event.detail?.timestamp 
        ? new Date(event.detail.timestamp) 
        : new Date();
      
      if (thinkingStartTime) {
        const duration = endTime.getTime() - thinkingStartTime.getTime();
        setThinkingDuration(duration);
      }
      
      setIsThinking(false);
    };

    // Добавляем слушатели событий
    window.addEventListener('agent-thinking-started', handleThinkingStarted as EventListener);
    window.addEventListener('agent-thinking-ended', handleThinkingEnded as EventListener);

    // Очищаем слушатели при размонтировании
    return () => {
      window.removeEventListener('agent-thinking-started', handleThinkingStarted as EventListener);
      window.removeEventListener('agent-thinking-ended', handleThinkingEnded as EventListener);
    };
  }, [thinkingStartTime]);

  return {
    isThinking,
    thinkingStartTime,
    thinkingDuration
  };
};
