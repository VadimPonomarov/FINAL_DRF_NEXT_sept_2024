"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import unifiedStyles from '@/components/ChatBot/styles/chatbot-unified.module.css';

interface DateSelectorViewProps {
  availableDates: string[];
  currentDate: string | undefined;
  onDateChange: (date: string) => void;
  formatDateString: (date: string | undefined) => string;
  goToPreviousDate: () => void;
  goToNextDate: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

export const DateSelectorView: React.FC<DateSelectorViewProps> = ({
  availableDates,
  currentDate,
  onDateChange,
  formatDateString,
  goToPreviousDate,
  goToNextDate,
  canGoPrevious,
  canGoNext
}) => {
  if (availableDates.length <= 1) return null;

  return (
    <div className={unifiedStyles.chatMessage}>
      <div className={unifiedStyles.dateNavigation}>
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPreviousDate}
          disabled={!canGoPrevious}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <Select
          value={currentDate}
          onValueChange={onDateChange}
        >
          <SelectTrigger className={unifiedStyles.dateSelect}>
            <SelectValue placeholder="Select date">
              {formatDateString(currentDate)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {availableDates.map((date) => (
              <SelectItem key={date} value={date}>
                {formatDateString(date)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={goToNextDate}
          disabled={!canGoNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
