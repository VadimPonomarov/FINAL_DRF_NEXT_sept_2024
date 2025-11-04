"use client";

import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AlertWithTimeoutProps {
  title?: string;
  description: string;
  variant?: "default" | "destructive";
  duration?: number; // в миллисекундах
  className?: string;
  onClose?: () => void;
}

export const AlertWithTimeout: React.FC<AlertWithTimeoutProps> = ({
  title,
  description,
  variant = "default",
  duration = 5000,
  className,
  onClose
}) => {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Запускаем таймер для прогресс-бара
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - (100 / (duration / 100));
        return newProgress < 0 ? 0 : newProgress;
      });
    }, 100);

    setIntervalId(interval);

    // Устанавливаем таймер для скрытия алерта
    const timeout = setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
    }, duration);

    // Очищаем таймеры при размонтировании
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [duration, onClose]);

  const handleClose = () => {
    setVisible(false);
    if (intervalId) clearInterval(intervalId);
    if (onClose) onClose();
  };

  if (!visible) return null;

  return (
    <Alert 
      variant={variant} 
      className={cn(
        "relative overflow-hidden transition-all duration-300", 
        className
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 rounded-full opacity-70 hover:opacity-100"
        onClick={handleClose}
      >
        <X className="h-4 w-4" />
      </Button>
      
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{description}</AlertDescription>
      
      {/* Прогресс-бар */}
      <div className="absolute bottom-0 left-0 h-1 bg-primary/20 w-full">
        <div 
          className={cn(
            "h-full transition-all duration-100",
            variant === "destructive" ? "bg-destructive" : "bg-primary"
          )} 
          style={{ width: `${progress}%` }}
        />
      </div>
    </Alert>
  );
};

export default AlertWithTimeout;
