"use client";

import React from 'react';
import { DateSelectorView } from './DateSelectorView';
import { useDateSelectorLogic } from './DateSelectorLogic';
import { DateSelectorProps } from './types';

export const DateSelector: React.FC<DateSelectorProps> = (props) => {
  const {
    formatDateString,
    goToPreviousDate,
    goToNextDate,
    canGoPrevious,
    canGoNext
  } = useDateSelectorLogic(props);

  return (
    <DateSelectorView
      availableDates={props.availableDates}
      currentDate={props.currentDate}
      onDateChange={props.onDateChange}
      formatDateString={formatDateString}
      goToPreviousDate={goToPreviousDate}
      goToNextDate={goToNextDate}
      canGoPrevious={canGoPrevious}
      canGoNext={canGoNext}
    />
  );
};

export * from './types';
