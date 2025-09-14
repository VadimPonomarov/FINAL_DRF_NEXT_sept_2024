"use client";

import { useCallback, useMemo, useState } from 'react';
import { DateSelectorProps } from '../DateSelector/types';

export const useCalendarDateSelectorLogic = (props: DateSelectorProps) => {
  const { availableDates, currentDate, onDateChange, formatDate } = props;
  const [selectedDate, setSelectedDate] = useState<string | undefined>(currentDate);

  // Функция для форматирования даты
  const formatDateString = useCallback((date: string | undefined): string => {
    if (formatDate) {
      return formatDate(date);
    }
    
    if (!date) return 'Unknown date';
    
    try {
      // Преобразуем строку в объект Date
      const dateObj = new Date(date);
      
      // Форматируем дату в локальный формат
      return dateObj.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return date;
    }
  }, [formatDate]);

  // Создаем объект с датами, для которых есть история
  const datesWithHistory = useMemo(() => {
    const result: Record<string, boolean> = {};
    
    availableDates.forEach(date => {
      result[date] = true;
    });
    
    return result;
  }, [availableDates]);

  // Обработчик выбора даты
  const handleDateSelect = useCallback((date: string) => {
    setSelectedDate(date);
    onDateChange(date);
  }, [onDateChange]);

  return {
    formatDateString,
    datesWithHistory,
    handleDateSelect,
    selectedDate
  };
};
