"use client";

import { useCallback } from 'react';
import { DateSelectorProps } from './types';

export const useDateSelectorLogic = (props: DateSelectorProps) => {
  const { availableDates, currentDate, onDateChange, formatDate } = props;

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

  // Функция для перехода к предыдущей дате
  const goToPreviousDate = useCallback(() => {
    if (!currentDate || availableDates.length === 0) return;
    
    const currentIndex = availableDates.indexOf(currentDate);
    if (currentIndex > 0) {
      onDateChange(availableDates[currentIndex - 1]);
    }
  }, [availableDates, currentDate, onDateChange]);

  // Функция для перехода к следующей дате
  const goToNextDate = useCallback(() => {
    if (!currentDate || availableDates.length === 0) return;
    
    const currentIndex = availableDates.indexOf(currentDate);
    if (currentIndex < availableDates.length - 1) {
      onDateChange(availableDates[currentIndex + 1]);
    }
  }, [availableDates, currentDate, onDateChange]);

  // Проверяем, можно ли перейти к предыдущей дате
  const canGoPrevious = useCallback(() => {
    if (!currentDate || availableDates.length === 0) return false;
    
    const currentIndex = availableDates.indexOf(currentDate);
    return currentIndex > 0;
  }, [availableDates, currentDate]);

  // Проверяем, можно ли перейти к следующей дате
  const canGoNext = useCallback(() => {
    if (!currentDate || availableDates.length === 0) return false;
    
    const currentIndex = availableDates.indexOf(currentDate);
    return currentIndex < availableDates.length - 1;
  }, [availableDates, currentDate]);

  return {
    formatDateString,
    goToPreviousDate,
    goToNextDate,
    canGoPrevious: canGoPrevious(),
    canGoNext: canGoNext()
  };
};
