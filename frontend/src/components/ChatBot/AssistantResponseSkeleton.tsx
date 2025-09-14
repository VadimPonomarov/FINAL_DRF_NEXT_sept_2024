import React, { useEffect, useState } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import { AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface AssistantResponseSkeletonProps {
  avatarUrl?: string;
  showCancelButton?: boolean;
  onCancel?: () => void;
  timeout?: number; // Таймаут в миллисекундах (по умолчанию 40 секунд)
  isHiding?: boolean; // Флаг для плавного исчезновения
}

export const AssistantResponseSkeleton: React.FC<AssistantResponseSkeletonProps> = ({
  avatarUrl = "/bot-avatar.png",
  showCancelButton = true,
  onCancel,
  isHiding = false
}) => {
  // Состояние для анимации пульсации
  const [pulseIntensity, setPulseIntensity] = useState(1);
  const [opacity, setOpacity] = useState(1);

  // Эффект для анимации пульсации
  useEffect(() => {
    if (isHiding) {
      // Если скелетон скрывается, останавливаем пульсацию и плавно уменьшаем прозрачность
      setOpacity(0);
      return;
    }

    // Создаем интервал для изменения интенсивности пульсации
    const interval = setInterval(() => {
      setPulseIntensity(prev => (prev === 1 ? 0.7 : 1));
    }, 1000); // Меняем интенсивность каждую секунду

    // Очищаем интервал при размонтировании компонента
    return () => clearInterval(interval);
  }, [isHiding]);

  return (
    <div
      className={`flex items-start gap-3 relative transition-all duration-500 ease-in-out ${!isHiding ? 'animate-pulse' : ''}`}
      aria-label="Assistant is typing..."
      style={{
        opacity: isHiding ? 0 : pulseIntensity,
        transform: isHiding ? 'translateY(-10px)' : 'translateY(0)',
        transition: isHiding
          ? 'opacity 0.5s ease-out, transform 0.5s ease-out'
          : 'opacity 1s ease-in-out'
      }}
    >
      <Avatar className="h-10 w-10 rounded-full">
        {avatarUrl ? (
          <AvatarImage src={avatarUrl} alt="Assistant" />
        ) : (
          <AvatarFallback>AI</AvatarFallback>
        )}
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">Assistant</span>
          <span className="text-xs text-muted-foreground">сейчас</span>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-[90%]" />
          <Skeleton className="h-4 w-[75%]" />
          <Skeleton className="h-4 w-[80%]" />
          <Skeleton className="h-4 w-[60%]" />
        </div>
      </div>

      {/* Кнопка отмены */}
      {showCancelButton && onCancel && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="absolute right-0 top-0 h-8 w-8 opacity-70 hover:opacity-100 transition-opacity"
          title="Прервать запрос"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
