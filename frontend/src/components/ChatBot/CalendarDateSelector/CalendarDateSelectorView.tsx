"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import unifiedStyles from '@/components/ChatBot/styles/chatbot-unified.module.css';
import { ru } from 'date-fns/locale';

interface CalendarDateSelectorViewProps {
  availableDates: string[];
  currentDate: string | undefined;
  onDateChange: (date: string) => void;
  formatDateString: (date: string | undefined) => string;
  datesWithHistory: Record<string, boolean>;
  onDateSelect: (date: string) => void;
  selectedDate: string | undefined;
}

export const CalendarDateSelectorView: React.FC<CalendarDateSelectorViewProps> = ({
  availableDates,
  currentDate,
  onDateChange,
  formatDateString,
  datesWithHistory,
  onDateSelect,
  selectedDate
}) => {
  const [open, setOpen] = useState(false);





  // Функция для проверки, есть ли история для даты
  const hasHistory = (date: Date): boolean => {
    // Форматируем дату в формате YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    // Проверяем, есть ли история для этой даты
    console.log(`Checking history for date: ${dateString}, result: ${!!datesWithHistory[dateString]}`);
    return !!datesWithHistory[dateString];
  };

  // Функция для определения, должна ли дата быть отключена
  const isDateDisabled = (date: Date): boolean => {
    return !hasHistory(date);
  };

  // Функция для обработки выбора даты в календаре
  const handleSelect = (date: Date | undefined) => {
    if (date) {
      // Исправляем смещение даты из-за часового пояса
      // Форматируем дату в формате YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      onDateSelect(dateString);
      setOpen(false);
    }
  };

  // Преобразуем текущую дату в объект Date для календаря
  // Используем конструктор с годом, месяцем и днем, чтобы избежать проблем с часовыми поясами
  const currentDateObj = currentDate ? (() => {
    const [year, month, day] = currentDate.split('-').map(Number);
    return new Date(year, month - 1, day);
  })() : undefined;

  // Убираем отладочные логи для производительности

  return (
    <div className={styles.calendarWrapper}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !currentDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {currentDate ? formatDateString(currentDate) : 'Выберите дату'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={currentDateObj}
            onSelect={handleSelect}
            modifiers={{
              hasHistory: hasHistory,
            }}
            modifiersClassNames={{
              hasHistory: styles.hasHistory,
            }}
            disabled={isDateDisabled}
            initialFocus
            className="rounded-md border"
            locale={ru}
            weekStartsOn={1}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
